import { Head, router, useForm } from '@inertiajs/react';
import {
    CalendarDays,
    CheckCircle2,
    Clock,
    Lock,
    Pencil,
    Plus,
    TriangleAlert,
    Trophy,
    Trash2,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import InputError from '@/components/input-error';
import { PageHeader, primaryButtonClass } from '@/components/page-header';
import { Scrollable } from '@/components/scrollable';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { dashboard } from '@/routes';

type AssigneeOption = { value: number; label: string };

type ItemRow = {
    id: number;
    label: string;
    quantity: number | null;
    is_done: boolean;
};

type TargetRow = {
    id: number;
    user_id: number;
    assignee: string | null;
    creator: string | null;
    start_date: string;
    end_date: string;
    range_label: string;
    status: string;
    status_label: string;
    close_reason: string | null;
    note: string | null;
    done: number;
    total: number;
    percent: number;
    items: ItemRow[];
};

type GroupView = {
    key: string;
    label: string;
    range?: string;
    current?: boolean;
    items: TargetRow[];
};

type Filters = {
    status: string;
    assignee: number | '';
    group: string;
    period: string;
    from: string;
    to: string;
    range_label: string;
};

type Props = {
    targets: TargetRow[];
    assigneeOptions: AssigneeOption[];
    filters: Filters;
};

type FormItem = { id?: number; label: string; quantity: number | '' };
type FormData = {
    user_id: number;
    start_date: string;
    end_date: string;
    note: string;
    items: FormItem[];
};

const labelClasses = 'text-sm font-medium text-foreground/80';
const fieldClasses =
    'h-11 rounded-xl border-border bg-white/60 text-sm shadow-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-lux-teal focus-visible:ring-2 focus-visible:ring-lux-teal/20 dark:bg-white/5';
const selectClasses =
    '!h-11 w-full rounded-xl border-border bg-white/60 text-sm shadow-none focus-visible:border-lux-teal focus-visible:ring-2 focus-visible:ring-lux-teal/20 dark:bg-white/5';
const filterSelectClasses =
    '!h-9 rounded-lg border-border bg-white/60 text-sm shadow-none focus-visible:border-lux-teal focus-visible:ring-2 focus-visible:ring-lux-teal/20 dark:bg-white/5';
const textareaClasses =
    'min-h-20 rounded-xl border-border bg-white/60 text-sm shadow-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-lux-teal focus-visible:ring-2 focus-visible:ring-lux-teal/20 dark:bg-white/5';
const checkboxClasses =
    'mt-0.5 size-5 rounded-md data-[state=checked]:border-lux-teal data-[state=checked]:bg-lux-teal';

const daysChipClass: Record<string, string> = {
    teal: 'bg-lux-teal-light text-lux-teal-dark dark:bg-lux-teal/20 dark:text-lux-teal',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    rose: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
};

const ID_MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

const pad2 = (n: number) => String(n).padStart(2, '0');
const toISO = (d: Date) =>
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

function todayISO(): string {
    return toISO(new Date());
}

/** Monday (local midnight) of the week containing the given YYYY-MM-DD. */
function mondayOf(iso: string): Date {
    const d = new Date(`${iso}T00:00:00`);
    const dow = (d.getDay() + 6) % 7; // Mon = 0 … Sun = 6
    d.setDate(d.getDate() - dow);
    return d;
}

/** "Minggu N" label + date range for the week starting on `monday`. */
function weekMeta(monday: Date): { num: number; range: string } {
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const num = Math.ceil(monday.getDate() / 7);
    const range =
        monday.getMonth() === sunday.getMonth()
            ? `${monday.getDate()} – ${sunday.getDate()} ${ID_MONTHS[sunday.getMonth()]} ${sunday.getFullYear()}`
            : `${monday.getDate()} ${ID_MONTHS[monday.getMonth()]} – ${sunday.getDate()} ${ID_MONTHS[sunday.getMonth()]} ${sunday.getFullYear()}`;
    return { num, range };
}

function initials(name: string | null): string {
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

function daysLeftInfo(endDate: string, isOpen: boolean) {
    if (!isOpen) return null;
    const end = new Date(`${endDate}T00:00:00`);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = Math.round((end.getTime() - today.getTime()) / 86_400_000);
    if (diff > 1) return { label: `${diff} hari lagi`, tone: 'teal' as const };
    if (diff === 1) return { label: 'Berakhir besok', tone: 'amber' as const };
    if (diff === 0)
        return { label: 'Berakhir hari ini', tone: 'amber' as const };
    return { label: `Lewat ${Math.abs(diff)} hari`, tone: 'rose' as const };
}

type StateKey = 'achieved' | 'overdue' | 'open' | 'closed';

type StateStyle = {
    label: string;
    pill: string; // status pill bg/text
    dot: string; // status pill leading dot
    ring: string; // progress ring stroke
    text: string; // progress ring center text
    accent: string; // top accent bar gradient mid-color ('' = none)
    card: string; // extra classes for the whole card
};

const stateStyles: Record<StateKey, StateStyle> = {
    achieved: {
        label: 'Tercapai',
        pill: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
        dot: 'bg-emerald-500',
        ring: 'stroke-emerald-500',
        text: 'text-emerald-600 dark:text-emerald-400',
        accent: 'via-emerald-400',
        card: 'ring-1 ring-emerald-500/30 bg-emerald-500/[0.035]',
    },
    overdue: {
        label: 'Terlambat',
        pill: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
        dot: 'bg-rose-500',
        ring: 'stroke-rose-500',
        text: 'text-rose-600 dark:text-rose-400',
        accent: 'via-rose-400',
        card: 'ring-1 ring-rose-500/20',
    },
    open: {
        label: 'Berjalan',
        pill: 'bg-lux-teal-light text-lux-teal-dark dark:bg-lux-teal/20 dark:text-lux-teal',
        dot: 'bg-lux-teal',
        ring: 'stroke-lux-teal',
        text: 'text-foreground',
        accent: 'via-lux-teal',
        card: '',
    },
    closed: {
        label: 'Ditutup',
        pill: 'bg-muted text-muted-foreground',
        dot: 'bg-muted-foreground/50',
        ring: 'stroke-muted-foreground/40',
        text: 'text-muted-foreground',
        accent: '',
        card: '',
    },
};

/** Derive a clear visual state from a target's progress + status + deadline. */
function statusInfo(target: TargetRow): StateStyle & { key: StateKey } {
    const achieved = target.total > 0 && target.percent === 100;
    let key: StateKey;
    if (achieved) {
        key = 'achieved';
    } else if (target.status !== 'open') {
        key = 'closed';
    } else {
        const days = daysLeftInfo(target.end_date, true);
        key = days?.tone === 'rose' ? 'overdue' : 'open';
    }
    return { key, ...stateStyles[key] };
}

function ProgressRing({
    percent,
    ring,
    text,
    achieved,
}: {
    percent: number;
    ring: string;
    text: string;
    achieved: boolean;
}) {
    const radius = 15.5;
    const circumference = 2 * Math.PI * radius;
    return (
        <div className="relative grid size-16 shrink-0 place-items-center">
            <svg viewBox="0 0 36 36" className="size-16 -rotate-90">
                <circle
                    cx="18"
                    cy="18"
                    r={radius}
                    fill="none"
                    strokeWidth="3"
                    className="stroke-muted"
                />
                <circle
                    cx="18"
                    cy="18"
                    r={radius}
                    fill="none"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - percent / 100)}
                    className={`${ring} transition-[stroke-dashoffset] duration-500`}
                />
            </svg>
            {achieved ? (
                <CheckCircle2 className={`absolute size-6 ${text}`} />
            ) : (
                <span className={`absolute text-sm font-bold tabular-nums ${text}`}>
                    {percent}%
                </span>
            )}
        </div>
    );
}

