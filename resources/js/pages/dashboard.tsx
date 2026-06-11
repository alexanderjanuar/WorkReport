import { Head, Link } from '@inertiajs/react';
import {
    Activity,
    ArrowRight,
    CalendarDays,
    CheckCircle2,
    Gauge,
    type LucideIcon,
    Target as TargetIcon,
    Users,
} from 'lucide-react';
import { PageHeader, primaryButtonClass } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { dashboard } from '@/routes';

type TargetRow = {
    id: number;
    assignee?: string | null;
    range_label: string;
    days: number;
    done: number;
    total: number;
    percent: number;
    overdue: boolean;
    ending_soon: boolean;
};

type ManagerRecent = {
    id: number;
    user: string | null;
    platform_label: string;
    quantity: number;
    reported_on: string;
};

type MemberRecent = {
    id: number;
    platform_label: string;
    quantity: number;
    reported_on: string;
    post_url: string | null;
};

type ManagerProps = {
    role: 'manager';
    userName: string;
    stats: { open: number; closed: number; members: number; today: number };
    attention: TargetRow[];
    recent: ManagerRecent[];
};

type MemberProps = {
    role: 'member';
    userName: string;
    stats: { open: number; avg: number; today: number };
    targets: TargetRow[];
    recent: MemberRecent[];
};

type Props = ManagerProps | MemberProps;

const dayChipClass: Record<string, string> = {
    teal: 'bg-lux-teal-light text-lux-teal-dark dark:bg-lux-teal/20 dark:text-lux-teal',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    rose: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
};

function initials(name: string | null | undefined): string {
    if (!name) return '—';
    return (
        name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((word) => word[0])
            .join('')
            .toUpperCase() || '—'
    );
}

function dayInfo(row: TargetRow): { text: string; tone: string } {
    if (row.overdue)
        return { text: `Lewat ${Math.abs(row.days)} hari`, tone: 'rose' };
    if (row.days === 0) return { text: 'Hari ini', tone: 'amber' };
    if (row.days === 1) return { text: 'Besok', tone: 'amber' };
    return {
        text: `${row.days} hari lagi`,
        tone: row.ending_soon ? 'amber' : 'teal',
    };
}

function StatCard({
    label,
    value,
    hint,
    icon: Icon,
}: {
    label: string;
    value: string | number;
    hint?: string;
    icon: LucideIcon;
}) {
    return (
        <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                    {label}
                </span>
                <span className="flex size-9 items-center justify-center rounded-lg bg-lux-teal/10 text-lux-teal-dark dark:text-lux-teal">
                    <Icon className="size-4" />
                </span>
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight tabular-nums">
                {value}
            </p>
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
    );
}

