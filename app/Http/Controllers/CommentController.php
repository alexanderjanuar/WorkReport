<?php

namespace App\Http\Controllers;

use App\Enums\Platform;
use App\Models\Comment;
use App\Models\Media;
use App\Models\Target;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CommentController extends Controller
{
    /**
     * The current member's own distributed comments.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $platform = $request->input('platform');
        $date = $request->input('date');

        $comments = $user->comments()
            ->with(['target:id,start_date,end_date', 'media:id,name,platform,logo_path'])
            ->when(
                in_array($platform, Platform::values(), true),
                fn ($query) => $query->where('platform', $platform),
            )
            ->when($date, fn ($query) => $query->whereDate('commented_on', $date))
            ->latest('commented_on')
            ->latest('id')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (Comment $comment) => $this->present($comment));

        return Inertia::render('comments/index', [
            'comments' => $comments,
            'platformOptions' => Platform::options(),
            'targetOptions' => $this->targetOptions($user->id),
            'mediaOptions' => $this->mediaOptions(),
            'filters' => [
                'platform' => in_array($platform, Platform::values(), true) ? $platform : '',
                'date' => $date ? Carbon::parse($date)->toDateString() : '',
            ],
            'today' => now()->toDateString(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $comment = new Comment(['user_id' => $request->user()->id]);
        $this->persist($request, $comment);

        return back();
    }

    public function update(Request $request, Comment $comment): RedirectResponse
    {
        abort_unless($comment->user_id === $request->user()->id, 403);

        $this->persist($request, $comment);

        return back();
    }

    public function destroy(Request $request, Comment $comment): RedirectResponse
    {
        abort_unless($comment->user_id === $request->user()->id, 403);

        if ($comment->proof_path) {
            Storage::disk('public')->delete($comment->proof_path);
        }

        $comment->delete();

        return back();
    }

    /**
     * Plain-text daily report of the CURRENT user's own comments for a date,
     * grouped by media account (same "Riport" format as the team export).
     */
    public function export(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date' => ['required', 'date'],
        ]);

        $user = $request->user();
        $date = Carbon::parse($validated['date']);

        $comments = $user->comments()
            ->whereDate('commented_on', $date->toDateString())
            ->orderBy('id')
            ->get()
            ->groupBy('media_id');

        // only list media accounts that actually have comments on this date
        $media = Media::orderBy('name')->get(['id', 'name'])
            ->filter(fn (Media $account) => $comments->get($account->id)?->isNotEmpty() ?? false)
            ->values();

        $lines = [];
        $lines[] = 'Riport '.$date->day.' '.mb_strtolower($date->translatedFormat('F')).', Jam '.now()->format('H.i');
        $lines[] = 'Cek '.$media->count().' akun media ;';
        $lines[] = '';

        $renderItems = function ($items) use (&$lines, $user) {
            $n = 1;
            foreach ($items as $comment) {
                $lines[] = $n.'. '.$comment->quantity.' komen';
                $lines[] = $comment->post_url.' ✅ '.$comment->actionSummary().' [ '.$user->name.' ]';
                $lines[] = '';
                $n++;
            }
        };

        foreach ($media as $account) {
            $lines[] = '- '.$account->name.' :';
            $lines[] = '';
            $renderItems($comments->get($account->id));
        }

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
     * Validate + save a comment, handling the optional proof screenshot upload
     * (replacing the previous file when a new one is uploaded).
     */
    private function persist(Request $request, Comment $comment): void
    {
        $validated = $request->validate([
            'commented_on' => ['required', 'date'],
            'platform' => ['required', Rule::enum(Platform::class)],
            'quantity' => ['required', 'integer', 'min:1', 'max:1000000'],
            // extra actions on the same post (do NOT affect the target quota)
            'replies' => ['nullable', 'integer', 'min:0', 'max:1000000'],
            'likes' => ['nullable', 'integer', 'min:0', 'max:1000000'],
            'boosters' => ['nullable', 'integer', 'min:0', 'max:1000000'],
            'post_url' => ['required', 'url', 'max:2048'],
            'proof' => ['nullable', 'image', 'max:4096'], // ≤ 4 MB screenshot
            'media_id' => ['nullable', Rule::exists('media', 'id')],
            'target_id' => [
                'nullable',
                Rule::exists('targets', 'id')->where('user_id', $request->user()->id),
            ],
        ]);

        $comment->fill([
            'commented_on' => $validated['commented_on'],
            'platform' => $validated['platform'],
            'quantity' => $validated['quantity'],
            'replies' => $validated['replies'] ?? 0,
            'likes' => $validated['likes'] ?? 0,
            'boosters' => $validated['boosters'] ?? 0,
            'post_url' => $validated['post_url'],
            'media_id' => ($validated['media_id'] ?? null) ?: null,
            'target_id' => ($validated['target_id'] ?? null) ?: null,
        ]);

        if ($request->hasFile('proof')) {
            if ($comment->proof_path) {
                Storage::disk('public')->delete($comment->proof_path);
            }
            $comment->proof_path = $request->file('proof')->store('comment-proofs', 'public');
        }

        $comment->save();
    }

    /**
     * Media accounts for the comment form's select.
     *
     * @return array<int, array{value: int, label: string, platform: string, logo_url: string|null}>
     */
    private function mediaOptions(): array
    {
        return Media::orderBy('platform')
            ->orderBy('name')
            ->get(['id', 'name', 'platform', 'logo_path'])
            ->map(fn (Media $media) => [
                'value' => $media->id,
                'label' => $media->name,
                'platform' => $media->platform->value,
                'logo_url' => $media->logo_path
                    ? Storage::disk('public')->url($media->logo_path)
                    : null,
            ])
            ->all();
    }

    /**
     * Targets owned by the user, for the optional link dropdown.
     *
     * @return array<int, array{value: int, label: string}>
     */
    private function targetOptions(int $userId): array
    {
        return Target::where('user_id', $userId)
            ->orderByRaw("FIELD(status, 'open', 'closed')")
            ->latest('id')
            ->get(['id', 'start_date', 'end_date'])
            ->map(fn (Target $target) => [
                'value' => $target->id,
                'label' => $target->start_date->translatedFormat('d M').' – '.$target->end_date->translatedFormat('d M Y'),
            ])
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function present(Comment $comment): array
    {
        return [
            'id' => $comment->id,
            'commented_on' => $comment->commented_on->translatedFormat('d M Y'),
            'date' => $comment->commented_on->toDateString(),
            'platform' => $comment->platform->value,
            'platform_label' => $comment->platform->label(),
            'quantity' => $comment->quantity,
            'replies' => $comment->replies,
            'likes' => $comment->likes,
            'boosters' => $comment->boosters,
            'post_url' => $comment->post_url,
            // displayable proof: uploaded screenshot first, legacy URL otherwise
            'proof_url' => $comment->proof_path
                ? Storage::disk('public')->url($comment->proof_path)
                : $comment->proof_url,
            'has_proof' => (bool) ($comment->proof_path || $comment->proof_url),
            'media_id' => $comment->media_id,
            'media' => $comment->media?->name,
            'media_logo' => $comment->media?->logo_path
                ? Storage::disk('public')->url($comment->media->logo_path)
                : null,
            'target_id' => $comment->target_id,
            'target_range' => $comment->target
                ? $comment->target->start_date->translatedFormat('d M').' – '.$comment->target->end_date->translatedFormat('d M Y')
                : null,
        ];
    }
}
