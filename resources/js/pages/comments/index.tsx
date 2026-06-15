import { Head, router, useForm } from '@inertiajs/react';
import {
    ExternalLink,
    Inbox,
    Link2,
    Pencil,
    Plus,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { PageHeader, primaryButtonClass } from '@/components/page-header';
import { Button } from '@/components/ui/button';
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
import { dashboard } from '@/routes';

type Option = { value: string; label: string };
type TargetOption = { value: number; label: string };

type CommentRow = {
    id: number;
    commented_on: string;
    date: string;
    platform: string;
    platform_label: string;
    post_url: string;
    proof_url: string | null;
    target_id: number | null;
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
    targetOptions: TargetOption[];
    filters: { platform: string; date: string };
    today: string;
};

const labelClasses = 'text-sm font-medium text-foreground/80';
const fieldClasses =
    'h-11 rounded-xl border-border bg-white/60 text-sm shadow-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-lux-teal focus-visible:ring-2 focus-visible:ring-lux-teal/20 dark:bg-white/5';
const selectClasses =
    '!h-11 w-full rounded-xl border-border bg-white/60 text-sm shadow-none focus-visible:border-lux-teal focus-visible:ring-2 focus-visible:ring-lux-teal/20 dark:bg-white/5';
const iconClasses =
    'pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground/70';

type FormData = {
    commented_on: string;
    platform: string;
    post_url: string;
    proof_url: string;
    target_id: number | '';
};

export default function CommentsIndex({
    comments,
    platformOptions,
    targetOptions,
    filters,
    today,
}: Props) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<CommentRow | null>(null);

    const form = useForm<FormData>({
        commented_on: today,
        platform: platformOptions[0]?.value ?? '',
        post_url: '',
        proof_url: '',
        target_id: '',
    });
    const err = (key: string) => (form.errors as Record<string, string>)[key];

    const openCreate = () => {
        form.clearErrors();
        form.setData({
            commented_on: today,
            platform: platformOptions[0]?.value ?? '',
            post_url: '',
            proof_url: '',
            target_id: '',
        });
        setEditing(null);
        setOpen(true);
    };

    const openEdit = (row: CommentRow) => {
        form.clearErrors();
        form.setData({
            commented_on: row.date,
            platform: row.platform,
            post_url: row.post_url,
            proof_url: row.proof_url ?? '',
            target_id: row.target_id ?? '',
        });
        setEditing(row);
        setOpen(true);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const opts = {
            preserveScroll: true,
            onSuccess: () => {
                setOpen(false);
                form.reset();
            },
        };
        if (editing) {
            form.patch(`/komentar/${editing.id}`, opts);
        } else {
            form.post('/komentar', opts);
        }
    };

    const remove = (id: number) =>
        router.delete(`/komentar/${id}`, { preserveScroll: true });

    const applyFilter = (next: { platform?: string; date?: string }) => {
        router.get(
            '/komentar',
            {
                platform: (next.platform ?? filters.platform) || undefined,
                date: (next.date ?? filters.date) || undefined,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const hasFilter = filters.platform || filters.date;

    return (
        <>
            <Head title="Komentar" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    eyebrow="Distribusi"
                    title="Komentar"
                    description="Catat komentar yang Anda sebar ke berbagai post."
                    action={
                        <Button
                            onClick={openCreate}
                            className={`w-fit ${primaryButtonClass}`}
                        >
                            <Plus className="h-4 w-4" />
                            Tambah Komentar
                        </Button>
                    }
                />

                <div className="glass-card overflow-hidden rounded-2xl">
                    {/* toolbar */}
                    <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
                        <Select
                            value={filters.platform || 'all'}
                            onValueChange={(v) =>
                                applyFilter({ platform: v === 'all' ? '' : v })
                            }
                        >
                            <SelectTrigger className="!h-10 w-full rounded-lg border-border bg-white/60 text-sm shadow-none focus-visible:border-lux-teal focus-visible:ring-2 focus-visible:ring-lux-teal/20 sm:w-44 dark:bg-white/5">
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
                            onChange={(v) => applyFilter({ date: v })}
                            className="h-10 w-full rounded-lg sm:w-44"
                        />
                        {hasFilter && (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() =>
                                    router.get(
                                        '/komentar',
                                        {},
                                        { preserveScroll: true },
                                    )
                                }
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
                                    <th className="px-4 py-3 text-right font-semibold">
                                        <span className="sr-only">Aksi</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {comments.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-16">
                                            <div className="flex flex-col items-center gap-3 text-center">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                                                    <Inbox className="h-6 w-6 text-muted-foreground" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="font-medium">
                                                        Belum ada komentar
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        Catat komentar pertama
                                                        Anda lewat tombol
                                                        “Tambah Komentar”.
                                                    </p>
                                                </div>
                                            </div>
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
                                            <td className="px-4 py-3 font-medium">
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
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openEdit(row)
                                                        }
                                                        className="text-muted-foreground transition-colors hover:text-lux-teal-dark dark:hover:text-lux-teal"
                                                        title="Ubah"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            remove(row.id)
                                                        }
                                                        className="text-muted-foreground transition-colors hover:text-destructive"
                                                        title="Hapus"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
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

            {/* add / edit dialog */}
            <Dialog
                open={open}
                onOpenChange={(o) => {
                    setOpen(o);
                    if (!o) setEditing(null);
                }}
            >
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editing ? 'Ubah Komentar' : 'Tambah Komentar'}
                        </DialogTitle>
                        <DialogDescription>
                            Catat komentar yang Anda sebar ke sebuah post.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-5">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-2">
                                <Label
                                    htmlFor="c-date"
                                    className={labelClasses}
                                >
                                    Tanggal
                                </Label>
                                <DatePicker
                                    id="c-date"
                                    value={form.data.commented_on}
                                    onChange={(v) =>
                                        form.setData('commented_on', v)
                                    }
                                />
                                <InputError message={err('commented_on')} />
                            </div>
                            <div className="grid gap-2">
                                <Label className={labelClasses}>Platform</Label>
                                <Select
                                    value={form.data.platform}
                                    onValueChange={(v) =>
                                        form.setData('platform', v)
                                    }
                                >
                                    <SelectTrigger className={selectClasses}>
                                        <SelectValue placeholder="Platform" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {platformOptions.map((o) => (
                                            <SelectItem
                                                key={o.value}
                                                value={o.value}
                                            >
                                                {o.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={err('platform')} />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="c-post" className={labelClasses}>
                                Link post
                            </Label>
                            <div className="relative">
                                <Link2 className={iconClasses} />
                                <Input
                                    id="c-post"
                                    type="url"
                                    value={form.data.post_url}
                                    onChange={(e) =>
                                        form.setData('post_url', e.target.value)
                                    }
                                    placeholder="https://… (post yang dikomentari)"
                                    className={`${fieldClasses} pr-3 pl-10`}
                                />
                            </div>
                            <InputError message={err('post_url')} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="c-proof" className={labelClasses}>
                                Bukti{' '}
                                <span className="font-normal text-muted-foreground">
                                    (opsional)
                                </span>
                            </Label>
                            <div className="relative">
                                <Link2 className={iconClasses} />
                                <Input
                                    id="c-proof"
                                    type="url"
                                    value={form.data.proof_url}
                                    onChange={(e) =>
                                        form.setData('proof_url', e.target.value)
                                    }
                                    placeholder="https://… (screenshot/link bukti)"
                                    className={`${fieldClasses} pr-3 pl-10`}
                                />
                            </div>
                            <InputError message={err('proof_url')} />
                        </div>

                        <div className="grid gap-2">
                            <Label className={labelClasses}>
                                Target{' '}
                                <span className="font-normal text-muted-foreground">
                                    (opsional)
                                </span>
                            </Label>
                            <Select
                                value={
                                    form.data.target_id === ''
                                        ? 'none'
                                        : String(form.data.target_id)
                                }
                                onValueChange={(v) =>
                                    form.setData(
                                        'target_id',
                                        v === 'none' ? '' : Number(v),
                                    )
                                }
                            >
                                <SelectTrigger className={selectClasses}>
                                    <SelectValue placeholder="Tanpa target" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">
                                        Tanpa target
                                    </SelectItem>
                                    {targetOptions.map((o) => (
                                        <SelectItem
                                            key={o.value}
                                            value={String(o.value)}
                                        >
                                            {o.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={err('target_id')} />
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

CommentsIndex.layout = {
    breadcrumbs: [
        { title: 'Dasbor', href: dashboard() },
        { title: 'Komentar', href: '/komentar' },
    ],
};