function DayChip({ row }: { row: TargetRow }) {
    const info = dayInfo(row);
    return (
        <span
            className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${dayChipClass[info.tone]}`}
        >
            {info.text}
        </span>
    );
}

function Avatar({ name, size = 'md' }: { name: string | null; size?: 'sm' | 'md' }) {
    return (
        <span
            className={`flex shrink-0 items-center justify-center rounded-xl bg-lux-teal/12 font-semibold text-lux-teal-dark dark:text-lux-teal ${
                size === 'sm' ? 'size-8 text-[11px]' : 'size-10 text-xs'
            }`}
        >
            {initials(name)}
        </span>
    );
}

function ProgressBar({ percent }: { percent: number }) {
    return (
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
                className="h-full rounded-full bg-gradient-to-r from-[#16c2ad] to-lux-teal-dark"
                style={{ width: `${percent}%` }}
            />
        </div>
    );
}

export default function Dashboard(props: Props) {
    const firstName = props.userName.split(' ')[0];

    return (
        <>
            <Head title="Dasbor" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    eyebrow="Dasbor"
                    title={`Selamat datang, ${firstName} 👋`}
                    description={
                        props.role === 'manager'
                            ? 'Ringkasan target dan progres seluruh tim.'
                            : 'Ringkasan target dan progres Anda.'
                    }
                    action={
                        props.role === 'manager' ? (
                            <Button
                                asChild
                                variant="outline"
                                className="w-fit gap-2 rounded-lg"
                            >
                                <Link href="/targets">
                                    <TargetIcon className="h-4 w-4" />
                                    Kelola Target
                                </Link>
                            </Button>
                        ) : (
                            <Button asChild className={`w-fit ${primaryButtonClass}`}>
                                <Link href="/reports">
                                    <Activity className="h-4 w-4" />
                                    Catat Progres
                                </Link>
                            </Button>
                        )
                    }
                />

                {props.role === 'manager' ? (
                    <>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <StatCard
                                label="Target Berjalan"
                                value={props.stats.open}
                                hint="Target aktif"
                                icon={TargetIcon}
                            />
                            <StatCard
                                label="Target Ditutup"
                                value={props.stats.closed}
                                hint="Sudah selesai/ditutup"
                                icon={CheckCircle2}
                            />
                            <StatCard
                                label="Anggota"
                                value={props.stats.members}
                                hint="Akun anggota"
                                icon={Users}
                            />
                            <StatCard
                                label="Progres Hari Ini"
                                value={props.stats.today}
                                hint="Aksi tercatat hari ini"
                                icon={Activity}
                            />
                        </div>

                        <div className="grid flex-1 gap-4 lg:grid-cols-2">
                            {/* attention */}
                            <section className="glass-card rounded-2xl p-5">
                                <div className="flex items-center justify-between">
                                    <h2 className="font-semibold tracking-tight">
                                        Perlu Perhatian
                                    </h2>
                                    <Link
                                        href="/targets"
                                        className="text-xs font-medium text-lux-teal-dark hover:underline dark:text-lux-teal"
                                    >
                                        Lihat semua
                                    </Link>
                                </div>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    Target berjalan yang mendekati atau melewati
                                    deadline.
                                </p>
                                <div className="mt-4 space-y-2">
                                    {props.attention.length === 0 ? (
                                        <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                                            Semua target masih dalam jalur. 🎉
                                        </p>
                                    ) : (
                                        props.attention.map((row) => (
                                            <Link
                                                key={row.id}
                                                href="/targets"
                                                className="flex items-center gap-3 rounded-xl border border-border/60 bg-white/30 p-3 transition-colors hover:border-lux-teal/40 hover:bg-white/50 dark:bg-white/[0.02]"
                                            >
                                                <Avatar name={row.assignee ?? null} />
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium">
                                                        {row.assignee ?? '—'}
                                                    </p>
                                                    <p className="truncate text-xs text-muted-foreground">
                                                        {row.range_label}
                                                    </p>
                                                </div>
                                                <div className="flex shrink-0 flex-col items-end gap-1">
                                                    <span className="text-sm font-semibold tabular-nums">
                                                        {row.percent}%
                                                    </span>
                                                    <DayChip row={row} />
                                                </div>
                                            </Link>
                                        ))
                                    )}
                                </div>
                            </section>

                            {/* recent */}
                            <section className="glass-card rounded-2xl p-5">
                                <h2 className="font-semibold tracking-tight">
                                    Aktivitas Terbaru
                                </h2>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    Progres harian terakhir dari anggota.
                                </p>
                                <div className="mt-4 space-y-1">
                                    {props.recent.length === 0 ? (
                                        <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                                            Belum ada aktivitas.
                                        </p>
                                    ) : (
                                        props.recent.map((r) => (
                                            <div
                                                key={r.id}
                                                className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-white/40 dark:hover:bg-white/[0.03]"
                                            >
                                                <Avatar name={r.user} size="sm" />
                                                <p className="min-w-0 flex-1 truncate">
                                                    <span className="font-medium">
                                                        {r.user ?? '—'}
                                                    </span>
                                                    <span className="text-muted-foreground">
                                                        {' '}
                                                        · {r.platform_label}
                                                    </span>
                                                </p>
                                                <span className="shrink-0 font-semibold tabular-nums text-lux-teal-dark dark:text-lux-teal">
                                                    +{r.quantity}
                                                </span>
                                                <span className="shrink-0 text-xs text-muted-foreground">
                                                    {r.reported_on}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </section>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="grid gap-4 sm:grid-cols-3">
                            <StatCard
                                label="Target Berjalan"
                                value={props.stats.open}
                                hint="Ditugaskan ke Anda"
                                icon={TargetIcon}
                            />
                            <StatCard
                                label="Rata-rata Progres"
                                value={`${props.stats.avg}%`}
                                hint="Dari target berjalan"
                                icon={Gauge}
                            />
                            <StatCard
                                label="Progres Hari Ini"
                                value={props.stats.today}
                                hint="Aksi tercatat hari ini"
                                icon={Activity}
                            />
                        </div>

                        <div className="grid flex-1 gap-4 lg:grid-cols-2">
                            {/* my targets */}
                            <section className="glass-card rounded-2xl p-5">
                                <div className="flex items-center justify-between">
                                    <h2 className="font-semibold tracking-tight">
                                        Target Saya
                                    </h2>
                                    <Link
                                        href="/reports"
                                        className="inline-flex items-center gap-1 text-xs font-medium text-lux-teal-dark hover:underline dark:text-lux-teal"
                                    >
                                        Catat progres
                                        <ArrowRight className="h-3 w-3" />
                                    </Link>
                                </div>
                                <div className="mt-4 space-y-3">
                                    {props.targets.length === 0 ? (
                                        <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                                            Belum ada target aktif untuk Anda.
                                        </p>
                                    ) : (
                                        props.targets.map((row) => (
                                            <Link
                                                key={row.id}
                                                href="/reports"
                                                className="block rounded-xl border border-border/60 bg-white/30 p-3 transition-colors hover:border-lux-teal/40 hover:bg-white/50 dark:bg-white/[0.02]"
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                        <CalendarDays className="size-3.5" />
                                                        {row.range_label}
                                                    </span>
                                                    <DayChip row={row} />
                                                </div>
                                                <div className="mt-2.5 flex items-center gap-2.5">
                                                    <ProgressBar
                                                        percent={row.percent}
                                                    />
                                                    <span className="shrink-0 text-xs font-semibold tabular-nums">
                                                        {row.done}/{row.total} ·{' '}
                                                        <span className="text-lux-teal-dark dark:text-lux-teal">
                                                            {row.percent}%
                                                        </span>
                                                    </span>
                                                </div>
                                            </Link>
                                        ))
                                    )}
                                </div>
                            </section>

                            {/* recent */}
                            <section className="glass-card rounded-2xl p-5">
                                <h2 className="font-semibold tracking-tight">
                                    Progres Terbaru
                                </h2>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    Catatan progres harian Anda.
                                </p>
                                <div className="mt-4 space-y-1">
                                    {props.recent.length === 0 ? (
                                        <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                                            Belum ada progres tercatat.
                                        </p>
                                    ) : (
                                        props.recent.map((r) => (
                                            <div
                                                key={r.id}
                                                className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm"
                                            >
                                                <span className="shrink-0 text-xs text-muted-foreground">
                                                    {r.reported_on}
                                                </span>
                                                <span className="min-w-0 flex-1 truncate font-medium">
                                                    {r.platform_label}
                                                </span>
                                                <span className="shrink-0 font-semibold tabular-nums text-lux-teal-dark dark:text-lux-teal">
                                                    +{r.quantity}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </section>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dasbor',
            href: dashboard(),
        },
    ],
};
