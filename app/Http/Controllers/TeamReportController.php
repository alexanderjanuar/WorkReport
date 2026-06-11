<?php

namespace App\Http\Controllers;

use App\Models\Report;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class TeamReportController extends Controller
{
    /**
     * Table of every member's daily progress entries (admin / ketua tim).
     */
    public function index(Request $request): Response
    {
        $search = trim((string) $request->input('search', ''));
        $date = $request->input('date');

        $reports = Report::query()
            ->with(['user:id,name', 'target:id,start_date,end_date'])
            ->when($search !== '', fn ($query) => $query->whereHas(
                'user',
                fn ($q) => $q->where('name', 'like', "%{$search}%"),
            ))
            ->when($date, fn ($query) => $query->whereDate('reported_on', $date))
            ->latest('reported_on')
            ->latest('id')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Report $report) => [
                'id' => $report->id,
                'reported_on' => $report->reported_on->translatedFormat('d M Y'),
                'user' => $report->user?->name,
                'platform_label' => $report->platform->label(),
                'quantity' => $report->quantity,
                'post_url' => $report->post_url,
                'target_range' => $report->target
                    ? $report->target->start_date->translatedFormat('d M').' – '.$report->target->end_date->translatedFormat('d M Y')
                    : null,
            ]);

        return Inertia::render('reports/team', [
            'reports' => $reports,
            'filters' => [
                'search' => $search,
                'date' => $date ? Carbon::parse($date)->toDateString() : '',
            ],
        ]);
    }
}
