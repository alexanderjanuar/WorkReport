<?php

namespace App\Http\Controllers;

use App\Enums\Platform;
use App\Models\Comment;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
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
            ->with(['user:id,name', 'target:id,start_date,end_date'])
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
                'platform_label' => $comment->platform->label(),
                'post_url' => $comment->post_url,
                'proof_url' => $comment->proof_url,
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
        ]);
    }
}
