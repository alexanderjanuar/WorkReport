import { Head, router } from '@inertiajs/react';
import { CalendarDays, ExternalLink, Search } from 'lucide-react';
import { useRef, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { dashboard } from '@/routes';

type ReportRow = {
    id: number;
    reported_on: string;
    date_label: string;
    user: string | null;
    item_label: string | null;
    platform_label: string;
    quantity: number;
    post_url: string | null;
    target_range: string | null;
};

type Paginated<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    from: number | null;
    to: number | null;
    total: number;
};

type Props = {
    reports: Paginated<ReportRow>;
    filters: { search: string; date: string; group: string };
};

type Group = {
    key: string;
    label: string;
    total: number;
    rows: ReportRow[];
};

const initials = (name: string | null) =>
    (name ?? '—').slice(0, 2).toUpperCase();

/** Bucket the (already ordered) rows into contiguous groups by date or member. */
function buildGroups(rows: ReportRow[], group: string): Group[] {
    const out: Group[] = [];
    for (const r of rows) {
        const key = group === 'member' ? (r.user ?? '—') : r.reported_on;
        const label = group === 'member' ? (r.user ?? '—') : r.date_label;
        let g = out.find((x) => x.key === key);
        if (!g) {
            g = { key, label, total: 0, rows: [] };
            out.push(g);
        }
        g.rows.push(r);
        g.total += r.quantity;
    }
    return out;
}

