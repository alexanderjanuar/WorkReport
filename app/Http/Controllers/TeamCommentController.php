<?php

namespace App\Http\Controllers;

use App\Enums\Platform;
use App\Models\Comment;
use App\Models\Media;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
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
        ]);

        $date = Carbon::parse($validated['date']);

        $media = Media::orderBy('name')->get(['id', 'name']);
        $comments = Comment::query()
            ->with('user:id,name')
            ->whereDate('commented_on', $date->toDateString())
            ->orderBy('id')
            ->get()
            ->groupBy('media_id');

        $lines = [];
        $lines[] = 'Riport '.$date->day.' '.mb_strtolower($date->translatedFormat('F')).', Jam '.now()->format('H.i');
        $lines[] = 'Cek '.$media->count().' akun media ;';
        $lines[] = '';

        $renderItems = function ($items) use (&$lines) {
            if ($items === null || $items->isEmpty()) {
                $lines[] = '1.';
                $lines[] = '';

                return;
            }
            $n = 1;
            foreach ($items as $comment) {
                $lines[] = $n.'. '.$comment->quantity.' komen';
                $lines[] = $comment->post_url.' ✅ [ '.($comment->user?->name ?? '-').' ]';
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
}
