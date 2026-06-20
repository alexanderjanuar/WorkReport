import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AtSign,
    ExternalLink,
    Eye,
    Image as ImageIcon,
    Inbox,
    Instagram,
    Link2,
    Pencil,
    Plus,
    Search,
    Sparkles,
    Trash2,
    Upload,
    Users,
} from 'lucide-react';
import { useRef, useState } from 'react';
import InputError from '@/components/input-error';
import { PageHeader, primaryButtonClass } from '@/components/page-header';
import { Button } from '@/components/ui/button';
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
import { csrfToken } from '@/lib/utils';
import { dashboard } from '@/routes';

type Option = { value: string; label: string };

type MediaRow = {
    id: number;
    name: string;
    platform: string;
    platform_label: string;
    followers: number | null;
    logo_url: string | null;
    url: string | null;
    note: string | null;
    comments_count: number;
};

const formatFollowers = (n: number | null): string => {
    if (n == null) return '—';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.', ',') + ' jt';
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace('.', ',') + ' rb';
    return String(n);
};

type Props = {
    media: MediaRow[];
    platformOptions: Option[];
    filters: { search: string };
};

const labelClasses = 'text-sm font-medium text-foreground/80';
const fieldClasses =
    'h-11 rounded-xl border-border bg-white/60 text-sm shadow-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-lux-teal focus-visible:ring-2 focus-visible:ring-lux-teal/20 dark:bg-white/5';
const selectClasses =
    '!h-11 w-full rounded-xl border-border bg-white/60 text-sm shadow-none focus-visible:border-lux-teal focus-visible:ring-2 focus-visible:ring-lux-teal/20 dark:bg-white/5';
const iconClasses =
    'pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground/70';

type FormData = {
    name: string;
    platform: string;
    followers: number | '';
    url: string;
    note: string;
    logo: File | null;
    logo_path: string;
};

