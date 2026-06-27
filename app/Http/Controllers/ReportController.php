<?php

namespace App\Http\Controllers;

use App\Enums\Platform;
use App\Models\Report;
use App\Models\Target;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    /**
     * Show the current user's targets and their progress.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        $targets = $user->targets()
            ->with([
                // Sum of progress linked to each item, to draw down its quota.
                'items' => fn ($query) => $query->withSum('reports as delivered', 'quantity'),
                'reports' => fn ($query) => $query
                    ->with('targetItem:id,label')
                    ->latest('reported_on')
                    ->latest('id'),
            ])
            ->orderByRaw("FIELD(status, 'open', 'closed')")
            ->latest('id')
            ->get()
            ->map(function (Target $target) {
                $total = $target->items->count();
                $done = $target->items->where('is_done', true)->count();

                return [
                    'id' => $target->id,
                    'status' => $target->status->value,
                    'status_label' => $target->status->label(),
                    'is_open' => $target->isOpen(),
                    'start_date' => $target->start_date->toDateString(),
                    'end_date' => $target->end_date->toDateString(),
                    'range_label' => $target->start_date->translatedFormat('d M').' – '.$target->end_date->translatedFormat('d M Y'),
                    'note' => $target->note,
                    'close_reason' => $target->close_reason,
                    'done' => $done,
                    'total' => $total,
                    'percent' => $total > 0 ? (int) round($done / $total * 100) : 0,
                    'items' => $target->items->map(function ($item) {
                        $delivered = (int) ($item->delivered ?? 0);

                        return [
                            'id' => $item->id,
                            'label' => $item->label,
                            'quantity' => $item->quantity,
                            'delivered' => $delivered,
                            'remaining' => $item->quantity !== null
                                ? max(0, $item->quantity - $delivered)
                                : null,
                            'is_done' => (bool) $item->is_done,
                        ];
                    })->values(),
                    'reports' => $target->reports->map(fn (Report $report) => [
                        'id' => $report->id,
                        'reported_on' => $report->reported_on->translatedFormat('d M Y'),
                        'date' => $report->reported_on->toDateString(),
                        'platform' => $report->platform->value,
                        'platform_label' => $report->platform->label(),
                        'quantity' => $report->quantity,
                        'post_url' => $report->post_url,
                        'note' => $report->note,
                        'target_item_id' => $report->target_item_id,
                        'item_label' => $report->targetItem?->label ?? $report->item_label,
                    ])->values(),
                ];
            });

        return Inertia::render('reports/index', [
            'targets' => $targets,
            'platformOptions' => Platform::options(),
            'today' => now()->toDateString(),
        ]);
    }

    /**
     * Log one or more progress entries against one of the user's targets.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'target_id' => ['required', 'exists:targets,id'],
            'reported_on' => ['required', 'date'],
            'note' => ['nullable', 'string', 'max:2000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.target_item_id' => ['nullable', 'integer'],
            'items.*.item_label' => ['nullable', 'string', 'max:255'],
            'items.*.platform' => ['required', Rule::enum(Platform::class)],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:1000000'],
            'items.*.post_url' => ['nullable', 'url', 'max:2048'],
        ]);

        $target = Target::findOrFail($validated['target_id']);

        abort_unless($target->user_id === $request->user()->id, 403);

        if (! $target->isOpen()) {
            throw ValidationException::withMessages([
                'target_id' => 'Target ini sudah ditutup.',
            ]);
        }

        $date = $validated['reported_on'];
        if (
            $date < $target->start_date->toDateString()
            || $date > $target->end_date->toDateString()
        ) {
            throw ValidationException::withMessages([
                'reported_on' => 'Tanggal di luar rentang target.',
            ]);
        }

        // Any linked item must belong to this very target.
        $itemIds = $target->items()->pluck('id');
        foreach ($validated['items'] as $i => $item) {
            if (! empty($item['target_item_id']) && ! $itemIds->contains($item['target_item_id'])) {
                throw ValidationException::withMessages([
                    "items.{$i}.target_item_id" => 'Item target tidak valid.',
                ]);
            }
        }

        $note = trim((string) ($validated['note'] ?? ''));

        DB::transaction(function () use ($validated, $target, $request, $date, $note) {
            foreach ($validated['items'] as $item) {
                $label = trim((string) ($item['item_label'] ?? ''));

                $target->reports()->create([
                    'user_id' => $request->user()->id,
                    'target_item_id' => $item['target_item_id'] ?: null,
                    'item_label' => $label !== '' ? $label : null,
                    'reported_on' => $date,
                    'platform' => $item['platform'],
                    'quantity' => $item['quantity'],
                    'post_url' => $item['post_url'] ?? null,
                    'note' => $note !== '' ? $note : null,
                ]);
            }

            // Keep a single shared note per (target, date): a non-empty note
            // from this submission overwrites the whole day's entries.
            if ($note !== '') {
                $target->reports()
                    ->where('reported_on', $date)
                    ->update(['note' => $note]);
            }
        });

        return back();
    }

    /**
     * Edit a single progress entry. The owner may edit their own; admin/ketua
     * may edit anyone's. Item draw-down totals recalculate automatically because
     * `delivered` is a live `withSum` of the linked reports (not stored).
     */
    public function update(Request $request, Report $report): RedirectResponse
    {
        $user = $request->user();
        abort_unless($report->user_id === $user->id || $user->canManageUsers(), 403);

        $target = $report->target;

        $validated = $request->validate([
            'reported_on' => ['required', 'date'],
            'platform' => ['required', Rule::enum(Platform::class)],
            'quantity' => ['required', 'integer', 'min:1', 'max:1000000'],
            'post_url' => ['nullable', 'url', 'max:2048'],
            'note' => ['nullable', 'string', 'max:2000'],
            'target_item_id' => ['nullable', 'integer'],
            'item_label' => ['nullable', 'string', 'max:255'],
        ]);

        $date = $validated['reported_on'];
        if (
            $date < $target->start_date->toDateString()
            || $date > $target->end_date->toDateString()
        ) {
            throw ValidationException::withMessages([
                'reported_on' => 'Tanggal di luar rentang target.',
            ]);
        }

        if (
            ! empty($validated['target_item_id'])
            && ! $target->items()->whereKey($validated['target_item_id'])->exists()
        ) {
            throw ValidationException::withMessages([
                'target_item_id' => 'Item target tidak valid.',
            ]);
        }

        $note = trim((string) ($validated['note'] ?? ''));

        $attributes = [
            'reported_on' => $date,
            'platform' => $validated['platform'],
            'quantity' => $validated['quantity'],
            'post_url' => $validated['post_url'] ?? null,
            'note' => $note !== '' ? $note : null,
        ];

        // Only touch the activity link/label when the form actually sends them
        // (the member's modal does; the oversight table's modal does not).
        if ($request->has('target_item_id') || $request->has('item_label')) {
            $label = trim((string) ($validated['item_label'] ?? ''));
            $attributes['target_item_id'] = $validated['target_item_id'] ?: null;
            $attributes['item_label'] = $label !== '' ? $label : null;
        }

        DB::transaction(function () use ($report, $target, $attributes, $note, $date) {
            $report->update($attributes);

            // Keep one shared note per (target, date).
            if ($note !== '') {
                $target->reports()
                    ->where('reported_on', $date)
                    ->update(['note' => $note]);
            }
        });

        return back();
    }

    /**
     * Plain-text summary of the current user's progress for a date, grouped by
     * target (then platform). Returned as JSON for the export modal to display,
     * copy, or download.
     */
    public function export(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date' => ['required', 'date'],
        ]);

        $user = $request->user();
        $date = Carbon::parse($validated['date']);

        $reports = $user->reports()
            ->with(['targetItem:id,label', 'target:id,start_date,end_date'])
            ->whereDate('reported_on', $date->toDateString())
            ->orderBy('target_id')
            ->orderBy('platform')
            ->orderBy('id')
            ->get();

        $lines = [];
        $lines[] = 'Progres '.$date->translatedFormat('d F Y');
        $lines[] = $user->name;
        $lines[] = '';

        if ($reports->isEmpty()) {
            $lines[] = 'Tidak ada progres pada tanggal ini.';

            return response()->json([
                'date' => $date->toDateString(),
                'filename' => 'progres-'.$date->toDateString().'.txt',
                'text' => implode("\n", $lines)."\n",
            ]);
        }

        $grandTotal = 0;

        foreach ($reports->groupBy('target_id') as $targetReports) {
            $target = $targetReports->first()->target;
            $lines[] = 'Target '.($target
                ? $target->start_date->translatedFormat('d M').' – '.$target->end_date->translatedFormat('d M Y')
                : 'Tanpa target');

            foreach ($targetReports as $report) {
                $label = $report->targetItem?->label ?? $report->item_label;
                $line = '• '.$report->platform->label().' +'.$report->quantity;
                if ($label) {
                    $line .= ' — '.$label;
                }
                $lines[] = $line;
                if ($report->post_url) {
                    $lines[] = '   '.$report->post_url;
                }
                $grandTotal += $report->quantity;
            }

            // one shared daily note per (target, date)
            $note = $targetReports->first(fn (Report $r) => filled($r->note))?->note;
            if ($note) {
                $lines[] = 'Catatan: '.$note;
            }

            $lines[] = '';
        }

        $lines[] = 'Total: +'.$grandTotal;

        return response()->json([
            'date' => $date->toDateString(),
            'filename' => 'progres-'.$date->toDateString().'.txt',
            'text' => rtrim(implode("\n", $lines))."\n",
        ]);
    }

    /**
     * Chronological log of the current user's own daily activity.
     */
    public function history(Request $request): Response
    {
        $entries = $request->user()->reports()
            ->with(['targetItem:id,label', 'target:id,start_date,end_date'])
            ->latest('reported_on')
            ->latest('id')
            ->paginate(30)
            ->through(fn (Report $report) => [
                'id' => $report->id,
                'reported_on' => $report->reported_on->toDateString(),
                'date_label' => $report->reported_on->translatedFormat('l, d M Y'),
                'platform_label' => $report->platform->label(),
                'quantity' => $report->quantity,
                'post_url' => $report->post_url,
                'note' => $report->note,
                'item_label' => $report->targetItem?->label ?? $report->item_label,
                'target_range' => $report->target
                    ? $report->target->start_date->translatedFormat('d M').' – '.$report->target->end_date->translatedFormat('d M Y')
                    : null,
            ]);

        return Inertia::render('reports/history', [
            'entries' => $entries,
        ]);
    }

    /**
     * Delete one of the current user's progress entries.
     */
    public function destroy(Request $request, Report $report): RedirectResponse
    {
        abort_unless($report->user_id === $request->user()->id, 403);

        $report->delete();

        return back();
    }
}
