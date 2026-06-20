import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    AtSign,
    CalendarClock,
    ExternalLink,
    Hash,
    MessageSquare,
    Pencil,
    RefreshCw,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { dashboard } from '@/routes';

type Media = {
    id: number;
    name: string;
    platform: string;
    platform_label: string;
    followers: number | null;
    logo_url: string | null;
    url: string | null;
    note: string | null;
};

type Stats = {
    comments_count: number;
    total_quantity: number;
    contributors: number;
    last_activity: string | null;
};

type MemberRow = {
    user: string;
    comments_count: number;
    total_quantity: number;
    last_date: string | null;
};

type CommentRow = {
    id: number;
    commented_on: string;
    user: string | null;
    platform_label: string;
    quantity: number;
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
    media: Media;
    stats: Stats;
    byMember: MemberRow[];
    comments: Paginated<CommentRow>;
};

const initials = (name: string | null) =>
    (name ?? '—').slice(0, 2).toUpperCase();

const formatFollowers = (n: number | null): string => {
    if (n == null) return '—';
    if (n >= 1_000_000)
        return (n / 1_000_000).toFixed(1).replace('.', ',') + ' jt';
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace('.', ',') + ' rb';
    return n.toLocaleString('id-ID');
};

function StatCard({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof Hash;
    label: string;
    value: string | number;
}) {
    return (
        <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                <Icon className="h-4 w-4 text-lux-teal-dark dark:text-lux-teal" />
                {label}
            </div>
            <div className="mt-2 text-2xl font-semibold tabular-nums">
                {value}
            </div>
        </div>
    );
}

