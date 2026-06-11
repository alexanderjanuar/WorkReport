<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\Report;
use App\Models\Target;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $today = now()->toDateString();

        return $user->canManageUsers()
            ? $this->managerDashboard($user, $today)
            : $this->memberDashboard($user, $today);
    }

    /**
     * Admin / ketua tim overview across all members.
     */
    private function managerDashboard(User $user, string $today): Response
    {
        $attention = Target::query()
            ->with(['assignee:id,name', 'items:id,target_id,is_done'])
            ->where('status', 'open')
            ->orderBy('end_date')
            ->get()
            ->map(fn (Target $target) => $this->presentTargetRow($target, true))
            ->filter(fn (array $row) => $row['overdue'] || $row['ending_soon'])
            ->take(6)
            ->values();

        $recent = Report::query()
            ->with('user:id,name')
            ->latest('reported_on')
            ->latest('id')
            ->limit(7)
            ->get()
            ->map(fn (Report $report) => [
                'id' => $report->id,
                'user' => $report->user?->name,
                'platform_label' => $report->platform->label(),
                'quantity' => $report->quantity,
                'reported_on' => $report->reported_on->translatedFormat('d M Y'),
            ]);

        return Inertia::render('dashboard', [
            'role' => 'manager',
            'userName' => $user->name,
            'stats' => [
                'open' => Target::where('status', 'open')->count(),
                'closed' => Target::where('status', 'closed')->count(),
                'members' => User::where('role', UserRole::User)->count(),
                'today' => (int) Report::whereDate('reported_on', $today)->sum('quantity'),
            ],
            'attention' => $attention,
            'recent' => $recent,
        ]);
    }

    /**
     * Member overview of their own assigned targets.
     */
    private function memberDashboard(User $user, string $today): Response
    {
        $rows = $user->targets()
            ->with('items:id,target_id,is_done')
            ->where('status', 'open')
            ->orderBy('end_date')
            ->get()
            ->map(fn (Target $target) => $this->presentTargetRow($target, false));

        $recent = $user->reports()
            ->latest('reported_on')
            ->latest('id')
            ->limit(7)
            ->get()
            ->map(fn (Report $report) => [
                'id' => $report->id,
                'platform_label' => $report->platform->label(),
                'quantity' => $report->quantity,
                'reported_on' => $report->reported_on->translatedFormat('d M Y'),
                'post_url' => $report->post_url,
            ]);

        return Inertia::render('dashboard', [
            'role' => 'member',
            'userName' => $user->name,
            'stats' => [
                'open' => $rows->count(),
                'avg' => $rows->count() ? (int) round($rows->avg('percent')) : 0,
                'today' => (int) $user->reports()->whereDate('reported_on', $today)->sum('quantity'),
            ],
            'targets' => $rows->take(6)->values(),
            'recent' => $recent,
        ]);
    }

    /**
     * Shape a target into a compact dashboard row (progress + deadline).
     *
     * @return array<string, mixed>
     */
    private function presentTargetRow(Target $target, bool $withAssignee): array
    {
        $total = $target->items->count();
        $done = $target->items->where('is_done', true)->count();

        $end = $target->end_date->startOfDay();
        $todayDate = now()->startOfDay();
        $days = (int) round(
            ($end->getTimestamp() - $todayDate->getTimestamp()) / 86400,
        );

        $row = [
            'id' => $target->id,
            'range_label' => $target->start_date->translatedFormat('d M').' – '.$target->end_date->translatedFormat('d M Y'),
            'days' => $days,
            'done' => $done,
            'total' => $total,
            'percent' => $total > 0 ? (int) round($done / $total * 100) : 0,
            'overdue' => $days < 0,
            'ending_soon' => $days >= 0 && $days <= 3,
        ];

        if ($withAssignee) {
            $row['assignee'] = $target->assignee?->name;
        }

        return $row;
    }
}