export default function MediaIndex({ media, platformOptions, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<MediaRow | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── scrape an Instagram profile (Apify) to prefill the form ────────────
    const [scrapeUser, setScrapeUser] = useState('');
    const [scraping, setScraping] = useState(false);
    const [scrapeError, setScrapeError] = useState<string | null>(null);

    const form = useForm<FormData>({
        name: '',
        platform: platformOptions[0]?.value ?? '',
        followers: '',
        url: '',
        note: '',
        logo: null,
        logo_path: '',
    });
    const err = (key: string) => (form.errors as Record<string, string>)[key];

    const onPickLogo = (file: File | null) => {
        // a manually-chosen file overrides any scraped/staged logo
        form.setData({ ...form.data, logo: file, logo_path: '' });
        setPreview(file ? URL.createObjectURL(file) : (editing?.logo_url ?? null));
    };

    const doScrape = async () => {
        const username = scrapeUser.trim().replace(/^@/, '');
        if (!username) return;
        setScraping(true);
        setScrapeError(null);
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
                setScrapeError(data.message ?? 'Gagal mengambil profil.');
                return;
            }
            form.clearErrors();
            form.setData({
                ...form.data,
                name: data.name ?? form.data.name,
                url: data.url ?? '',
                platform: data.platform ?? form.data.platform,
                followers: data.followers ?? '',
                logo: null,
                logo_path: data.logo_path ?? '',
            });
            if (fileRef.current) fileRef.current.value = '';
            setPreview(data.logo_url ?? null);
        } catch {
            setScrapeError('Gagal menghubungi server.');
        } finally {
            setScraping(false);
        }
    };

    const onSearch = (value: string) => {
        setSearch(value);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(
            () =>
                router.get(
                    '/media',
                    { search: value || undefined },
                    { preserveState: true, preserveScroll: true, replace: true },
                ),
            300,
        );
    };

    const openCreate = () => {
        form.clearErrors();
        form.setData({
            name: '',
            platform: platformOptions[0]?.value ?? '',
            followers: '',
            url: '',
            note: '',
            logo: null,
            logo_path: '',
        });
        setEditing(null);
        setPreview(null);
        setScrapeUser('');
        setScrapeError(null);
        if (fileRef.current) fileRef.current.value = '';
        setOpen(true);
    };

    const openEdit = (row: MediaRow) => {
        form.clearErrors();
        form.setData({
            name: row.name,
            platform: row.platform,
            followers: row.followers ?? '',
            url: row.url ?? '',
            note: row.note ?? '',
            logo: null,
            logo_path: '',
        });
        setEditing(row);
        setPreview(row.logo_url);
        setScrapeUser('');
        setScrapeError(null);
        if (fileRef.current) fileRef.current.value = '';
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
                setPreview(null);
            },
        };
        if (editing) {
            // PATCH + file upload → POST with method spoofing (browser limit).
            form.transform((data) => ({ ...data, _method: 'patch' }));
            form.post(`/media/${editing.id}`, opts);
        } else {
            form.transform((data) => data);
            form.post('/media', opts);
        }
    };

    const remove = (row: MediaRow) => {
        if (
            row.comments_count > 0 &&
            !confirm(
                `Hapus media "${row.name}"? ${row.comments_count} komentar yang tertaut akan kehilangan media.`,
            )
        ) {
            return;
        }
        router.delete(`/media/${row.id}`, { preserveScroll: true });
    };

    return (
        <>
            <Head title="Media" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    eyebrow="Aset"
                    title="Media"
                    description="Kelola akun media sosial yang dipakai tim untuk berkomentar."
                    action={
                        <Button
                            onClick={openCreate}
                            className={`w-fit ${primaryButtonClass}`}
                        >
                            <Plus className="h-4 w-4" />
                            Tambah Media
                        </Button>
                    }
                />

                <div className="glass-card overflow-hidden rounded-2xl">
                    {/* toolbar */}
                    <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
                        <div className="relative w-full sm:max-w-xs">
                            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => onSearch(e.target.value)}
                                placeholder="Cari nama akun…"
                                className="h-10 rounded-lg border-border bg-white/60 pl-9 shadow-none focus-visible:border-lux-teal focus-visible:ring-2 focus-visible:ring-lux-teal/20 dark:bg-white/5"
                            />
                        </div>
                        <span className="text-sm text-muted-foreground sm:ml-auto">
                            {media.length} akun
                        </span>
                    </div>

                    {/* table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                                    <th className="px-4 py-3 font-semibold">
                                        Akun
                                    </th>
                                    <th className="px-4 py-3 font-semibold">
                                        Platform
                                    </th>
                                    <th className="px-4 py-3 text-right font-semibold">
                                        Follower
                                    </th>
                                    <th className="hidden px-4 py-3 font-semibold lg:table-cell">
                                        Catatan
                                    </th>
                                    <th className="px-4 py-3 text-right font-semibold">
                                        Komentar
                                    </th>
                                    <th className="px-4 py-3 text-right font-semibold">
                                        <span className="sr-only">Aksi</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {media.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-16">
                                            <div className="flex flex-col items-center gap-3 text-center">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                                                    <Inbox className="h-6 w-6 text-muted-foreground" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="font-medium">
                                                        Belum ada media
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        Tambahkan akun media
                                                        lewat tombol “Tambah
                                                        Media”.
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    media.map((row) => (
                                        <tr
                                            key={row.id}
                                            className="border-b border-border/60 transition-colors last:border-0 hover:bg-white/40 dark:hover:bg-white/[0.04]"
                                        >
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    {row.logo_url ? (
                                                        <img
                                                            src={row.logo_url}
                                                            alt={row.name}
                                                            className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-border"
                                                        />
                                                    ) : (
                                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lux-teal/12 text-lux-teal-dark dark:text-lux-teal">
                                                            <AtSign className="h-4 w-4" />
                                                        </span>
                                                    )}
                                                    <Link
                                                        href={`/media/${row.id}`}
                                                        className="font-medium hover:text-lux-teal-dark hover:underline dark:hover:text-lux-teal"
                                                    >
                                                        {row.name}
                                                    </Link>
                                                    {row.url ? (
                                                        <a
                                                            href={row.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            title="Buka di platform"
                                                            className="text-muted-foreground transition-colors hover:text-lux-teal-dark dark:hover:text-lux-teal"
                                                        >
                                                            <ExternalLink className="h-3.5 w-3.5" />
                                                        </a>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {row.platform_label}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium tabular-nums">
                                                {formatFollowers(row.followers)}
                                            </td>
                                            <td className="hidden max-w-xs truncate px-4 py-3 text-muted-foreground lg:table-cell">
                                                {row.note || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                                                {row.comments_count}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Link
                                                        href={`/media/${row.id}`}
                                                        className="text-muted-foreground transition-colors hover:text-lux-teal-dark dark:hover:text-lux-teal"
                                                        title="Lihat detail"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Link>
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
                                                            remove(row)
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
                            {editing ? 'Ubah Media' : 'Tambah Media'}
                        </DialogTitle>
                        <DialogDescription>
                            Akun media sosial yang dipakai tim untuk
                            berkomentar.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-5">
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
                                        value={scrapeUser}
                                        onChange={(e) =>
                                            setScrapeUser(e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                doScrape();
                                            }
                                        }}
                                        placeholder="username IG (mis. humansofny)"
                                        className={`${fieldClasses} pr-3 pl-10`}
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={doScrape}
                                    disabled={scraping || !scrapeUser.trim()}
                                    className="shrink-0 gap-1.5 rounded-xl"
                                >
                                    {scraping ? (
                                        <Spinner />
                                    ) : (
                                        <Sparkles className="h-4 w-4" />
                                    )}
                                    Ambil profil
                                </Button>
                            </div>
                            {scrapeError ? (
                                <p className="mt-2 text-xs text-destructive">
                                    {scrapeError}
                                </p>
                            ) : (
                                <p className="mt-1.5 text-[11px] text-muted-foreground">
                                    Mengisi nama, link, & logo dari profil IG
                                    secara otomatis.
                                </p>
                            )}
                        </div>

                        {/* logo */}
                        <div className="grid gap-2">
                            <Label className={labelClasses}>
                                Logo{' '}
                                <span className="font-normal text-muted-foreground">
                                    (opsional)
                                </span>
                            </Label>
                            <div className="flex items-center gap-4">
                                {preview ? (
                                    <img
                                        src={preview}
                                        alt="Pratinjau logo"
                                        className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-1 ring-border"
                                    />
                                ) : (
                                    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-lux-teal/10 text-lux-teal-dark dark:text-lux-teal">
                                        <ImageIcon className="h-6 w-6" />
                                    </span>
                                )}
                                <div className="space-y-1">
                                    <input
                                        ref={fileRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) =>
                                            onPickLogo(
                                                e.target.files?.[0] ?? null,
                                            )
                                        }
                                    />
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="gap-1.5 rounded-lg"
                                            onClick={() =>
                                                fileRef.current?.click()
                                            }
                                        >
                                            <Upload className="h-3.5 w-3.5" />
                                            {preview ? 'Ganti' : 'Pilih logo'}
                                        </Button>
                                        {form.data.logo && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    onPickLogo(null);
                                                    if (fileRef.current)
                                                        fileRef.current.value =
                                                            '';
                                                }}
                                                className="text-xs text-muted-foreground hover:text-destructive"
                                            >
                                                Batalkan
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                        PNG/JPG, maks 4 MB.
                                    </p>
                                </div>
                            </div>
                            <InputError message={err('logo')} />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-2">
                                <Label
                                    htmlFor="m-name"
                                    className={labelClasses}
                                >
                                    Nama akun
                                </Label>
                                <Input
                                    id="m-name"
                                    value={form.data.name}
                                    onChange={(e) =>
                                        form.setData('name', e.target.value)
                                    }
                                    placeholder="mis. @brandstore"
                                    className={fieldClasses}
                                />
                                <InputError message={err('name')} />
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
                            <Label htmlFor="m-followers" className={labelClasses}>
                                Jumlah follower{' '}
                                <span className="font-normal text-muted-foreground">
                                    (opsional)
                                </span>
                            </Label>
                            <div className="relative">
                                <Users className={iconClasses} />
                                <Input
                                    id="m-followers"
                                    type="number"
                                    min={0}
                                    inputMode="numeric"
                                    value={form.data.followers}
                                    onChange={(e) =>
                                        form.setData(
                                            'followers',
                                            e.target.value === ''
                                                ? ''
                                                : Number(e.target.value),
                                        )
                                    }
                                    placeholder="mis. 12500"
                                    className={`${fieldClasses} pr-3 pl-10`}
                                />
                            </div>
                            <InputError message={err('followers')} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="m-url" className={labelClasses}>
                                Link akun{' '}
                                <span className="font-normal text-muted-foreground">
                                    (opsional)
                                </span>
                            </Label>
                            <div className="relative">
                                <Link2 className={iconClasses} />
                                <Input
                                    id="m-url"
                                    type="url"
                                    value={form.data.url}
                                    onChange={(e) =>
                                        form.setData('url', e.target.value)
                                    }
                                    placeholder="https://instagram.com/brandstore"
                                    className={`${fieldClasses} pr-3 pl-10`}
                                />
                            </div>
                            <InputError message={err('url')} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="m-note" className={labelClasses}>
                                Catatan{' '}
                                <span className="font-normal text-muted-foreground">
                                    (opsional)
                                </span>
                            </Label>
                            <Textarea
                                id="m-note"
                                value={form.data.note}
                                onChange={(e) =>
                                    form.setData('note', e.target.value)
                                }
                                rows={2}
                                placeholder="Catatan singkat tentang akun ini…"
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

MediaIndex.layout = {
    breadcrumbs: [
        { title: 'Dasbor', href: dashboard() },
        { title: 'Media', href: '/media' },
    ],
};