export default function MediaShow({ media, stats, byMember, comments }: Props) {
    const [resyncing, setResyncing] = useState(false);
    const canResync = media.platform === 'instagram' && !!media.url;

    const resync = () => {
        router.post(
            `/media/${media.id}/resync`,
            {},
            {
                preserveScroll: true,
                onStart: () => setResyncing(true),
                onFinish: () => setResyncing(false),
                onSuccess: () =>
                    toast.success('Follower & foto profil diperbarui.'),
                onError: (errors) =>
                    toast.error(errors.resync ?? 'Gagal melakukan resync.'),
            },
        );
    };

    return (
        <>
            <Head title={media.name} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <Link
                    href="/media"
                    className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-lux-teal-dark dark:hover:text-lux-teal"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Kembali ke Media
                </Link>

                {/* profile hero */}
                <div className="glass-card rounded-2xl p-5 sm:p-6">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                        {media.logo_url ? (
                            <img
                                src={media.logo_url}
                                alt={media.name}
                                className="h-20 w-20 shrink-0 rounded-2xl object-cover ring-1 ring-border"
                            />
                        ) : (
                            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-lux-teal/12 text-lux-teal-dark dark:text-lux-teal">
                                <AtSign className="h-9 w-9" />
                            </span>
                        )}

                        <div className="min-w-0 flex-1">
                            <span className="inline-flex items-center rounded-full bg-lux-teal/12 px-2.5 py-0.5 text-xs font-medium text-lux-teal-dark dark:text-lux-teal">
                                {media.platform_label}
                            </span>
                            <h1 className="mt-1.5 truncate text-2xl font-semibold">
                                {media.name}
                            </h1>
                            {media.url ? (
                                <a
                                    href={media.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-lux-teal-dark hover:underline dark:hover:text-lux-teal"
                                >
                                    {media.url.replace(/^https?:\/\//, '')}
                                    <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                            ) : null}
                            {media.note ? (
                                <p className="mt-2 max-w-prose text-sm text-foreground/70">
                                    {media.note}
                                </p>
                            ) : null}
                        </div>

                        <div className="flex items-center gap-4 sm:flex-col sm:items-end">
                            <div className="text-right">
                                <div className="text-2xl font-semibold tabular-nums">
                                    {formatFollowers(media.followers)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    follower
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {canResync ? (
                                    <Button
                                        variant="outline"
                                        onClick={resync}
                                        disabled={resyncing}
                                        className="gap-1.5 rounded-xl"
                                        title="Tarik ulang follower & foto dari Instagram"
                                    >
                                        {resyncing ? (
                                            <Spinner />
                                        ) : (
                                            <RefreshCw className="h-4 w-4" />
                                        )}
                                        {resyncing ? 'Menyinkron…' : 'Resync'}
                                    </Button>
                                ) : null}
                                <Link href={`/media`}>
                                    <Button
                                        variant="outline"
                                        className="gap-1.5 rounded-xl"
                                    >
                                        <Pencil className="h-4 w-4" />
                                        Kelola
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* stats */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <StatCard
                        icon={MessageSquare}
                        label="Total Komentar"
                        value={stats.comments_count}
                    />
                    <StatCard
                        icon={Hash}
                        label="Jumlah Komentar"
                        value={stats.total_quantity.toLocaleString('id-ID')}
                    />
                    <StatCard
                        icon={Users}
                        label="Kontributor"
                        value={stats.contributors}
                    />
                    <StatCard
                        icon={CalendarClock}
                        label="Aktivitas Terakhir"
                        value={stats.last_activity ?? '—'}
                    />
                </div>

                {/* per-member contribution */}
                <div className="glass-card overflow-hidden rounded-2xl">
                    <div className="border-b border-border px-5 py-3.5">
                        <h2 className="text-sm font-semibold">
                            Kontribusi Anggota
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                                    <th className="px-5 py-3 font-semibold">
                                        Anggota
                                    </th>
                                    <th className="px-5 py-3 text-right font-semibold">
                                        Komentar
                                    </th>
                                    <th className="px-5 py-3 text-right font-semibold">
                                        Jumlah
                                    </th>
                                    <th className="hidden px-5 py-3 font-semibold sm:table-cell">
                                        Terakhir
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {byMember.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="px-5 py-10 text-center text-sm text-muted-foreground"
                                        >
                                            Belum ada kontribusi.
                                        </td>
                                    </tr>
                                ) : (
                                    byMember.map((row, i) => (
                                        <tr
                                            key={i}
                                            className="border-b border-border/60 transition-colors last:border-0 hover:bg-white/40 dark:hover:bg-white/[0.04]"
                                        >
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lux-teal/12 text-xs font-semibold text-lux-teal-dark dark:text-lux-teal">
                                                        {initials(row.user)}
                                                    </span>
                                                    <span className="font-medium">
                                                        {row.user}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">
                                                {row.comments_count}
                                            </td>
                                            <td className="px-5 py-3 text-right font-semibold tabular-nums">
                                                {row.total_quantity.toLocaleString(
                                                    'id-ID',
                                                )}
                                            </td>
                                            <td className="hidden px-5 py-3 whitespace-nowrap text-muted-foreground sm:table-cell">
                                                {row.last_date ?? '—'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* comments list */}
                <div className="glass-card overflow-hidden rounded-2xl">
                    <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                        <h2 className="text-sm font-semibold">Daftar Komentar</h2>
                        <span className="text-sm text-muted-foreground">
                            {comments.total} komentar
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                                    <th className="px-5 py-3 font-semibold">
                                        Tanggal
                                    </th>
                                    <th className="px-5 py-3 font-semibold">
                                        Anggota
                                    </th>
                                    <th className="px-5 py-3 font-semibold">
                                        Platform
                                    </th>
                                    <th className="px-5 py-3 text-right font-semibold">
                                        Jumlah
                                    </th>
                                    <th className="px-5 py-3 font-semibold">
                                        Post
                                    </th>
                                    <th className="px-5 py-3 font-semibold">
                                        Bukti
                                    </th>
                                    <th className="hidden px-5 py-3 font-semibold lg:table-cell">
                                        Target
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {comments.data.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-5 py-16 text-center text-sm text-muted-foreground"
                                        >
                                            Belum ada komentar untuk media ini.
                                        </td>
                                    </tr>
                                ) : (
                                    comments.data.map((row) => (
                                        <tr
                                            key={row.id}
                                            className="border-b border-border/60 transition-colors last:border-0 hover:bg-white/40 dark:hover:bg-white/[0.04]"
                                        >
                                            <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">
                                                {row.commented_on}
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lux-teal/12 text-xs font-semibold text-lux-teal-dark dark:text-lux-teal">
                                                        {initials(row.user)}
                                                    </span>
                                                    <span className="font-medium">
                                                        {row.user ?? '—'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                {row.platform_label}
                                            </td>
                                            <td className="px-5 py-3 text-right font-semibold tabular-nums">
                                                {row.quantity}
                                            </td>
                                            <td className="px-5 py-3">
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
                                            <td className="px-5 py-3">
                                                {row.proof_url ? (
                                                    <a
                                                        href={row.proof_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        title="Lihat bukti"
                                                    >
                                                        <img
                                                            src={row.proof_url}
                                                            alt="Bukti"
                                                            className="h-9 w-9 rounded-md object-cover ring-1 ring-border transition hover:ring-lux-teal"
                                                        />
                                                    </a>
                                                ) : (
                                                    <span className="text-muted-foreground">
                                                        —
                                                    </span>
                                                )}
                                            </td>
                                            <td className="hidden px-5 py-3 whitespace-nowrap text-muted-foreground lg:table-cell">
                                                {row.target_range ?? '—'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* pagination */}
                    {comments.links.length > 3 && (
                        <div className="flex flex-col items-center justify-between gap-2 border-t border-border p-4 text-sm text-muted-foreground sm:flex-row">
                            <span>
                                Menampilkan {comments.from ?? 0}–
                                {comments.to ?? 0} dari {comments.total} komentar
                            </span>
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
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

MediaShow.layout = {
    breadcrumbs: [
        { title: 'Dasbor', href: dashboard() },
        { title: 'Media', href: '/media' },
        { title: 'Detail', href: '#' },
    ],
};
