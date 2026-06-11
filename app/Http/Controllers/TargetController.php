<?php

namespace App\Http\Controllers;

use App\Enums\TargetStatus;
use App\Models\Target;
use App\Models\TargetItem;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class TargetController extends Controller
{
    /**
     * List assigned targets with their checklist progress, with optional
     * status/assignee filters and a group-by ordering.
     */
    public function index(Request $request): Response
    {
        $status = $request->input('status');         // '' | open | closed
        $assignee = $request->input('assignee');     // '' | user id
        $group = $request->input('group', 'none');   // none | assignee | status

        $targets = Target::query()
            ->with(['assignee:id,name', 'creator:id,name', 'items'])
            ->when(
                in_array($status, ['open', 'closed'], true),
                fn ($query) => $query->where('status', $status),
            )
            ->when($assignee, fn ($query) => $query->where('user_id', $assignee))
            ->when(
                $group === 'assignee',
                fn ($query) => $query->orderBy(
                    User::select('name')->whereColumn('users.id', 'targets.user_id'),
                ),
            )
            ->orderByRaw("FIELD(status, 'open', 'closed')")
            ->latest('id')
            ->get()
            ->map(fn (Target $target) => $this->present($target));

        // $targets = Target::query()
        //         ->with(['assignee:id,name', 'creator:id,name', 'items'])

        return Inertia::render('targets/index', [
            'targets' => $targets,
            'assigneeOptions' => User::orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (User $user) => ['value' => $user->id, 'label' => $user->name]),
            'filters' => [
                'status' => in_array($status, ['open', 'closed'], true) ? $status : '',
                'assignee' => $assignee ? (int) $assignee : '',
                'group' => in_array($group, ['assignee', 'status'], true) ? $group : 'none',
            ],
        ]);
    }

    /**
     * Assign a new target (with one or more checklist items) to a member.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate($this->rules());

        DB::transaction(function () use ($validated, $request) {
            $target = Target::create([
                'user_id' => $validated['user_id'],
                'assigned_by' => $request->user()->id,
                'start_date' => $validated['start_date'],
                'end_date' => $validated['end_date'],
                'note' => $validated['note'] ?? null,
                'status' => TargetStatus::Open,
            ]);

            $target->items()->createMany(
                array_map(fn ($item) => [
                    'label' => $item['label'],
                    'quantity' => $item['quantity'],
                ], $validated['items']),
            );
        });

        return back();
    }

    /**
     * Update a target's range, note, and checklist items.
     */
    public function update(Request $request, Target $target): RedirectResponse
    {
        $validated = $request->validate($this->rules());

        DB::transaction(function () use ($validated, $target) {
            $target->update([
                'user_id' => $validated['user_id'],
                'start_date' => $validated['start_date'],
                'end_date' => $validated['end_date'],
                'note' => $validated['note'] ?? null,
            ]);

            // Upsert by id so existing items keep their checklist (done) state.
            $keepIds = collect($validated['items'])->pluck('id')->filter()->all();
            $target->items()->whereNotIn('id', $keepIds)->delete();

            foreach ($validated['items'] as $item) {
                $attributes = [
                    'label' => $item['label'],
                    'quantity' => $item['quantity'],
                ];

                if (! empty($item['id'])) {
                    $target->items()->whereKey($item['id'])->update($attributes);
                } else {
                    $target->items()->create($attributes);
                }
            }
        });

        return back();
    }

    /**
     * Close a target, optionally noting why it fell short.
     */
    public function close(Request $request, Target $target): RedirectResponse
    {
        $validated = $request->validate([
            'close_reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $target->update([
            'status' => TargetStatus::Closed,
            'closed_at' => now(),
            'close_reason' => $validated['close_reason'] ?? null,
        ]);

        return back();
    }

    /**
     * Delete a target (its items and progress are removed too).
     */
    public function destroy(Target $target): RedirectResponse
    {
        $target->delete();

        return back();
    }

    /**
     * Toggle a checklist item's done state (admin / ketua tim).
     */
    public function toggleItem(TargetItem $targetItem): RedirectResponse
    {
        $targetItem->update([
            'is_done' => ! $targetItem->is_done,
            'done_at' => $targetItem->is_done ? null : now(),
        ]);

        return back();
    }

    /**
     * Validation rules for creating / updating a target.
     *
     * @return array<string, mixed>
     */
    private function rules(): array
    {
        return [
            'user_id' => ['required', 'exists:users,id'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'note' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.id' => ['nullable', 'integer'],
            'items.*.label' => ['required', 'string', 'max:255'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:1000000'],
        ];
    }

    /**
     * Shape a target for the frontend.
     *
     * @return array<string, mixed>
     */
    private function present(Target $target): array
    {
        $total = $target->items->count();
        $done = $target->items->where('is_done', true)->count();

        return [
            'id' => $target->id,
            'user_id' => $target->user_id,
            'assignee' => $target->assignee?->name,
            'creator' => $target->creator?->name,
            'start_date' => $target->start_date->toDateString(),
            'end_date' => $target->end_date->toDateString(),
            'range_label' => $target->start_date->translatedFormat('d M').' – '.$target->end_date->translatedFormat('d M Y'),
            'status' => $target->status->value,
            'status_label' => $target->status->label(),
            'close_reason' => $target->close_reason,
            'note' => $target->note,
            'done' => $done,
            'total' => $total,
            'percent' => $total > 0 ? (int) round($done / $total * 100) : 0,
            'items' => $target->items->map(fn ($item) => [
                'id' => $item->id,
                'label' => $item->label,
                'quantity' => $item->quantity,
                'is_done' => (bool) $item->is_done,
            ])->values(),
        ];
    }
}