export default function TargetsIndex({
    targets,
    assigneeOptions,
    filters,
}: Props) {
    const today = new Date().toISOString().slice(0, 10);
    const [createOpen, setCreateOpen] = useState(false);
    const [editing, setEditing] = useState<TargetRow | null>(null);
    const [closing, setClosing] = useState<TargetRow | null>(null);
    const [deleting, setDeleting] = useState<TargetRow | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const newItem = (): FormItem => ({ label: '', quantity: '' });

    const emptyForm = (): FormData => ({
        user_id: assigneeOptions[0]?.value ?? 0,
        start_date: today,
        end_date: today,
        note: '',
        items: [newItem()],
    });

    const createForm = useForm<FormData>(emptyForm());
    const editForm = useForm<FormData>(emptyForm());
    const closeForm = useForm<{ close_reason: string }>({ close_reason: '' });

    const err = (form: typeof createForm, key: string) =>
        (form.errors as Record<string, string>)[key];

    const applyFilters = (patch: Record<string, string>) => {
        const next = {
            status: filters.status,
            assignee: filters.assignee ? String(filters.assignee) : '',
            group: filters.group,
            period: filters.period,
            from: filters.from,
            to: filters.to,
            ...patch,
        };
        router.get(
            '/targets',
            {
                status: next.status || undefined,
                assignee: next.assignee || undefined,
                group:
                    next.group && next.group !== 'week'
                        ? next.group
                        : undefined,
                period:
                    next.period && next.period !== 'all'
                        ? next.period
                        : undefined,
                from: next.period === 'custom' ? next.from || undefined : undefined,
                to: next.period === 'custom' ? next.to || undefined : undefined,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const setFilter = (key: keyof Filters, value: string) =>
        applyFilters({ [key]: value });

    const groups = useMemo<GroupView[]>(() => {
        // Group by week-of-month; currently-running targets float into the
        // current week so it lands at the very top ("Minggu ini").
        if (filters.group === 'week') {
            const today = todayISO();
            const currentKey = toISO(mondayOf(today));
            const map = new Map<string, GroupView & { monday: number }>();

            for (const target of targets) {
                const active =
                    target.status === 'open' &&
                    target.start_date <= today &&
                    today <= target.end_date;
                const monday = active
                    ? mondayOf(today)
                    : mondayOf(target.start_date);
                const key = toISO(monday);

                let g = map.get(key);
                if (!g) {
                    const meta = weekMeta(monday);
                    g = {
                        key,
                        label: `Minggu ${meta.num}`,
                        range: meta.range,
                        current: key === currentKey,
                        monday: monday.getTime(),
                        items: [],
                    };
                    map.set(key, g);
                }
                g.items.push(target);
            }

            return [...map.values()]
                .sort((a, b) => {
                    if (a.key === currentKey) return -1;
                    if (b.key === currentKey) return 1;
                    return b.monday - a.monday; // newest week first
                })
                .map((g) => ({
                    key: g.key,
                    label: g.label,
                    range: g.range,
                    current: g.current,
                    items: g.items,
                }));
        }

        if (filters.group === 'none') {
            return [{ key: 'all', label: '', items: targets }];
        }

        const map = new Map<string, TargetRow[]>();
        for (const target of targets) {
            const key =
                filters.group === 'assignee'
                    ? (target.assignee ?? '—')
                    : target.status_label;
            const list = map.get(key) ?? [];
            list.push(target);
            map.set(key, list);
        }
        return [...map.entries()].map(([key, items]) => ({
            key,
            label: key,
            items,
        }));
    }, [targets, filters.group]);

    const addItem = (form: typeof createForm) =>
        form.setData('items', [...form.data.items, newItem()]);
    const removeItem = (form: typeof createForm, idx: number) =>
        form.setData(
            'items',
            form.data.items.filter((_, i) => i !== idx),
        );
    const setItemField = (
        form: typeof createForm,
        idx: number,
        field: keyof FormItem,
        value: string | number,
    ) =>
        form.setData(
            'items',
            form.data.items.map((it, i) =>
                i === idx ? { ...it, [field]: value } : it,
            ),
        );

    const openCreate = () => {
        createForm.clearErrors();
        createForm.setData(emptyForm());
        setCreateOpen(true);
    };

    const submitCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post('/targets', {
            preserveScroll: true,
            onSuccess: () => {
                setCreateOpen(false);
                createForm.reset();
            },
        });
    };

    const openEdit = (target: TargetRow) => {
        editForm.clearErrors();
        editForm.setData({
            user_id: target.user_id,
            start_date: target.start_date,
            end_date: target.end_date,
            note: target.note ?? '',
            items: target.items.map((it) => ({
                id: it.id,
                label: it.label,
                quantity: it.quantity ?? '',
            })),
        });
        setEditing(target);
    };

    const submitEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editing) return;
        editForm.patch(`/targets/${editing.id}`, {
            preserveScroll: true,
            onSuccess: () => setEditing(null),
        });
    };

    const openClose = (target: TargetRow) => {
        closeForm.clearErrors();
        closeForm.setData('close_reason', '');
        setClosing(target);
    };

    const submitClose = (e: React.FormEvent) => {
        e.preventDefault();
        if (!closing) return;
        closeForm.post(`/targets/${closing.id}/close`, {
            preserveScroll: true,
            onSuccess: () => setClosing(null),
        });
    };

    const confirmDelete = () => {
        if (!deleting) return;
        setIsDeleting(true);
        router.delete(`/targets/${deleting.id}`, {
            preserveScroll: true,
            onFinish: () => setIsDeleting(false),
            onSuccess: () => setDeleting(null),
        });
    };

    const toggleItem = (itemId: number) => {
        router.patch(
            `/target-items/${itemId}/toggle`,
            {},
            { preserveScroll: true, preserveState: true },
        );
    };

    const renderFields = (form: typeof createForm, prefix: string) => (
        <>
            <div className="grid gap-2">
                <Label htmlFor={`${prefix}-assignee`} className={labelClasses}>
                    Anggota
                </Label>
                <Select
                    value={String(form.data.user_id)}
                    onValueChange={(v) => form.setData('user_id', Number(v))}
                >
                    <SelectTrigger
                        id={`${prefix}-assignee`}
                        className={selectClasses}
                    >
                        <SelectValue placeholder="Pilih anggota" />
                    </SelectTrigger>
                    <SelectContent>
                        {assigneeOptions.map((o) => (
                            <SelectItem key={o.value} value={String(o.value)}>
                                {o.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <InputError message={err(form, 'user_id')} />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                    <Label htmlFor={`${prefix}-start`} className={labelClasses}>
                        Mulai
                    </Label>
                    <DatePicker
                        id={`${prefix}-start`}
                        value={form.data.start_date}
                        onChange={(v) => form.setData('start_date', v)}
                    />
                    <InputError message={err(form, 'start_date')} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor={`${prefix}-end`} className={labelClasses}>
                        Selesai
                    </Label>
                    <DatePicker
                        id={`${prefix}-end`}
                        value={form.data.end_date}
                        min={form.data.start_date || undefined}
                        onChange={(v) => form.setData('end_date', v)}
                    />
                    <InputError message={err(form, 'end_date')} />
                </div>
            </div>

            {/* free-text checklist items (name + quantity) */}
            <div className="grid gap-2">
                <Label className={labelClasses}>Item target (checklist)</Label>
                <div className="grid grid-cols-[1fr_5.5rem_2.75rem] gap-2 px-0.5 text-xs font-medium text-muted-foreground">
                    <span>Nama item</span>
                    <span>Jumlah</span>
                    <span />
                </div>
                <div className="space-y-2">
                    {form.data.items.map((item, idx) => (
                        <div
                            key={idx}
                            className="grid grid-cols-[1fr_5.5rem_2.75rem] items-start gap-2"
                        >
                            <div className="grid gap-1">
                                <Input
                                    value={item.label}
                                    onChange={(e) =>
                                        setItemField(
                                            form,
                                            idx,
                                            'label',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="mis. Buat akun Instagram"
                                    className={fieldClasses}
                                />
                                <InputError
                                    message={err(form, `items.${idx}.label`)}
                                />
                            </div>
                            <div className="grid gap-1">
                                <Input
                                    type="number"
                                    min={1}
                                    value={item.quantity}
                                    onChange={(e) =>
                                        setItemField(
                                            form,
                                            idx,
                                            'quantity',
                                            e.target.value === ''
                                                ? ''
                                                : Number(e.target.value),
                                        )
                                    }
                                    placeholder="Jml"
                                    className={fieldClasses}
                                />
                                <InputError
                                    message={err(form, `items.${idx}.quantity`)}
                                />
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-11 w-11 shrink-0 rounded-xl text-muted-foreground hover:text-destructive"
                                onClick={() => removeItem(form, idx)}
                                disabled={form.data.items.length === 1}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit gap-1.5 rounded-lg"
                    onClick={() => addItem(form)}
                >
                    <Plus className="h-3.5 w-3.5" />
                    Tambah item
                </Button>
                <InputError message={err(form, 'items')} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor={`${prefix}-note`} className={labelClasses}>
                    Catatan{' '}
                    <span className="font-normal text-muted-foreground">
                        (opsional)
                    </span>
                </Label>
                <Textarea
                    id={`${prefix}-note`}
                    value={form.data.note}
                    onChange={(e) => form.setData('note', e.target.value)}
                    rows={2}
                    placeholder="Instruksi tambahan untuk anggota..."
                    className={textareaClasses}
                />
                <InputError message={err(form, 'note')} />
            </div>
        </>
    );

    const renderCard = (target: TargetRow) => {
        const isOpen = target.status === 'open';
        const st = statusInfo(target);
        const days =
            st.key === 'achieved'
                ? null
                : daysLeftInfo(target.end_date, isOpen);

        return (
            <div
                key={target.id}
                className={`glass-card relative flex flex-col overflow-hidden rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl ${st.card}`}
            >
                {st.accent && (
                    <span
                        className={`pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent ${st.accent} to-transparent opacity-70`}
                    />
                )}

                {/* identity */}
                <div className="flex items-start gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-lux-teal/20 to-lux-teal/5 text-sm font-bold text-lux-teal-dark ring-1 ring-lux-teal/15 dark:text-lux-teal">
                        {initials(target.assignee)}
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold tracking-tight">
                            {target.assignee ?? '—'}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                            Ditugaskan oleh {target.creator ?? '—'}
                        </p>
                    </div>
                    <span
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${st.pill}`}
                    >
                        {st.key === 'achieved' ? (
                            <CheckCircle2 className="size-3.5" />
                        ) : st.key === 'overdue' ? (
                            <TriangleAlert className="size-3.5" />
                        ) : (
                            <span
                                className={`size-1.5 rounded-full ${st.dot}`}
                            />
                        )}
                        {st.label}
                    </span>
                </div>

                {/* focal: progress ring + meta */}
                <div className="mt-3 flex items-center gap-4 rounded-xl bg-white/40 p-3 dark:bg-white/[0.03]">
                    <ProgressRing
                        percent={target.percent}
                        ring={st.ring}
                        text={st.text}
                        achieved={st.key === 'achieved'}
                    />
                    <div className="min-w-0 flex-1 space-y-1.5">
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <CalendarDays className="size-3.5 shrink-0" />
                            {target.range_label}
                        </p>
                        {st.key === 'achieved' ? (
                            <p className="flex items-center gap-1 text-sm font-semibold tracking-tight text-emerald-600 dark:text-emerald-400">
                                <Trophy className="size-3.5 shrink-0" />
                                Semua item selesai
                            </p>
                        ) : (
                            <p className="text-sm font-semibold tracking-tight">
                                {target.done}
                                <span className="text-muted-foreground">
                                    /{target.total}
                                </span>{' '}
                                item selesai
                            </p>
                        )}
                        {days && (
                            <span
                                className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${daysChipClass[days.tone]}`}
                            >
                                <Clock className="size-3" />
                                {days.label}
                            </span>
                        )}
                    </div>
                </div>

                {/* checklist — fixed height for consistent, compact cards */}
                <div className="mt-3">
                    <Scrollable className="h-28 space-y-0.5 pr-1">
                        {target.items.map((item) => (
                            <label
                                key={item.id}
                                className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted/50"
                            >
                                <Checkbox
                                    checked={item.is_done}
                                    onCheckedChange={() => toggleItem(item.id)}
                                    className={checkboxClasses}
                                />
                                <span
                                    className={`flex-1 ${
                                        item.is_done
                                            ? 'text-muted-foreground line-through'
                                            : ''
                                    }`}
                                >
                                    {item.label}
                                </span>
                                {item.quantity != null && (
                                    <span className="mt-px shrink-0 rounded-md bg-lux-teal/10 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-lux-teal-dark dark:text-lux-teal">
                                        {item.quantity}
                                    </span>
                                )}
                            </label>
                        ))}
                    </Scrollable>
                </div>

                {target.note && (
                    <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
                        {target.note}
                    </p>
                )}
                {target.close_reason && (
                    <p className="mt-3 line-clamp-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                            Alasan ditutup:
                        </span>{' '}
                        {target.close_reason}
                    </p>
                )}

                {/* footer */}
                <div className="mt-auto flex items-center justify-end gap-1.5 border-t border-border/60 pt-4">
                    {isOpen && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 rounded-lg"
                                onClick={() => openClose(target)}
                            >
                                <Lock className="h-3.5 w-3.5" />
                                Tutup
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-lg"
                                onClick={() => openEdit(target)}
                                title="Ubah"
                            >
                                <Pencil className="h-3.5 w-3.5" />
                                <span className="sr-only">Ubah</span>
                            </Button>
                        </>
                    )}
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeleting(target)}
                        title="Hapus"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="sr-only">Hapus</span>
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <>
            <Head title="Kelola Target" />

            <div className="px-4 py-6 sm:px-6">
                <PageHeader
                    eyebrow="Manajemen Target"
                    title="Kelola Target"
                    description="Tetapkan target per anggota dengan rentang waktu dan daftar item. Centang tiap item saat selesai."
                    action={
                        <Button
                            onClick={openCreate}
                            className={`w-fit ${primaryButtonClass}`}
                        >
                            <Plus className="h-4 w-4" />
                            Tambah Target
                        </Button>
                    }
                />

                {/* filters + group by */}
                <div className="mt-6 flex flex-wrap items-center gap-2">
                    <Select
                        value={filters.status || 'all'}
                        onValueChange={(v) =>
                            setFilter('status', v === 'all' ? '' : v)
                        }
                    >
                        <SelectTrigger className={`${filterSelectClasses} w-40`}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua status</SelectItem>
                            <SelectItem value="open">Berjalan</SelectItem>
                            <SelectItem value="closed">Ditutup</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select
                        value={filters.assignee ? String(filters.assignee) : 'all'}
                        onValueChange={(v) =>
                            setFilter('assignee', v === 'all' ? '' : v)
                        }
                    >
                        <SelectTrigger className={`${filterSelectClasses} w-48`}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua anggota</SelectItem>
                            {assigneeOptions.map((o) => (
                                <SelectItem key={o.value} value={String(o.value)}>
                                    {o.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* period preset filter */}
                    <Select
                        value={filters.period || 'all'}
                        onValueChange={(v) =>
                            applyFilters({
                                period: v,
                                from: v === 'custom' ? filters.from : '',
                                to: v === 'custom' ? filters.to : '',
                            })
                        }
                    >
                        <SelectTrigger className={`${filterSelectClasses} w-40`}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua waktu</SelectItem>
                            <SelectItem value="today">Hari ini</SelectItem>
                            <SelectItem value="week">Minggu ini</SelectItem>
                            <SelectItem value="month">Bulan ini</SelectItem>
                            <SelectItem value="last_month">Bulan lalu</SelectItem>
                            <SelectItem value="custom">Kustom…</SelectItem>
                        </SelectContent>
                    </Select>

                    {filters.period === 'custom' && (
                        <>
                            <DatePicker
                                value={filters.from}
                                placeholder="Dari"
                                onChange={(v) => applyFilters({ from: v })}
                                className="h-9 w-36 rounded-lg"
                            />
                            <DatePicker
                                value={filters.to}
                                min={filters.from || undefined}
                                placeholder="Sampai"
                                onChange={(v) => applyFilters({ to: v })}
                                className="h-9 w-36 rounded-lg"
                            />
                        </>
                    )}

                    {filters.range_label && (
                        <span className="rounded-lg bg-lux-teal/10 px-2.5 py-1 text-xs font-medium text-lux-teal-dark dark:text-lux-teal">
                            {filters.range_label}
                        </span>
                    )}

                    <div className="ml-auto flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                            Kelompokkan
                        </span>
                        <Select
                            value={filters.group}
                            onValueChange={(v) => setFilter('group', v)}
                        >
                            <SelectTrigger
                                className={`${filterSelectClasses} w-36`}
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="week">Minggu</SelectItem>
                                <SelectItem value="none">Tidak ada</SelectItem>
                                <SelectItem value="assignee">Anggota</SelectItem>
                                <SelectItem value="status">Status</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {targets.length === 0 ? (
                    <div className="glass-card mt-4 rounded-2xl px-6 py-16 text-center text-muted-foreground">
                        Tidak ada target yang cocok dengan filter ini.
                    </div>
                ) : (
                    <div className="mt-4 space-y-6">
                        {groups.map((group) => (
                            <div key={group.key}>
                                {group.label && (
                                    <h2 className="mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold tracking-tight">
                                        {group.label}
                                        {group.range && (
                                            <span className="text-xs font-normal text-muted-foreground">
                                                {group.range}
                                            </span>
                                        )}
                                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground tabular-nums">
                                            {group.items.length}
                                        </span>
                                        {group.current && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-lux-teal-light px-2 py-0.5 text-[11px] font-semibold text-lux-teal-dark dark:bg-lux-teal/20 dark:text-lux-teal">
                                                <span className="size-1.5 rounded-full bg-lux-teal" />
                                                Minggu ini
                                            </span>
                                        )}
                                    </h2>
                                )}
                                <div className="grid gap-4 lg:grid-cols-2">
                                    {group.items.map((target) =>
                                        renderCard(target),
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* create dialog */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Tambah Target</DialogTitle>
                        <DialogDescription>
                            Tugaskan target ke seorang anggota untuk satu rentang
                            waktu.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitCreate} className="space-y-5">
                        {renderFields(createForm, 'create')}
                        <DialogFooter className="gap-2">
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">
                                    Batal
                                </Button>
                            </DialogClose>
                            <Button
                                type="submit"
                                disabled={createForm.processing}
                            >
                                {createForm.processing && <Spinner />}
                                Simpan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* edit dialog */}
            <Dialog
                open={editing !== null}
                onOpenChange={(open) => !open && setEditing(null)}
            >
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Ubah Target</DialogTitle>
                        <DialogDescription>
                            Perbarui anggota, rentang, item, atau catatan target.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitEdit} className="space-y-5">
                        {renderFields(editForm, 'edit')}
                        <DialogFooter className="gap-2">
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">
                                    Batal
                                </Button>
                            </DialogClose>
                            <Button type="submit" disabled={editForm.processing}>
                                {editForm.processing && <Spinner />}
                                Simpan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* close dialog */}
            <Dialog
                open={closing !== null}
                onOpenChange={(open) => !open && setClosing(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Tutup target</DialogTitle>
                        <DialogDescription>
                            Tutup target untuk{' '}
                            <span className="font-medium text-foreground">
                                {closing?.assignee}
                            </span>
                            . Jika tidak tercapai, tulis alasannya.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitClose} className="space-y-4">
                        <div className="grid gap-2">
                            <Label
                                htmlFor="close-reason"
                                className={labelClasses}
                            >
                                Alasan{' '}
                                <span className="font-normal text-muted-foreground">
                                    (opsional)
                                </span>
                            </Label>
                            <Textarea
                                id="close-reason"
                                value={closeForm.data.close_reason}
                                onChange={(e) =>
                                    closeForm.setData(
                                        'close_reason',
                                        e.target.value,
                                    )
                                }
                                rows={3}
                                placeholder="mis. Target tidak tercapai karena akun kena limit."
                                className={textareaClasses}
                            />
                            <InputError message={closeForm.errors.close_reason} />
                        </div>
                        <DialogFooter className="gap-2">
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">
                                    Batal
                                </Button>
                            </DialogClose>
                            <Button
                                type="submit"
                                disabled={closeForm.processing}
                            >
                                {closeForm.processing && <Spinner />}
                                Tutup target
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* delete confirm */}
            <Dialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Hapus target</DialogTitle>
                        <DialogDescription>
                            Yakin ingin menghapus target untuk{' '}
                            <span className="font-medium text-foreground">
                                {deleting?.assignee}
                            </span>
                            ? Semua item dan progres terkait ikut terhapus.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">
                                Batal
                            </Button>
                        </DialogClose>
                        <Button
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting && <Spinner />}
                            Hapus
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

TargetsIndex.layout = {
    breadcrumbs: [
        { title: 'Dasbor', href: dashboard() },
        { title: 'Kelola Target', href: '/targets' },
    ],
};
