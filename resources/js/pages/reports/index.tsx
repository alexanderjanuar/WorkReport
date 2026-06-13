import { Head, router, useForm } from '@inertiajs/react';
import {
    CalendarDays,
    CheckCircle2,
    Circle,
    ExternalLink,
    Inbox,
    Link2,
    Plus,
    Trash2,
    X,
} from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { PageHeader } from '@/components/page-header';
import { Scrollable } from '@/components/scrollable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
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

type Option = { value: string; label: string };

type GoalItem = {
    id: number;
    label: string;
    quantity: number | null;
    delivered: number;
    remaining: number | null;
    is_done: boolean;
};

type ProgressEntry = {
    id: number;
    reported_on: string;
    platform_label: string;
    quantity: number;
    post_url: string | null;
    note: string | null;
    item_label: string | null;
};

type TargetCard = {
    id: number;
    status: string;
    status_label: string;
    is_open: boolean;
    start_date: string;
    end_date: string;
    range_label: string;
    note: string | null;
    close_reason: string | null;
    done: number;
    total: number;
    percent: number;
    items: GoalItem[];
    reports: ProgressEntry[];
};

type Props = {
    targets: TargetCard[];
    platformOptions: Option[];
    today: string;
};

type FormItem = {
    target_item_id: number | '';
    item_label: string;
    platform: string;
    quantity: number | '';
    post_url: string;
};
type FormData = {
    target_id: number;
    reported_on: string;
    note: string;
    items: FormItem[];
};

/** Group a target's progress entries by date (one header per day, one note). */
function groupReports(reports: ProgressEntry[]) {
    const groups: {
        date: string;
        note: string | null;
        entries: ProgressEntry[];
    }[] = [];
    for (const r of reports) {
        let group = groups.find((g) => g.date === r.reported_on);
        if (!group) {
            group = { date: r.reported_on, note: null, entries: [] };
            groups.push(group);
        }
        group.entries.push(r);
        if (!group.note && r.note) group.note = r.note;
    }
    return groups;
}

const labelClasses = 'text-sm font-medium text-foreground/80';
const fieldClasses =
    'h-11 rounded-xl border-border bg-white/60 text-sm shadow-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-lux-teal focus-visible:ring-2 focus-visible:ring-lux-teal/20 dark:bg-white/5';
const selectClasses =
    '!h-11 w-full rounded-xl border-border bg-white/60 text-sm shadow-none focus-visible:border-lux-teal focus-visible:ring-2 focus-visible:ring-lux-teal/20 dark:bg-white/5';
const iconClasses =
    'pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground/70';

