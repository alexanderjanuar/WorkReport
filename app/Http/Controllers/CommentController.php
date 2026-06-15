<?php

namespace App\Http\Controllers;

use App\Enums\Platform;
use App\Models\Comment;
use App\Models\Target;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
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
            ->with('target:id,start_date,end_date')
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
            'filters' => [
                'platform' => in_array($platform, Platform::values(), true) ? $platform : '',
                'date' => $date ? Carbon::parse($date)->toDateString() : '',
            ],
            'today' => now()->toDateString(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validateComment($request);

        $request->user()->comments()->create($validated);

        return back();
    }

    public function update(Request $request, Comment $comment): RedirectResponse
    {
        abort_unless($comment->user_id === $request->user()->id, 403);

        $comment->update($this->validateComment($request));

        return back();
    }

    public function destroy(Request $request, Comment $comment): RedirectResponse
    {
        abort_unless($comment->user_id === $request->user()->id, 403);

        $comment->delete();

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    private function validateComment(Request $request): array
    {
        $validated = $request->validate([
            'commented_on' => ['required', 'date'],
            'platform' => ['required', Rule::enum(Platform::class)],
            'post_url' => ['required', 'url', 'max:2048'],
            'proof_url' => ['nullable', 'url', 'max:2048'],
            'target_id' => [
                'nullable',
                Rule::exists('targets', 'id')->where('user_id', $request->user()->id),
            ],
        ]);

        return [
            'commented_on' => $validated['commented_on'],
            'platform' => $validated['platform'],
            'post_url' => $validated['post_url'],
            'proof_url' => $validated['proof_url'] ?? null,
            'target_id' => ($validated['target_id'] ?? null) ?: null,
        ];
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
            'post_url' => $comment->post_url,
            'proof_url' => $comment->proof_url,
            'target_id' => $comment->target_id,
            'target_range' => $comment->target
                ? $comment->target->start_date->translatedFormat('d M').' – '.$comment->target->end_date->translatedFormat('d M Y')
                : null,
        ];
    }
}
