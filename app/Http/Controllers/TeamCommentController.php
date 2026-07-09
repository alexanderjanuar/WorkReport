<?php

namespace App\Http\Controllers;

use App\Enums\Platform;
use App\Models\Comment;
use App\Models\Media;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class TeamCommentController extends Controller
{
    /**
     * Oversight table of every member's distributed comments (admin / ketua).
     */
    public function index(Request $request): Response
    {
        $search = trim((string) $request->input('search', ''));
        $platform = $request->input('platform');
        $date = $request->input('date');

        $comments = Comment::query()
            ->with(['user:id,name', 'target:id,start_date,end_date', 'media:id,name,logo_path'])
            ->when($search !== '', fn ($query) => $query->whereHas(
                'user',
                fn ($q) => $q->where('name', 'like', "%{$search}%"),
            ))
            ->when(
                in_array($platform, Platform::values(), true),
                fn ($query) => $query->where('platform', $platform),
            )
            ->when($date, fn ($query) => $query->whereDate('commented_on', $date))
            ->latest('commented_on')
            ->latest('id')
            ->paginate(25)
            ->withQueryString()
            ->through(fn (Comment $comment) => [
                'id' => $comment->id,
                'commented_on' => $comment->commented_on->translatedFormat('d M Y'),
                'date_label' => $comment->commented_on->translatedFormat('l, d M Y'),
                'user' => $comment->user?->name,
                'media' => $comment->media?->name,
                'media_logo' => $comment->media?->logo_path
                    ? Storage::disk('public')->url($comment->media->logo_path)
                    : null,
                'platform_label' => $comment->platform->label(),
                'quantity' => $comment->quantity,
                'replies' => $comment->replies,
                'likes' => $comment->likes,
                'boosters' => $comment->boosters,
                'post_url' => $comment->post_url,
                'proof_url' => $comment->proof_path
                    ? Storage::disk('public')->url($comment->proof_path)
                    : $comment->proof_url,
                'target_range' => $comment->target
                    ? $comment->target->start_date->translatedFormat('d M').' – '.$comment->target->end_date->translatedFormat('d M Y')
                    : null,
            ]);

        return Inertia::render('comments/team', [
            'comments' => $comments,
            'platformOptions' => Platform::options(),
            'filters' => [
                'search' => $search,
                'platform' => in_array($platform, Platform::values(), true) ? $platform : '',
                'date' => $date ? Carbon::parse($date)->toDateString() : '',
            ],
            'today' => now()->toDateString(),
        ]);
    }

    /**
     * Build the plain-text daily comment report for a date, grouped by media
     * account (a WhatsApp-style "Riport" list). Returned as JSON for the
     * export modal to display / copy / download.
     */
    public function export(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date' => ['required', 'date'],
            'scrape' => ['nullable', 'boolean'],
        ]);

        $date = Carbon::parse($validated['date']);

        $comments = Comment::query()
            ->with('user:id,name')
            ->whereDate('commented_on', $date->toDateString())
            ->orderBy('id')
            ->get()
            ->groupBy('media_id');

        // only list media accounts that actually have comments on this date
        $media = Media::orderBy('name')->get(['id', 'name'])
            ->filter(fn (Media $account) => $comments->get($account->id)?->isNotEmpty() ?? false)
            ->values();

        // Optionally scrape (via Apify) the Instagram posts that were commented
        // this date, keyed by shortcode, to enrich each line with post details.
        $posts = [];
        if ($request->boolean('scrape')) {
            $urls = $comments->flatten()
                ->pluck('post_url')
                ->filter(fn ($url) => $url && Str::contains(Str::lower($url), 'instagram.com'))
                ->unique()
                ->values()
                ->all();
            $posts = $this->scrapePosts($urls);
        }

        $lines = [];
        $lines[] = 'Riport '.$date->day.' '.mb_strtolower($date->translatedFormat('F')).', Jam '.now()->format('H.i');
        $lines[] = 'Cek '.$media->count().' akun media ;';
        $lines[] = '';

        $renderItems = function ($items) use (&$lines, $posts) {
            $n = 1;
            foreach ($items as $comment) {
                $lines[] = $n.'. '.$comment->quantity.' komen';
                $lines[] = $comment->post_url.' ✅ '.$comment->actionSummary().' [ '.($comment->user?->name ?? '-').' ]';

                $code = $this->postShortcode($comment->post_url);
                $post = $code ? ($posts[$code] ?? null) : null;
                if ($post) {
                    $meta = [];
                    if (! empty($post['timestamp'])) {
                        $meta[] = Carbon::parse($post['timestamp'])->translatedFormat('d M Y');
                    }
                    if (isset($post['likesCount'])) {
                        $meta[] = number_format((int) $post['likesCount'], 0, ',', '.').' like';
                    }
                    if (isset($post['commentsCount'])) {
                        $meta[] = number_format((int) $post['commentsCount'], 0, ',', '.').' komentar';
                    }
                    if ($meta) {
                        $lines[] = '   ↳ Post: '.implode(' · ', $meta);
                    }
                    $caption = trim((string) preg_replace('/\s+/', ' ', (string) ($post['caption'] ?? '')));
                    if ($caption !== '') {
                        $lines[] = '   ↳ "'.Str::limit($caption, 70).'"';
                    }
                }

                $lines[] = '';
                $n++;
            }
        };

        foreach ($media as $account) {
            $lines[] = '- '.$account->name.' :';
            $lines[] = '';
            $renderItems($comments->get($account->id));
        }

        // Comments not tied to any media account.
        if ($comments->has(null) && $comments->get(null)->isNotEmpty()) {
            $lines[] = '- Link media lain :';
            $lines[] = '';
            $renderItems($comments->get(null));
        }

        return response()->json([
            'date' => $date->toDateString(),
            'filename' => 'riport-komentar-'.$date->toDateString().'.txt',
            'text' => rtrim(implode("\n", $lines))."\n",
        ]);
    }

    /**
     * Distinct Instagram post URLs commented on a given date.
     *
     * @return array<int, string>
     */
    private function commentedInstagramUrls(string $date): array
    {
        return Comment::query()
            ->whereDate('commented_on', $date)
            ->pluck('post_url')
            ->filter(fn ($url) => $url && Str::contains(Str::lower($url), 'instagram.com'))
            ->unique()
            ->values()
            ->all();
    }

    /**
     * Run an Apify actor synchronously and return its raw dataset items. Fails
     * soft (returns [] on any error) so callers never break if Apify is
     * slow/unavailable.
     *
     * @param  array<string, mixed>  $input
     * @return array<int, array<string, mixed>>
     */
    private function runApifyActor(string $actorId, array $input): array
    {
        $token = config('services.apify.token');
        if (! $token) {
            return [];
        }

        // The run-sync scrape can take a while; keep PHP from aborting first.
        @set_time_limit(130);

        try {
            $response = Http::withToken($token)
                ->timeout(110)
                ->post("https://api.apify.com/v2/acts/{$actorId}/run-sync-get-dataset-items", $input);
        } catch (\Throwable) {
            return [];
        }

        if ($response->failed()) {
            return [];
        }

        $items = $response->json();

        return is_array($items)
            ? array_values(array_filter($items, 'is_array'))
            : [];
    }

    /**
     * Call the Apify Instagram post scraper for the given URLs. Pass
     * $detailLevel = null for the richest field set, or 'basicData' for the
     * lean set used in the report.
     *
     * @param  array<int, string>  $urls
     * @return array<int, array<string, mixed>>
     */
    private function fetchScrapedPosts(array $urls, ?string $detailLevel): array
    {
        if (empty($urls)) {
            return [];
        }

        $input = [
            'username' => array_values($urls),
            'resultsLimit' => max(20, count($urls)),
            'skipPinnedPosts' => false,
        ];
        if ($detailLevel !== null) {
            $input['dataDetailLevel'] = $detailLevel;
        }

        return $this->runApifyActor(config('services.apify.instagram_post_actor'), $input);
    }

    /**
     * Call the Apify Instagram comment scraper for the given post URLs (up to
     * 15 comments each), returning the raw comment items.
     *
     * @param  array<int, string>  $urls
     * @return array<int, array<string, mixed>>
     */
    private function fetchScrapedComments(array $urls): array
    {
        if (empty($urls)) {
            return [];
        }

        return $this->runApifyActor(config('services.apify.instagram_comment_actor'), [
            'directUrls' => array_values($urls),
            'resultsLimit' => 15,
        ]);
    }

    /**
     * Scrape posts (lean fields) and key them by shortcode, for enriching the
     * text report lines.
     *
     * @param  array<int, string>  $urls
     * @return array<string, array<string, mixed>>
     */
    private function scrapePosts(array $urls): array
    {
        $map = [];
        foreach ($this->fetchScrapedPosts($urls, 'basicData') as $item) {
            $code = $item['shortCode']
                ?? $this->postShortcode($item['inputUrl'] ?? $item['url'] ?? null);
            if ($code) {
                $map[$code] = $item;
            }
        }

        return $map;
    }

    /**
     * Scrape (Apify) every Instagram post commented on a date at the FULL field
     * level and return the raw items as JSON, for the "download post data"
     * button. Admin / ketua only.
     */
    public function downloadPosts(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date' => ['required', 'date'],
        ]);

        $date = Carbon::parse($validated['date']);
        $urls = $this->commentedInstagramUrls($date->toDateString());
        $items = $this->fetchScrapedPosts($urls, null); // null = richest field set

        return response()->json([
            'date' => $date->toDateString(),
            'filename' => 'postingan-'.$date->toDateString().'.json',
            'requested' => count($urls),
            'count' => count($items),
            'items' => $items,
        ]);
    }

    /**
     * Scrape (Apify) the comments of every Instagram post commented on a date
     * and return the raw comment items as JSON, for the "download comment data"
     * button. Admin / ketua only.
     */
    public function downloadComments(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date' => ['required', 'date'],
        ]);

        $date = Carbon::parse($validated['date']);
        $urls = $this->commentedInstagramUrls($date->toDateString());
        $items = $this->fetchScrapedComments($urls);

        return response()->json([
            'date' => $date->toDateString(),
            'filename' => 'komentar-postingan-'.$date->toDateString().'.json',
            'requested' => count($urls),
            'count' => count($items),
            'items' => $items,
        ]);
    }

    /**
     * Extract the shortcode from an Instagram post/reel URL (e.g. the
     * "DZwapgpxhmE" in .../p/DZwapgpxhmE/), or null if it isn't one.
     */
    private function postShortcode(?string $url): ?string
    {
        if (! $url) {
            return null;
        }

        if (preg_match('~instagram\.com/(?:p|reel|reels|tv)/([^/?#]+)~i', $url, $m)) {
            return $m[1];
        }

        return null;
    }
}