export default function ReportsIndex({ targets, platformOptions, today }: Props) {
    const [logging, setLogging] = useState<TargetCard | null>(null);

    const newItem = (): FormItem => ({
        target_item_id: '',
        item_label: '',
        platform: platformOptions[0]?.value ?? '',
        quantity: '',
        post_url: '',
    });

    const form = useForm<FormData>({
        target_id: 0,
        reported_on: today,
        note: '',
        items: [newItem()],
    });

    const err = (key: string) => (form.errors as Record<string, string>)[key];

    // The current target's items, offered as combobox suggestions. Picking one
    // links the entry (drawing down its quota when it has one); typing keeps the
    // text manual.
    const itemOptions = (logging?.items ?? []).map((i) => ({
        value: String(i.id),
        label: i.label,
        hint:
            i.quantity != null && i.quantity > 0
                ? `sisa ${i.remaining}/${i.quantity}`
                : undefined,
    }));

    const openLog = (target: TargetCard) => {
        const date =
            today >= target.start_date && today <= target.end_date
                ? today
                : target.end_date;
        form.clearErrors();
        form.setData({
            target_id: target.id,
            reported_on: date,
            note: '',
            items: [newItem()],
        });
        setLogging(target);
    };

    const addItem = () => form.setData('items', [...form.data.items, newItem()]);
    const removeItem = (idx: number) =>
        form.setData(
            'items',
            form.data.items.filter((_, i) => i !== idx),
        );
    const setItem = (
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

    const patchItem = (idx: number, patch: Partial<FormItem>) =>
        form.setData(
            'items',
            form.data.items.map((it, i) =>
                i === idx ? { ...it, ...patch } : it,
            ),
        );

    const submitLog = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/reports', {
            preserveScroll: true,
            onSuccess: () => {
                setLogging(null);
                form.reset();
            },
        });
    };

    const deleteEntry = (id: number) => {
        router.delete(`/reports/${id}`, { preserveScroll: true });
    };

    return (
        <>
            <Head title="Target Saya" />

            <div className="px-4 py-6 sm:px-6">
                <PageHeader
                    eyebrow="Progres Saya"
                    title="Target Saya"
                    description="Target yang ditugaskan untuk Anda. Catat progres harian Anda di sini."
                />

                {targets.length === 0 ? (
                    <div className="glass-card mt-6 flex flex-col items-center gap-3 rounded-2xl px-6 py-16 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                            <Inbox className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                            <p className="font-medium">Belum ada target</p>
                            <p className="text-sm text-muted-foreground">
                                Ketua tim atau admin belum menugaskan target
                                untuk Anda.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="mt-6 grid gap-4 lg:grid-cols-2">
                        {targets.map((target) => (
                            <div
                                key={target.id}
                                className="glass-card flex flex-col rounded-2xl p-5"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                                        {target.range_label}
                                    </p>
                                    <Badge
                                        className={
                                            target.status === 'open'
                                                ? 'shrink-0 border-transparent bg-lux-teal-light text-lux-teal-dark dark:bg-lux-teal/20 dark:text-lux-teal'
                                                : 'shrink-0 border-transparent bg-muted text-muted-foreground'
                                        }
                                    >
                                        {target.status_label}
                                    </Badge>
                                </div>

                                {/* checklist (read-only) */}
                                <div className="mt-4">
                                    <Scrollable className="max-h-40 space-y-0.5 pr-1">
                                    {target.items.map((item, i) => (
                                        <div
                                            key={i}
                                            className="flex items-start gap-2 px-1 py-0.5 text-sm"
                                        >
                                            {item.is_done ? (
                                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-lux-teal-dark dark:text-lux-teal" />
                                            ) : (
                                                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/40" />
                                            )}
                                            <span
                                                className={`flex-1 ${
                                                    item.is_done
                                                        ? 'text-muted-foreground line-through'
                                                        : ''
                                                }`}
                                            >
                                                {item.label}
                                            </span>
                                            {item.quantity != null &&
                                                item.quantity > 0 && (
                                                <span
                                                    className={`mt-px shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                                                        item.remaining === 0
                                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                            : 'bg-lux-teal/10 text-lux-teal-dark dark:text-lux-teal'
                                                    }`}
                                                    title={`${item.delivered} dari ${item.quantity} tercatat`}
                                                >
                                                    {item.delivered}/
                                                    {item.quantity}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                    </Scrollable>
                                </div>

                                <div className="mt-3">
                                    <div className="mb-1.5 flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">
                                            {target.done}/{target.total} item
                                            selesai
                                        </span>
                                        <span className="font-semibold tabular-nums text-lux-teal-dark dark:text-lux-teal">
                                            {target.percent}%
                                        </span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-[#16c2ad] to-lux-teal-dark"
                                            style={{
                                                width: `${target.percent}%`,
                                            }}
                                        />
                                    </div>
                                </div>

                                {target.note && (
                                    <p className="mt-3 text-xs text-muted-foreground">
                                        {target.note}
                                    </p>
                                )}
                                {target.close_reason && (
                                    <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                                        <span className="font-medium text-foreground">
                                            Alasan ditutup:
                                        </span>{' '}
                                        {target.close_reason}
                                    </p>
                                )}

                                {target.reports.length > 0 && (
                                    <div className="mt-4">
                                        <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                                            Progres
                                        </p>
                                        <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
                                            {groupReports(target.reports).map(
                                                (group) => (
                                                    <div
                                                        key={group.date}
                                                        className="space-y-1.5"
                                                    >
                                                        <div className="flex items-center gap-1.5 px-0.5 text-[11px] font-semibold text-muted-foreground">
                                                            <CalendarDays className="h-3 w-3 shrink-0" />
                                                            {group.date}
                                                        </div>
                                                        {group.entries.map(
                                                            (entry) => (
                                                                <div
                                                                    key={
                                                                        entry.id
                                                                    }
                                                                    className="flex items-start justify-between gap-2 rounded-lg bg-muted/50 px-3 py-1.5 text-xs"
                                                                >
                                                                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                                                                        <span className="shrink-0 font-medium">
                                                                            {
                                                                                entry.platform_label
                                                                            }
                                                                        </span>
                                                                        <span className="shrink-0 tabular-nums text-lux-teal-dark dark:text-lux-teal">
                                                                            +
                                                                            {
                                                                                entry.quantity
                                                                            }
                                                                        </span>
                                                                        {entry.item_label && (
                                                                            <span className="inline-flex min-w-0 items-center gap-1 rounded-md bg-lux-teal/10 px-1.5 py-0.5 text-[10px] font-medium text-lux-teal-dark dark:text-lux-teal">
                                                                                <Link2 className="h-2.5 w-2.5 shrink-0" />
                                                                                <span className="truncate">
                                                                                    {
                                                                                        entry.item_label
                                                                                    }
                                                                                </span>
                                                                            </span>
                                                                        )}
                                                                        {entry.post_url && (
                                                                            <a
                                                                                href={
                                                                                    entry.post_url
                                                                                }
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="inline-flex min-w-0 items-center gap-0.5 truncate text-muted-foreground hover:text-foreground"
                                                                            >
                                                                                <ExternalLink className="h-3 w-3 shrink-0" />
                                                                                bukti
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                    <button
                                                                        onClick={() =>
                                                                            deleteEntry(
                                                                                entry.id,
                                                                            )
                                                                        }
                                                                        className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                                                                        title="Hapus"
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </button>
                                                                </div>
                                                            ),
                                                        )}
                                                        {group.note && (
                                                            <p className="px-1 text-xs text-muted-foreground italic">
                                                                “{group.note}”
                                                            </p>
                                                        )}
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                )}

                                {target.is_open && (
                                    <div className="mt-auto border-t border-border/60 pt-4">
                                        <Button
                                            onClick={() => openLog(target)}
                                            className="w-full gap-2"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Catat Progres
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* log progress dialog */}
            <Dialog
                open={logging !== null}
                onOpenChange={(open) => !open && setLogging(null)}
            >
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Catat Progres</DialogTitle>
                        <DialogDescription>
                            Tambahkan satu atau beberapa item progres untuk
                            target ini ({logging?.range_label}).
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitLog} className="space-y-5">
                        <div className="grid gap-2">
                            <Label htmlFor="log-date" className={labelClasses}>
                                Tanggal
                            </Label>
                            <DatePicker
                                id="log-date"
                                value={form.data.reported_on}
                                min={logging?.start_date}
                                max={logging?.end_date}
                                onChange={(v) =>
                                    form.setData('reported_on', v)
                                }
                            />
                            <InputError message={err('reported_on')} />
                        </div>

                        <div className="grid gap-2">
                            <Label className={labelClasses}>Item progres</Label>
                            <div className="space-y-3">
                                {form.data.items.map((item, idx) => {
                                    return (
                                        <div
                                            key={idx}
                                            className="rounded-xl border border-border/70 bg-white/40 p-3 dark:bg-white/[0.03]"
                                        >
                                            <div className="mb-2 flex items-center justify-between">
                                                <span className="text-xs font-semibold text-muted-foreground">
                                                    Item {idx + 1}
                                                </span>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                    onClick={() =>
                                                        removeItem(idx)
                                                    }
                                                    disabled={
                                                        form.data.items
                                                            .length === 1
                                                    }
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            {/* item: free text, or pick a target item to draw down its quota */}
                                            <div className="mb-2 grid gap-1">
                                                <Combobox
                                                    value={item.item_label}
                                                    linkedValue={
                                                        item.target_item_id ===
                                                        ''
                                                            ? undefined
                                                            : String(
                                                                  item.target_item_id,
                                                              )
                                                    }
                                                    options={itemOptions}
                                                    placeholder="Tulis aktivitas atau pilih item target…"
                                                    onTextChange={(text) =>
                                                        patchItem(idx, {
                                                            item_label: text,
                                                            target_item_id: '',
                                                        })
                                                    }
                                                    onSelect={(o) =>
                                                        patchItem(idx, {
                                                            item_label: o.label,
                                                            target_item_id:
                                                                Number(o.value),
                                                        })
                                                    }
                                                />
                                                <InputError
                                                    message={err(
                                                        `items.${idx}.item_label`,
                                                    )}
                                                />
                                            </div>

                                            <div className="grid grid-cols-[1fr_6rem_1.4fr] items-start gap-2">
                                                <div className="grid gap-1">
                                                    <Select
                                                        value={item.platform}
                                                        onValueChange={(v) =>
                                                            setItem(
                                                                idx,
                                                                'platform',
                                                                v,
                                                            )
                                                        }
                                                    >
                                                        <SelectTrigger
                                                            className={
                                                                selectClasses
                                                            }
                                                        >
                                                            <SelectValue placeholder="Platform" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {platformOptions.map(
                                                                (o) => (
                                                                    <SelectItem
                                                                        key={
                                                                            o.value
                                                                        }
                                                                        value={
                                                                            o.value
                                                                        }
                                                                    >
                                                                        {o.label}
                                                                    </SelectItem>
                                                                ),
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                    <InputError
                                                        message={err(
                                                            `items.${idx}.platform`,
                                                        )}
                                                    />
                                                </div>
                                                <div className="grid gap-1">
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        value={item.quantity}
                                                        onChange={(e) =>
                                                            setItem(
                                                                idx,
                                                                'quantity',
                                                                e.target
                                                                    .value === ''
                                                                    ? ''
                                                                    : Number(
                                                                          e
                                                                              .target
                                                                              .value,
                                                                      ),
                                                            )
                                                        }
                                                        placeholder="Jml"
                                                        className={fieldClasses}
                                                    />
                                                    <InputError
                                                        message={err(
                                                            `items.${idx}.quantity`,
                                                        )}
                                                    />
                                                </div>
                                                <div className="grid gap-1">
                                                    <div className="relative">
                                                        <Link2
                                                            className={
                                                                iconClasses
                                                            }
                                                        />
                                                        <Input
                                                            type="url"
                                                            value={item.post_url}
                                                            onChange={(e) =>
                                                                setItem(
                                                                    idx,
                                                                    'post_url',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder="Link bukti (opsional)"
                                                            className={`${fieldClasses} pr-3 pl-10`}
                                                        />
                                                    </div>
                                                    <InputError
                                                        message={err(
                                                            `items.${idx}.post_url`,
                                                        )}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-fit gap-1.5 rounded-lg"
                                onClick={addItem}
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Tambah item
                            </Button>
                            <InputError message={err('items')} />
                        </div>

                        {/* daily note */}
                        <div className="grid gap-2">
                            <Label htmlFor="log-note" className={labelClasses}>
                                Catatan harian (opsional)
                            </Label>
                            <Textarea
                                id="log-note"
                                value={form.data.note}
                                onChange={(e) =>
                                    form.setData('note', e.target.value)
                                }
                                placeholder="Catatan singkat tentang kegiatan Anda hari ini…"
                                rows={3}
                                className="rounded-xl border-border bg-white/60 text-sm shadow-none focus-visible:border-lux-teal focus-visible:ring-2 focus-visible:ring-lux-teal/20 dark:bg-white/5"
                            />
                            <InputError message={err('note')} />
                        </div>

                        <DialogFooter className="gap-2">
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">
                                    Batal
                                </Button>
                            </DialogClose>
                            <Button type="submit" disabled={form.processing}>
                                {form.processing && <Spinner />}
                                Simpan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

ReportsIndex.layout = {
    breadcrumbs: [
        { title: 'Dasbor', href: dashboard() },
        { title: 'Target Saya', href: '/reports' },
    ],
};
