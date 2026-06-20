<?php

namespace App\Http\Controllers;

use App\Enums\Platform;
use App\Models\Comment;
use App\Models\Media;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class MediaController extends Controller
{
    /**
     * List the team's media accounts (admin / ketua tim).
     */
    public function index(Request $request): Response
    {
        $search = trim((string) $request->input('search', ''));

        $media = Media::query()
            ->withCount('comments')
            ->when($search !== '', fn ($query) => $query
                ->where('name', 'like', "%{$search}%"))
            ->orderBy('platform')
            ->orderBy('name')
            ->get()
            ->map(fn (Media $media) => [
                'id' => $media->id,
                'name' => $media->name,
                'platform' => $media->platform->value,
                'platform_label' => $media->platform->label(),
                'followers' => $media->followers,
                'logo_url' => $media->logo_path
                    ? Storage::disk('public')->url($media->logo_path)
                    : null,
                'url' => $media->url,
                'note' => $media->note,
                'comments_count' => $media->comments_count,
            ]);

        return Inertia::render('media/index', [
            'media' => $media,
            'platformOptions' => Platform::options(),
            'filters' => ['search' => $search],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->persist($request, new Media());

        return back();
    }

    public function update(Request $request, Media $media): RedirectResponse
    {
        $this->persist($request, $media);

        return back();
    }

    public function destroy(Media $media): RedirectResponse
    {
        if ($media->logo_path) {
            Storage::disk('public')->delete($media->logo_path);
        }

        $media->delete();

        return back();
    }

    /**
     * Detail page for a media account (admin / ketua tim): profile, aggregate
     * stats, per-member contribution, and the full list of related comments.
     */
    public function show(Media $media): Response
    {
        $stats = [
            'comments_count' => $media->comments()->count(),
            'total_quantity' => (int) $media->comments()->sum('quantity'),
            'contributors' => (int) $media->comments()->distinct()->count('user_id'),
            'last_activity' => ($last = $media->comments()->max('commented_on'))
                ? Carbon::parse($last)->translatedFormat('d M Y')
                : null,
        ];

        $byMember = Comment::query()
            ->where('media_id', $media->id)
            ->with('user:id,name')
            ->selectRaw('user_id, COUNT(*) as comments_count, SUM(quantity) as total_quantity, MAX(commented_on) as last_date')
            ->groupBy('user_id')
            ->orderByDesc('total_quantity')
            ->get()
            ->map(fn (Comment $row) => [
                'user' => $row->user?->name ?? '—',
                'comments_count' => (int) $row->comments_count,
                'total_quantity' => (int) $row->total_quantity,
                'last_date' => $row->last_date
                    ? Carbon::parse($row->last_date)->translatedFormat('d M Y')
                    : null,
            ]);

        $comments = $media->comments()
            ->with(['user:id,name', 'target:id,start_date,end_date'])
            ->latest('commented_on')
            ->latest('id')
            ->paginate(20)
            ->through(fn (Comment $comment) => [
                'id' => $comment->id,
                'commented_on' => $comment->commented_on->translatedFormat('d M Y'),
                'user' => $comment->user?->name,
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

        return Inertia::render('media/show', [
            'media' => [
                'id' => $media->id,
                'name' => $media->name,
                'platform' => $media->platform->value,
                'platform_label' => $media->platform->label(),
                'followers' => $media->followers,
                'logo_url' => $media->logo_path
                    ? Storage::disk('public')->url($media->logo_path)
                    : null,
                'url' => $media->url,
                'note' => $media->note,
            ],
            'stats' => $stats,
            'byMember' => $byMember,
            'comments' => $comments,
        ]);
    }

    /**
     * Validate + save a media account, handling the optional logo upload
     * (replacing/removing the previous file when a new one is uploaded).
     */
    private function persist(Request $request, Media $media): void
    {
        $validated = $request->validate([
            'name' => [
                'required', 'string', 'max:255',
                // no two accounts with the same name on the same platform
                Rule::unique('media', 'name')
                    ->where(fn ($query) => $query->where('platform', $request->input('platform')))
                    ->ignore($media->id),
            ],
            'platform' => ['required', Rule::enum(Platform::class)],
            'followers' => ['nullable', 'integer', 'min:0', 'max:100000000000'],
            // the account URL is the canonical key — never duplicate it
            'url' => ['nullable', 'url', 'max:2048', Rule::unique('media', 'url')->ignore($media->id)],
            'note' => ['nullable', 'string', 'max:1000'],
            'logo' => ['nullable', 'image', 'max:4096'], // ≤ 4 MB
            // a logo already staged on our public disk by the scrape step
            'logo_path' => ['nullable', 'string', 'regex:#^media-logos/[A-Za-z0-9]+\.(jpg|jpeg|png|webp)$#'],
        ], [
            'name.unique' => 'Media dengan nama ini sudah ada di platform tersebut.',
            'url.unique' => 'Media dengan link akun ini sudah ada.',
        ]);

        $media->fill([
            'name' => $validated['name'],
            'platform' => $validated['platform'],
            'followers' => $validated['followers'] ?? null,
            'url' => $validated['url'] ?? null,
            'note' => $validated['note'] ?? null,
        ]);

        if ($request->hasFile('logo')) {
            $this->replaceLogo($media, $request->file('logo')->store('media-logos', 'public'));
        } elseif (
            ! empty($validated['logo_path'])
            && Storage::disk('public')->exists($validated['logo_path'])
        ) {
            $this->replaceLogo($media, $validated['logo_path']);
        }

        $media->save();
    }

    /**
     * Set a new logo path, deleting the previous file.
     */
    private function replaceLogo(Media $media, string $path): void
    {
        if ($media->logo_path) {
            Storage::disk('public')->delete($media->logo_path);
        }
        $media->logo_path = $path;
    }

    /**
     * Download a remote image (e.g. a scraped profile picture) onto the public
     * disk and return its path, or null on failure.
     */
    private function downloadLogo(string $url): ?string
    {
        try {
            $response = Http::timeout(30)->get($url);
            if ($response->failed() || ! str_starts_with((string) $response->header('Content-Type'), 'image/')) {
                return null;
            }
            $mime = (string) $response->header('Content-Type');
            $ext = str_contains($mime, 'png') ? 'png'
                : (str_contains($mime, 'webp') ? 'webp' : 'jpg');
            $path = 'media-logos/'.Str::random(40).'.'.$ext;
            Storage::disk('public')->put($path, $response->body());

            return $path;
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * Call the Apify Instagram scraper for one username.
     *
     * @return array{0: ?array<string, mixed>, 1: ?string} [profile, errorMessage]
     */
    private function fetchInstagramProfile(string $username): array
    {
        $token = config('services.apify.token');
        if (! $token) {
            return [null, 'Apify belum dikonfigurasi (APIFY_TOKEN kosong).'];
        }

        $actor = config('services.apify.instagram_actor');

        // Apify's run-sync can take a while; make sure PHP's max_execution_time
        // doesn't abort the request before the HTTP client's own timeout.
        @set_time_limit(130);

        try {
            $response = Http::withToken($token)
                ->timeout(110)
                ->post("https://api.apify.com/v2/acts/{$actor}/run-sync-get-dataset-items", [
                    'usernames' => [$username],
                    'includeAboutSection' => false,
                ]);
        } catch (\Throwable $e) {
            return [null, 'Gagal menghubungi Apify: '.$e->getMessage()];
        }

        if ($response->failed()) {
            return [null, 'Apify mengembalikan error ('.$response->status().').'];
        }

        $items = $response->json();
        $profile = is_array($items) ? ($items[0] ?? null) : null;

        if (! is_array($profile) || (($profile['error'] ?? null) !== null && ! isset($profile['username']))) {
            return [null, 'Profil "@'.$username.'" tidak ditemukan.'];
        }

        return [$profile, null];
    }

    /**
     * Best-effort extraction of an Instagram username from a media account
     * (only for Instagram media that have an instagram.com URL).
     */
    private function instagramUsername(Media $media): ?string
    {
        if ($media->platform !== Platform::Instagram || ! $media->url) {
            return null;
        }

        if (preg_match('~instagram\.com/([^/?#]+)~i', $media->url, $m)) {
            return ltrim(trim($m[1]), '@') ?: null;
        }

        return null;
    }

    /**
     * Scrape an Instagram profile via Apify and return fields to prefill the
     * media form (name, account URL, profile-picture URL). Available to any
     * member (same as media creation).
     */
    public function scrape(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'username' => ['required', 'string', 'max:255'],
        ]);

        $username = ltrim(trim($validated['username']), '@');
        [$profile, $error] = $this->fetchInstagramProfile($username);

        if ($error !== null) {
            return response()->json(['message' => $error], 422);
        }

        // Download the profile picture now and serve it from our own disk, so
        // the preview loads reliably (Instagram CDN URLs are blocked/expiring).
        $picUrl = $profile['profilePicUrlHD'] ?? ($profile['profilePicUrl'] ?? null);
        $logoPath = $picUrl ? $this->downloadLogo($picUrl) : null;

        return response()->json([
            'name' => $profile['fullName'] ?? ($profile['username'] ?? $username),
            'username' => $profile['username'] ?? $username,
            'url' => $profile['url'] ?? 'https://www.instagram.com/'.$username.'/',
            'platform' => 'instagram',
            'followers' => $profile['followersCount'] ?? null,
            'logo_path' => $logoPath,
            'logo_url' => $logoPath ? Storage::disk('public')->url($logoPath) : null,
            'biography' => $profile['biography'] ?? null,
        ]);
    }

    /**
     * Re-fetch an Instagram media's profile (Apify) and update its follower
     * count + profile picture. Admin / ketua only.
     */
    public function resync(Media $media): RedirectResponse
    {
        $username = $this->instagramUsername($media);
        if (! $username) {
            return back()->withErrors([
                'resync' => 'Resync hanya untuk media Instagram dengan URL akun yang valid.',
            ]);
        }

        [$profile, $error] = $this->fetchInstagramProfile($username);
        if ($error !== null) {
            return back()->withErrors(['resync' => $error]);
        }

        if (isset($profile['followersCount'])) {
            $media->followers = (int) $profile['followersCount'];
        }

        // Refresh the profile picture too (same source as the follower count).
        $picUrl = $profile['profilePicUrlHD'] ?? ($profile['profilePicUrl'] ?? null);
        if ($picUrl && ($path = $this->downloadLogo($picUrl))) {
            $this->replaceLogo($media, $path);
        }

        $media->save();

        return back();
    }
}
