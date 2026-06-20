import { Head, router, useForm } from '@inertiajs/react';
import {
    AtSign,
    Check,
    Copy,
    Download,
    ExternalLink,
    Image as ImageIcon,
    Inbox,
    Instagram,
    Link2,
    Pencil,
    Plus,
    Sparkles,
    Trash2,
    Upload,
} from 'lucide-react';
import { useRef, useState } from 'react';
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
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { csrfToken } from '@/lib/utils';
import { dashboard } from '@/routes';

type Option = { value: string; label: string };
type TargetOption = { value: number; label: string };
type MediaOption = { value: number; label: string; platform: string };

type CommentRow = {
    id: number;
    commented_on: string;
    date: string;
    platform: string;
    platform_label: string;
    quantity: number;
    post_url: string;
    proof_url: string | null;
    has_proof: boolean;
    media_id: number | null;
    media: string | null;
    media_logo: string | null;
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
    mediaOptions: MediaOption[];
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
    quantity: number | '';
    post_url: string;
    proof: File | null;
    media_id: number | '';
    target_id: number | '';
};

export default function CommentsIndex({
    comments,
    platformOptions,
    targetOptions,
    mediaOptions,
    filters,
    today,
}: Props) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<CommentRow | null>(null);
    const [proofPreview, setProofPreview] = useState<string | null>(null);
    const proofFileRef = useRef<HTMLInputElement>(null);

    const form = useForm<FormData>({
        commented_on: today,
        platform: platformOptions[0]?.value ?? '',
        quantity: 1,
        post_url: '',
        proof: null,
        media_id: '',
        target_id: '',
    });
    const err = (key: string) => (form.errors as Record<string, string>)[key];

    const onPickProof = (file: File | null) => {
        form.setData('proof', file);
        setProofPreview(
            file
                ? URL.createObjectURL(file)
                : editing?.has_proof
                  ? (editing.proof_url ?? null)
                  : null,
        );
    };

    // Picking a media auto-fills the platform to keep them consistent.
    const onSelectMedia = (value: string) => {
        if (value === 'none') {
            form.setData('media_id', '');
            return;
        }
        const m = mediaOptions.find((o) => String(o.value) === value);
        form.setData({
            ...form.data,
            media_id: Number(value),
            platform: m?.platform ?? form.data.platform,
        });
    };

    const openCreate = () => {
        form.clearErrors();
        form.setData({
            commented_on: today,
            platform: platformOptions[0]?.value ?? '',
            quantity: 1,
            post_url: '',
            proof: null,
            media_id: '',
            target_id: '',
        });
        setEditing(null);
        setProofPreview(null);
        if (proofFileRef.current) proofFileRef.current.value = '';
        setOpen(true);
    };

    const openEdit = (row: CommentRow) => {
        form.clearErrors();
        form.setData({
            commented_on: row.date,
            platform: row.platform,
            quantity: row.quantity,
            post_url: row.post_url,
            proof: null,
            media_id: row.media_id ?? '',
            target_id: row.target_id ?? '',
        });
        setEditing(row);
        setProofPreview(row.has_proof ? (row.proof_url ?? null) : null);
        if (proofFileRef.current) proofFileRef.current.value = '';
        setOpen(true);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const opts = {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                setOpen(false);
                form.reset();
                setProofPreview(null);
            },
        };
        if (editing) {
            // PATCH + file upload → POST with method spoofing.
            form.transform((data) => ({ ...data, _method: 'patch' }));
            form.post(`/komentar/${editing.id}`, opts);
        } else {
            form.transform((data) => data);
            form.post('/komentar', opts);
        }
    };

    const remove = (id: number) =>
        router.delete(`/komentar/${id}`, { preserveScroll: true });

    // ── export my daily comment report ────────────────────────────────────
    const [exportOpen, setExportOpen] = useState(false);
    const [exportDate, setExportDate] = useState(filters.date || today);
    const [exportText, setExportText] = useState('');
    const [exportFilename, setExportFilename] = useState('riport.txt');
    const [exportLoading, setExportLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const loadExport = async (date: string) => {
        setExportLoading(true);
        setCopied(false);
        try {
            const res = await fetch(
                `/komentar/export?date=${encodeURIComponent(date)}`,
                { headers: { Accept: 'application/json' } },
            );
            const data = await res.json();
            setExportText(data.text ?? '');
            setExportFilename(data.filename ?? 'riport.txt');
        } catch {
            setExportText('Gagal memuat laporan. Coba lagi.');
        } finally {
            setExportLoading(false);
        }
    };

    const openExport = () => {
        const date = filters.date || today;
        setExportDate(date);
        setExportOpen(true);
        loadExport(date);
    };

    const copyExport = async () => {
        try {
            await navigator.clipboard.writeText(exportText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* clipboard unavailable */
        }
    };

    const downloadExport = () => {
        const blob = new Blob([exportText], {
            type: 'text/plain;charset=utf-8',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = exportFilename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    // ── quick-add a media account without leaving the comment modal ────────
    const [mediaModalOpen, setMediaModalOpen] = useState(false);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const mediaFileRef = useRef<HTMLInputElement>(null);
    const mediaForm = useForm<{
        name: string;
        platform: string;
        url: string;
        note: string;
        logo: File | null;
        logo_path: string;
        followers: number | '';
    }>({
        name: '',
        platform: platformOptions[0]?.value ?? '',
        url: '',
        note: '',
        logo: null,
        logo_path: '',
        followers: '',
    });
    const mediaErr = (key: string) =>
        (mediaForm.errors as Record<string, string>)[key];

    // scrape an Instagram profile (Apify) to prefill the quick-add media form
    const [mediaScrapeUser, setMediaScrapeUser] = useState('');
    const [mediaScraping, setMediaScraping] = useState(false);
    const [mediaScrapeError, setMediaScrapeError] = useState<string | null>(
        null,
    );

    const openMediaModal = () => {
        mediaForm.clearErrors();
        mediaForm.setData({
            name: '',
            // default to the platform already chosen for the comment
            platform: form.data.platform || platformOptions[0]?.value || '',
            url: '',
            note: '',
            logo: null,
            logo_path: '',
            followers: '',
        });
        setMediaPreview(null);
        setMediaScrapeUser('');
        setMediaScrapeError(null);
        if (mediaFileRef.current) mediaFileRef.current.value = '';
        setMediaModalOpen(true);
    };

    const doMediaScrape = async () => {
        const username = mediaScrapeUser.trim().replace(/^@/, '');
        if (!username) return;
        setMediaScraping(true);
        setMediaScrapeError(null);
        try {
            const res = await fetch('/media/scrape', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                },
                body: JSON.stringify({ username }),
            });
            const data = await res.json();
            if (!res.ok) {
                setMediaScrapeError(data.message ?? 'Gagal mengambil profil.');
                return;
            }
            mediaForm.clearErrors();
            mediaForm.setData({
                ...mediaForm.data,
                name: data.name ?? mediaForm.data.name,
                url: data.url ?? '',
                platform: data.platform ?? mediaForm.data.platform,
                followers: data.followers ?? '',
                logo: null,
                logo_path: data.logo_path ?? '',
            });
            if (mediaFileRef.current) mediaFileRef.current.value = '';
            setMediaPreview(data.logo_url ?? null);
        } catch {
            setMediaScrapeError('Gagal menghubungi server.');
        } finally {
            setMediaScraping(false);
        }
    };

    const submitMedia = (e: React.FormEvent) => {
        e.preventDefault();
        const prevIds = new Set(mediaOptions.map((o) => o.value));
        mediaForm.post('/media', {
            preserveScroll: true,
            preserveState: true, // keep the comment modal open underneath
            forceFormData: true,
            onSuccess: (page) => {
                setMediaModalOpen(false);
                mediaForm.reset();
                setMediaPreview(null);
                // auto-select the freshly created media in the comment form
                const next = (page.props as { mediaOptions?: MediaOption[] })
                    .mediaOptions;
                const created = next?.find((o) => !prevIds.has(o.value));
                if (created) {
                    form.setData({
                        ...form.data,
                        media_id: created.value,
                        platform: created.platform,
                    });
                }
            },
        });
    };

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
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                variant="outline"
                                onClick={openExport}
                                className="w-fit gap-2"
                            >
                                <Download className="h-4 w-4" />
                                Export
                            </Button>
                            <Button
                                onClick={openCreate}
                                className={`w-fit ${primaryButtonClass}`}
                            >
                                <Plus className="h-4 w-4" />
                                Tambah Komentar
                            </Button>
                        </div>
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
                                        Media
                                    </th>
                                    <th className="px-4 py-3 text-right font-semibold">
                                        Jumlah
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
                                        <td colSpan={8} className="px-4 py-16">
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
                                                {row.media ? (
                                                    <span className="inline-flex items-center gap-2 text-foreground/80">
                                                        {row.media_logo ? (
                                                            <img
                                                                src={
                                                                    row.media_logo
                                                                }
                                                                alt={row.media}
                                                                className="h-5 w-5 shrink-0 rounded-full object-cover ring-1 ring-border"
                                                            />
                                                        ) : (
                                                            <AtSign className="h-3.5 w-3.5 text-muted-foreground" />
                                                        )}
                                                        {row.media}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">
                                                        —
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right font-semibold tabular-nums">
                                                {row.quantity}
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

                        {/* jumlah + target */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-2">
                                <Label
                                    htmlFor="c-qty"
                                    className={labelClasses}
                                >
                                    Jumlah komentar
                                </Label>
                                <Input
                                    id="c-qty"
                                    type="number"
                                    min={1}
                                    value={form.data.quantity}
                                    onChange={(e) =>
                                        form.setData(
                                            'quantity',
                                            e.target.value === ''
                                                ? ''
                                                : Number(e.target.value),
                                        )
                                    }
                                    placeholder="mis. 10"
                                    className={fieldClasses}
                                />
                                <InputError message={err('quantity')} />
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
                        </div>

                        {/* media (akun) + quick add */}
                        <div className="grid gap-2">
                            <Label className={labelClasses}>
                                Media{' '}
                                <span className="font-normal text-muted-foreground">
                                    (akun yang dipakai)
                                </span>
                            </Label>
                            <div className="flex items-center gap-2">
                                <div className="flex-1">
                                    <SearchableSelect
                                        value={
                                            form.data.media_id === ''
                                                ? 'none'
                                                : String(form.data.media_id)
                                        }
                                        onChange={onSelectMedia}
                                        options={[
                                            {
                                                value: 'none',
                                                label: 'Tanpa media',
                                            },
                                            ...mediaOptions.map((o) => ({
                                                value: String(o.value),
                                                label: o.label,
                                            })),
                                        ]}
                                        placeholder="Pilih media"
                                        searchPlaceholder="Cari media…"
                                        emptyText="Media tidak ditemukan."
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={openMediaModal}
                                    title="Tambah media baru"
                                    className="h-11 w-11 shrink-0 rounded-xl"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            <InputError message={err('media_id')} />
                        </div>

                        {/* link post */}
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

                        {/* bukti screenshot */}
                        <div className="grid gap-2">
                            <Label className={labelClasses}>
                                Bukti screenshot{' '}
                                <span className="font-normal text-muted-foreground">
                                    (opsional)
                                </span>
                            </Label>
                            <div className="flex items-center gap-4">
                                {proofPreview ? (
                                    <a
                                        href={proofPreview}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="shrink-0"
                                        title="Lihat bukti"
                                    >
                                        <img
                                            src={proofPreview}
                                            alt="Pratinjau bukti"
                                            className="h-16 w-16 rounded-xl object-cover ring-1 ring-border"
                                        />
                                    </a>
                                ) : (
                                    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-lux-teal/10 text-lux-teal-dark dark:text-lux-teal">
                                        <ImageIcon className="h-6 w-6" />
                                    </span>
                                )}
                                <div className="space-y-1">
                                    <input
                                        ref={proofFileRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) =>
                                            onPickProof(
                                                e.target.files?.[0] ?? null,
                                            )
                                        }
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="gap-1.5 rounded-lg"
                                        onClick={() =>
                                            proofFileRef.current?.click()
                                        }
                                    >
                                        <Upload className="h-3.5 w-3.5" />
                                        {proofPreview
                                            ? 'Ganti screenshot'
                                            : 'Unggah screenshot'}
                                    </Button>
                                    <p className="text-[11px] text-muted-foreground">
                                        PNG/JPG, maks 4 MB.
                                    </p>
                                </div>
                            </div>
                            <InputError message={err('proof')} />
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

            {/* quick-add media dialog (opens on top of the comment modal) */}
            <Dialog open={mediaModalOpen} onOpenChange={setMediaModalOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Tambah Media</DialogTitle>
                        <DialogDescription>
                            Buat akun media baru, langsung terpilih untuk
                            komentar ini.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitMedia} className="space-y-5">
                        {/* scrape from Instagram (Apify) */}
                        <div className="rounded-xl border border-lux-teal/20 bg-lux-teal/[0.05] p-3">
                            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-lux-teal-dark dark:text-lux-teal">
                                <Sparkles className="h-3.5 w-3.5" />
                                Isi otomatis dari Instagram
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <Instagram className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/70" />
                                    <Input
                                        value={mediaScrapeUser}
                                        onChange={(e) =>
                                            setMediaScrapeUser(e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                doMediaScrape();
                                            }
                                        }}
                                        placeholder="username IG"
                                        className={`${fieldClasses} pr-3 pl-10`}
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={doMediaScrape}
                                    disabled={
                                        mediaScraping || !mediaScrapeUser.trim()
                                    }
                                    className="shrink-0 gap-1.5 rounded-xl"
                                >
                                    {mediaScraping ? (
                                        <Spinner />
                                    ) : (
                                        <Sparkles className="h-4 w-4" />
                                    )}
                                    Ambil
                                </Button>
                            </div>
                            {mediaScrapeError ? (
                                <p className="mt-2 text-xs text-destructive">
                                    {mediaScrapeError}
                                </p>
                            ) : (
                                <p className="mt-1.5 text-[11px] text-muted-foreground">
                                    Mengisi nama, link, follower, & logo otomatis.
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-2">
                                <Label
                                    htmlFor="qm-name"
                                    className={labelClasses}
                                >
                                    Nama akun
                                </Label>
                                <Input
                                    id="qm-name"
                                    value={mediaForm.data.name}
                                    onChange={(e) =>
                                        mediaForm.setData('name', e.target.value)
                                    }
                                    placeholder="mis. @brandstore"
                                    className={fieldClasses}
                                />
                                <InputError message={mediaErr('name')} />
                            </div>
                            <div className="grid gap-2">
                                <Label className={labelClasses}>Platform</Label>
                                <Select
                                    value={mediaForm.data.platform}
                                    onValueChange={(v) =>
                                        mediaForm.setData('platform', v)
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
                                <InputError message={mediaErr('platform')} />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="qm-url" className={labelClasses}>
                                Link akun{' '}
                                <span className="font-normal text-muted-foreground">
                                    (opsional)
                                </span>
                            </Label>
                            <div className="relative">
                                <Link2 className={iconClasses} />
                                <Input
                                    id="qm-url"
                                    type="url"
                                    value={mediaForm.data.url}
                                    onChange={(e) =>
                                        mediaForm.setData('url', e.target.value)
                                    }
                                    placeholder="https://instagram.com/brandstore"
                                    className={`${fieldClasses} pr-3 pl-10`}
                                />
                            </div>
                            <InputError message={mediaErr('url')} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="qm-note" className={labelClasses}>
                                Catatan{' '}
                                <span className="font-normal text-muted-foreground">
                                    (opsional)
                                </span>
                            </Label>
                            <Textarea
                                id="qm-note"
                                value={mediaForm.data.note}
                                onChange={(e) =>
                                    mediaForm.setData('note', e.target.value)
                                }
                                rows={2}
                                placeholder="Catatan singkat tentang akun ini…"
                                className="rounded-xl border-border bg-white/60 text-sm shadow-none focus-visible:border-lux-teal focus-visible:ring-2 focus-visible:ring-lux-teal/20 dark:bg-white/5"
                            />
                            <InputError message={mediaErr('note')} />
                        </div>

                        <div className="grid gap-2">
                            <Label className={labelClasses}>
                                Logo{' '}
                                <span className="font-normal text-muted-foreground">
                                    (opsional)
                                </span>
                            </Label>
                            <div className="flex items-center gap-3">
                                {mediaPreview ? (
                                    <img
                                        src={mediaPreview}
                                        alt="Pratinjau logo"
                                        className="h-11 w-11 shrink-0 rounded-xl object-cover ring-1 ring-border"
                                    />
                                ) : null}
                                <input
                                    ref={mediaFileRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0] ?? null;
                                        mediaForm.setData({
                                            ...mediaForm.data,
                                            logo: file,
                                            logo_path: '',
                                        });
                                        setMediaPreview(
                                            file
                                                ? URL.createObjectURL(file)
                                                : null,
                                        );
                                    }}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5 rounded-lg"
                                    onClick={() => mediaFileRef.current?.click()}
                                >
                                    <Upload className="h-3.5 w-3.5" />
                                    {mediaPreview ? 'Ganti logo' : 'Pilih logo'}
                                </Button>
                                {mediaForm.data.logo && (
                                    <span className="truncate text-xs text-muted-foreground">
                                        {mediaForm.data.logo.name}
                                    </span>
                                )}
                            </div>
                            <InputError message={mediaErr('logo')} />
                        </div>

                        <DialogFooter className="gap-2">
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">
                                    Batal
                                </Button>
                            </DialogClose>
                            <Button
                                type="submit"
                                disabled={mediaForm.processing}
                            >
                                {mediaForm.processing && <Spinner />}
                                Simpan media
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* export daily report dialog */}
            <Dialog open={exportOpen} onOpenChange={setExportOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Export Laporan Komentar</DialogTitle>
                        <DialogDescription>
                            Laporan harian komentar Anda per akun media, siap
                            disalin atau diunduh.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="grid gap-2">
                                <Label className={labelClasses}>Tanggal</Label>
                                <DatePicker
                                    value={exportDate}
                                    onChange={(v) => {
                                        setExportDate(v);
                                        if (v) loadExport(v);
                                    }}
                                    className="w-44"
                                />
                            </div>
                            <div className="ml-auto flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={copyExport}
                                    disabled={exportLoading || !exportText}
                                    className="gap-1.5"
                                >
                                    {copied ? (
                                        <Check className="h-4 w-4 text-emerald-600" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                    {copied ? 'Tersalin' : 'Salin'}
                                </Button>
                                <Button
                                    type="button"
                                    onClick={downloadExport}
                                    disabled={exportLoading || !exportText}
                                    className="gap-1.5"
                                >
                                    <Download className="h-4 w-4" />
                                    Unduh .txt
                                </Button>
                            </div>
                        </div>

                        <div className="relative">
                            {exportLoading && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/60">
                                    <Spinner />
                                </div>
                            )}
                            <Textarea
                                readOnly
                                value={exportText}
                                rows={16}
                                className="rounded-xl border-border bg-white/60 font-mono text-xs leading-relaxed whitespace-pre shadow-none focus-visible:border-lux-teal focus-visible:ring-2 focus-visible:ring-lux-teal/20 dark:bg-white/5"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">
                                Tutup
                            </Button>
                        </DialogClose>
                    </DialogFooter>
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