export default function TeamReports({ reports, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [date, setDate] = useState(filters.date ?? '');
    const [group, setGroup] = useState(filters.group ?? 'date');
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const apply = (next: { search?: string; date?: string; group?: string }) => {
        const g = next.group ?? group;
        router.get(
            '/laporan',
            {
                search: (next.search ?? search) || undefined,
                date: (next.date ?? date) || undefined,
                group: g !== 'date' ? g : undefined,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const onSearch = (value: string) => {
        setSearch(value);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => apply({ search: value }), 300);
    };

    const reset = () => {
        setSearch('');
        setDate('');
        setGroup('date');
        router.get('/laporan', {}, { preserveScroll: true });
    };

    const groups = buildGroups(reports.data, group);
    const byMember = group === 'member';

    return (
        <>
            <Head title="Laporan Harian" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    eyebrow="Pelaporan"
                    title="Laporan Harian"
                    description="Semua progres harian yang dicatat anggota."
                />

                {/* table card */}
                <div className="glass-card overflow-hidden rounded-2xl">
                    {/* toolbar */}
                    <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
                        <div className="relative w-full sm:max-w-xs">
                            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => onSearch(e.target.value)}
                                placeholder="Cari nama anggota…"
                                className="h-10 rounded-lg border-border bg-white/60 pl-9 shadow-none focus-visible:border-lux-teal focus-visible:ring-2 focus-visible:ring-lux-teal/20 dark:bg-white/5"
                            />
                        </div>
                        <DatePicker
                            value={date}
                            placeholder="Semua tanggal"
                            onChange={(v) => {
                                setDate(v);
                                apply({ date: v });
                            }}
                            className="h-10 w-full rounded-lg sm:w-44"
                        />
                        {(filters.search ||
                            filters.date ||
                            filters.group !== 'date') && (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={reset}
                                className="h-10"
                            >
                                Reset
                            </Button>
                        )}
                        <div className="flex items-center gap-2 sm:ml-auto">
                            <span className="text-xs text-muted-foreground">
                                Kelompokkan
                            </span>
                            <Select
                                value={group}
                                onValueChange={(v) => {
                                    setGroup(v);
                                    apply({ group: v });
                                }}
                            >
                                <SelectTrigger className="!h-9 w-36 rounded-lg border-border bg-white/60 text-sm shadow-none focus-visible:border-lux-teal focus-visible:ring-2 focus-visible:ring-lux-teal/20 dark:bg-white/5">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="date">Tanggal</SelectItem>
                                    <SelectItem value="member">
                                        Anggota
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                                    <th className="px-4 py-3 font-semibold">
                                        {byMember ? 'Tanggal' : 'Anggota'}
                                    </th>
                                    <th className="px-4 py-3 font-semibold">
                                        Kegiatan
                                    </th>
                                    <th className="px-4 py-3 font-semibold">
                                        Platform
                                    </th>
                                    <th className="px-4 py-3 text-right font-semibold">
                                        Jumlah
                                    </th>
                                    <th className="hidden px-4 py-3 font-semibold lg:table-cell">
                                        Periode target
                                    </th>
                                    <th className="px-4 py-3 font-semibold">
                                        Bukti
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {reports.data.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-4 py-16 text-center text-sm text-muted-foreground"
                                        >
                                            Tidak ada laporan yang cocok.
                                        </td>
                                    </tr>
                                ) : (
                                    groups.map((g) => (
                                        <GroupBlock
                                            key={g.key}
                                            group={g}
                                            byMember={byMember}
                                        />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* pagination footer */}
                    <div className="flex flex-col items-center justify-between gap-2 border-t border-border p-4 text-sm text-muted-foreground sm:flex-row">
                        <span>
                            Menampilkan {reports.from ?? 0}–{reports.to ?? 0} dari{' '}
                            {reports.total} entri
                        </span>
                        {reports.links.length > 3 && (
                            <div className="flex flex-wrap items-center gap-1">
                                {reports.links.map((link, i) => (
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
                                                : 'border border-border bg-white/60 hover:border-lux-teal hover:text-lux-teal-dark dark:bg-white/5'
                                        }`}
                                        dangerouslySetInnerHTML={{
                                            __html: link.label,
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

function GroupBlock({ group, byMember }: { group: Group; byMember: boolean }) {
    return (
        <>
            {/* group header */}
            <tr className="border-b border-border/60 bg-lux-teal/[0.06]">
                <td colSpan={6} className="px-4 py-2">
                    <div className="flex items-center gap-2">
                        {byMember ? (
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-lux-teal/15 text-[11px] font-semibold text-lux-teal-dark dark:text-lux-teal">
                                {initials(group.label)}
                            </span>
                        ) : (
                            <CalendarDays className="h-4 w-4 shrink-0 text-lux-teal-dark dark:text-lux-teal" />
                        )}
                        <span className="font-semibold capitalize">
                            {group.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            · {group.rows.length} entri
                        </span>
                        <span className="ml-auto rounded-md bg-lux-teal/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-lux-teal-dark dark:text-lux-teal">
                            +{group.total}
                        </span>
                    </div>
                </td>
            </tr>

            {/* group rows */}
            {group.rows.map((report) => (
                <tr
                    key={report.id}
                    className="border-b border-border/60 transition-colors last:border-0 hover:bg-white/40 dark:hover:bg-white/[0.04]"
                >
                    <td className="px-4 py-3 whitespace-nowrap">
                        {byMember ? (
                            <span className="text-muted-foreground">
                                {report.reported_on}
                            </span>
                        ) : (
                            <div className="flex items-center gap-3">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lux-teal/12 text-xs font-semibold text-lux-teal-dark dark:text-lux-teal">
                                    {initials(report.user)}
                                </span>
                                <span className="font-medium">
                                    {report.user ?? '—'}
                                </span>
                            </div>
                        )}
                    </td>
                    <td className="px-4 py-3">
                        {report.item_label ? (
                            <span className="font-medium">
                                {report.item_label}
                            </span>
                        ) : (
                            <span className="text-muted-foreground">—</span>
                        )}
                    </td>
                    <td className="px-4 py-3">{report.platform_label}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        {report.quantity}
                    </td>
                    <td className="hidden px-4 py-3 whitespace-nowrap text-muted-foreground lg:table-cell">
                        {report.target_range ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                        {report.post_url ? (
                            <a
                                href={report.post_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-lux-teal-dark hover:underline dark:text-lux-teal"
                            >
                                Lihat
                                <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                        ) : (
                            <span className="text-muted-foreground">—</span>
                        )}
                    </td>
                </tr>
            ))}
        </>
    );
}

TeamReports.layout = {
    breadcrumbs: [
        { title: 'Dasbor', href: dashboard() },
        { title: 'Laporan Harian', href: '/laporan' },
    ],
};
