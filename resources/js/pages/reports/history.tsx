import { Head, router } from '@inertiajs/react';
import { CalendarDays, ExternalLink, Inbox, Link2 } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { dashboard } from '@/routes';

type HistoryEntry = {
    id: number;
    reported_on: string;
    date_label: string;
    platform_label: string;
    quantity: number;
    post_url: string | null;
    note: string | null;
    item_label: string | null;
    target_range: string | null;
};

type PaginationLink = { url: string | null; label: string; active: boolean };

type Paginator = {
    data: HistoryEntry[];
    links: PaginationLink[];
    from: number | null;
    to: number | null;
    total: number;
};

type Props = { entries: Paginator };

type DayGroup = {
    date: string;
    label: string;
    total: number;
    notes: string[];
    entries: HistoryEntry[];
};

/** Group the (already date-sorted) entries into per-day buckets. */
function groupByDay(entries: HistoryEntry[]): DayGroup[] {
    const groups: DayGroup[] = [];

    for (const entry of entries) {
        let group = groups.find((g) => g.date === entry.reported_on);
        if (!group) {
            group = {
                date: entry.reported_on,
                label: entry.date_label,
                total: 0,
                notes: [],
                entries: [],
            };
            groups.push(group);
        }
        group.entries.push(entry);
        group.total += entry.quantity;
        if (entry.note && !group.notes.includes(entry.note)) {
            group.notes.push(entry.note);
        }
    }

    return groups;
}

export default function ReportsHistory({ entries }: Props) {
    const days = groupByDay(entries.data);

    return (
        <>
            <Head title="Riwayat Kegiatan" />

            <div className="px-4 py-6 sm:px-6">
                <PageHeader
                    eyebrow="Aktivitas"
                    title="Riwayat Kegiatan"
                    description="Rekam jejak progres harian Anda dari hari ke hari."
                />

                {entries.data.length === 0 ? (
                    <div className="glass-card mt-6 flex flex-col items-center gap-3 rounded-2xl px-6 py-16 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                            <Inbox className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                            <p className="font-medium">Belum ada kegiatan</p>
                            <p className="text-sm text-muted-foreground">
                                Progres yang Anda catat akan muncul di sini.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="mt-6 space-y-5">
                        {days.map((day) => (
                            <div
                                key={day.date}
                                className="glass-card rounded-2xl p-5"
                            >
                                {/* day header */}
                                <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-lux-teal/12 text-lux-teal-dark dark:text-lux-teal">
                                            <CalendarDays className="h-4.5 w-4.5" />
                                        </span>
                                        <div>
                                            <p className="text-sm font-semibold capitalize">
                                                {day.label}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {day.entries.length} aktivitas
                                            </p>
                                        </div>
                                    </div>
                                    <span className="rounded-lg bg-lux-teal/10 px-2.5 py-1 text-sm font-semibold tabular-nums text-lux-teal-dark dark:text-lux-teal">
                                        +{day.total}
                                    </span>
                                </div>

                                {/* entries */}
                                <div className="mt-3 space-y-2">
                                    {day.entries.map((entry) => (
                                        <div
                                            key={entry.id}
                                            className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm"
                                        >
                                            <span className="font-medium">
                                                {entry.platform_label}
                                            </span>
                                            <span className="tabular-nums text-lux-teal-dark dark:text-lux-teal">
                                                +{entry.quantity}
                                            </span>
                                            {entry.item_label && (
                                                <span className="inline-flex min-w-0 items-center gap-1 rounded-md bg-lux-teal/10 px-1.5 py-0.5 text-[11px] font-medium text-lux-teal-dark dark:text-lux-teal">
                                                    <Link2 className="h-3 w-3 shrink-0" />
                                                    <span className="truncate">
                                                        {entry.item_label}
                                                    </span>
                                                </span>
                                            )}
                                            {entry.target_range && (
                                                <span className="text-xs text-muted-foreground">
                                                    Target {entry.target_range}
                                                </span>
                                            )}
                                            {entry.post_url && (
                                                <a
                                                    href={entry.post_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                                                >
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                    bukti
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* daily note(s) */}
                                {day.notes.length > 0 && (
                                    <div className="mt-3 rounded-lg border border-border/60 bg-white/40 px-3 py-2 dark:bg-white/[0.03]">
                                        <p className="mb-0.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                                            Catatan harian
                                        </p>
                                        {day.notes.map((note, i) => (
                                            <p
                                                key={i}
                                                className="text-sm text-foreground/80 italic"
                                            >
                                                “{note}”
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* pagination */}
                {entries.links.length > 3 && (
                    <div className="mt-6 flex flex-col items-center justify-between gap-2 text-sm text-muted-foreground sm:flex-row">
                        <span>
                            Menampilkan {entries.from ?? 0}–{entries.to ?? 0}{' '}
                            dari {entries.total} kegiatan
                        </span>
                        <div className="flex flex-wrap items-center gap-1">
                            {entries.links.map((link, i) => (
                                <button
                                    key={i}
                                    disabled={!link.url}
                                    onClick={() =>
                                        link.url &&
                                        router.get(
                                            link.url,
                                            {},
                                            {
                                                preserveState: true,
                                                preserveScroll: true,
                                            },
                                        )
                                    }
                                    className={`min-w-9 rounded-lg px-3 py-1.5 text-sm transition-colors disabled:opacity-40 ${
                                        link.active
                                            ? 'bg-lux-teal-dark text-white'
                                            : 'hover:bg-white/60 dark:hover:bg-white/10'
                                    }`}
                                    dangerouslySetInnerHTML={{
                                        __html: link.label,
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

ReportsHistory.layout = {
    breadcrumbs: [
        { title: 'Dasbor', href: dashboard() },
        { title: 'Riwayat Kegiatan', href: '/reports/riwayat' },
    ],
};
