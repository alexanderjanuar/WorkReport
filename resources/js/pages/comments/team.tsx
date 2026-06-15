import { Head, router } from '@inertiajs/react';
import { ExternalLink, Search } from 'lucide-react';
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

type Option = { value: string; label: string };

type CommentRow = {
    id: number;
    commented_on: string;
    date_label: string;
    user: string | null;
    platform_label: string;
    post_url: string;
    proof_url: string | null;
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
    comments: Paginated<CommentRow>;
    platformOptions: Option[];
    filters: { search: string; platform: string; date: string };
};

const initials = (name: string | null) =>
    (name ?? '—').slice(0, 2).toUpperCase();

export default function TeamComments({
    comments,
    platformOptions,
    filters,
}: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const apply = (next: {
        search?: string;
        platform?: string;
        date?: string;
    }) => {
        router.get(
            '/komentar-tim',
            {
                search: (next.search ?? search) || undefined,
                platform: (next.platform ?? filters.platform) || undefined,
                date: (next.date ?? filters.date) || undefined,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const onSearch = (value: string) => {
        setSearch(value);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => apply({ search: value }), 300);
    };

    const hasFilter = filters.search || filters.platform || filters.date;

    return (
        <>
            <Head title="Komentar Tim" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    eyebrow="Distribusi"
                    title="Komentar Tim"
                    description="Semua komentar yang disebar anggota ke berbagai post."
                />

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
                        <Select
                            value={filters.platform || 'all'}
                            onValueChange={(v) =>
                                apply({ platform: v === 'all' ? '' : v })
                            }
                        >
                            <SelectTrigger className="!h-10 w-full rounded-lg border-border bg-white/60 text-sm shadow-none focus-visible:border-lux-teal focus-visible:ring-2 focus-visible:ring-lux-teal/20 sm:w-40 dark:bg-white/5">
                                <SelectValue placeholder="Semua platform" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    Semua platform
                                </SelectItem>
                                {platformOptions.map((o) => (
                                    <SelectItem key={o.value} value={o.value}>
                                        {o.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <DatePicker
                            value={filters.date}
                            placeholder="Semua tanggal"
                            onChange={(v) => apply({ date: v })}
                            className="h-10 w-full rounded-lg sm:w-44"
                        />
                        {hasFilter && (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                    setSearch('');
                                    router.get(
                                        '/komentar-tim',
                                        {},
                                        { preserveScroll: true },
                                    );
                                }}
                                className="h-10"
                            >
                                Reset
                            </Button>
                        )}
                        <span className="text-sm text-muted-foreground sm:ml-auto">
                            {comments.total} komentar
                        </span>
                    </div>

                    {/* table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                                    <th className="px-4 py-3 font-semibold">
                                        Tanggal
                                    </th>
                                    <th className="px-4 py-3 font-semibold">
                                        Anggota
                                    </th>
                                    <th className="px-4 py-3 font-semibold">
                                        Platform
                                    </th>
                                    <th className="px-4 py-3 font-semibold">
                                        Post
                                    </th>
                                    <th className="px-4 py-3 font-semibold">
                                        Bukti
                                    </th>
                                    <th className="hidden px-4 py-3 font-semibold lg:table-cell">
                                        Target
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {comments.data.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-4 py-16 text-center text-sm text-muted-foreground"
                                        >
                                            Tidak ada komentar yang cocok.
                                        </td>
                                    </tr>
                                ) : (
                                    comments.data.map((row) => (
                                        <tr
                                            key={row.id}
                                            className="border-b border-border/60 transition-colors last:border-0 hover:bg-white/40 dark:hover:bg-white/[0.04]"
                                        >
                                            <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                                                {row.commented_on}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lux-teal/12 text-xs font-semibold text-lux-teal-dark dark:text-lux-teal">
                                                        {initials(row.user)}
                                                    </span>
                                                    <span className="font-medium">
                                                        {row.user ?? '—'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {row.platform_label}
                                            </td>
                                            <td className="px-4 py-3">
                                                <a
                                                    href={row.post_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-lux-teal-dark hover:underline dark:text-lux-teal"
                                                >
                                                    Lihat post
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                </a>
                                            </td>
                                            <td className="px-4 py-3">
                                                {row.proof_url ? (
                                                    <a
                                                        href={row.proof_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                                                    >
                                                        Bukti
                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                    </a>
                                                ) : (
                                                    <span className="text-muted-foreground">
                                                        —
                                                    </span>
                                                )}
                                            </td>
                                            <td className="hidden px-4 py-3 whitespace-nowrap text-muted-foreground lg:table-cell">
                                                {row.target_range ?? '—'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* pagination */}
                    <div className="flex flex-col items-center justify-between gap-2 border-t border-border p-4 text-sm text-muted-foreground sm:flex-row">
                        <span>
                            Menampilkan {comments.from ?? 0}–{comments.to ?? 0}{' '}
                            dari {comments.total} komentar
                        </span>
                        {comments.links.length > 3 && (
                            <div className="flex flex-wrap items-center gap-1">
                                {comments.links.map((link, i) => (
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

TeamComments.layout = {
    breadcrumbs: [
        { title: 'Dasbor', href: dashboard() },
        { title: 'Komentar Tim', href: '/komentar-tim' },
    ],
};
