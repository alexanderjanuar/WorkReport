import { Head, router, useForm } from '@inertiajs/react';
import { KeyRound, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import InputError from '@/components/input-error';
import { PageHeader, primaryButtonClass } from '@/components/page-header';
import PasswordInput from '@/components/password-input';
import { Badge } from '@/components/ui/badge';
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
import { dashboard } from '@/routes';
import type { UserRole } from '@/types';

type RoleOption = { value: UserRole; label: string };

type UserRow = {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    role_label: string;
    created_at: string | null;
    is_self: boolean;
};

type Paginated<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    from: number | null;
    to: number | null;
    total: number;
};

type Props = {
    users: Paginated<UserRow>;
    filters: { search: string };
    roleOptions: RoleOption[];
};

const roleBadgeClass: Record<UserRole, string> = {
    admin: 'border-transparent bg-lux-teal-dark text-white',
    ketua_tim:
        'border-transparent bg-lux-teal-light text-lux-teal-dark dark:bg-lux-teal/20 dark:text-lux-teal',
    user: 'border-transparent bg-muted text-muted-foreground',
};

const inputClasses = 'h-10 rounded-lg bg-white/60 dark:bg-white/5';

export default function UsersIndex({ users, filters, roleOptions }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [editing, setEditing] = useState<UserRow | null>(null);
    const [resetting, setResetting] = useState<UserRow | null>(null);
    const [deleting, setDeleting] = useState<UserRow | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const defaultRole = roleOptions[0]?.value ?? 'user';

    const createForm = useForm({
        name: '',
        email: '',
        password: '',
        role: defaultRole as UserRole,
    });

    const editForm = useForm({
        name: '',
        email: '',
        role: defaultRole as UserRole,
    });

    const resetForm = useForm({ password: '' });

    const onSearch = (value: string) => {
        setSearch(value);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            router.get(
                '/users',
                { search: value || undefined },
                { preserveState: true, preserveScroll: true, replace: true },
            );
        }, 300);
    };

    const openCreate = () => {
        createForm.reset();
        createForm.setData('role', defaultRole as UserRole);
        setCreateOpen(true);
    };

    const submitCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post('/users', {
            preserveScroll: true,
            onSuccess: () => {
                setCreateOpen(false);
                createForm.reset();
            },
        });
    };

    const openEdit = (user: UserRow) => {
        editForm.clearErrors();
        editForm.setData({
            name: user.name,
            email: user.email,
            role: user.role,
        });
        setEditing(user);
    };

    const submitEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editing) return;
        editForm.patch(`/users/${editing.id}`, {
            preserveScroll: true,
            onSuccess: () => setEditing(null),
        });
    };

    const openReset = (user: UserRow) => {
        resetForm.reset();
        resetForm.clearErrors();
        setResetting(user);
    };

    const submitReset = (e: React.FormEvent) => {
        e.preventDefault();
        if (!resetting) return;
        resetForm.put(`/users/${resetting.id}/password`, {
            preserveScroll: true,
            onSuccess: () => setResetting(null),
        });
    };

    const confirmDelete = () => {
        if (!deleting) return;
        setIsDeleting(true);
        router.delete(`/users/${deleting.id}`, {
            preserveScroll: true,
            onFinish: () => setIsDeleting(false),
            onSuccess: () => setDeleting(null),
        });
    };

    return (
        <>
            <Head title="Manajemen User" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    eyebrow="Manajemen Tim"
                    title="Manajemen User"
                    description="Kelola akun, peran, dan akses anggota tim."
                    action={
                        <Button
                            onClick={openCreate}
                            className={`w-fit ${primaryButtonClass}`}
                        >
                            <Plus className="h-4 w-4" />
                            Tambah User
                        </Button>
                    }
                />

                {/* table card */}
                <div className="glass-card overflow-hidden rounded-2xl">
                    {/* toolbar */}
                    <div className="flex items-center gap-3 border-b border-border p-4">
                        <div className="relative w-full max-w-sm">
                            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => onSearch(e.target.value)}
                                placeholder="Cari nama atau email…"
                                className="h-10 rounded-lg border-border bg-white/60 pl-9 shadow-none focus-visible:border-lux-teal focus-visible:ring-2 focus-visible:ring-lux-teal/20 dark:bg-white/5"
                            />
                        </div>
                        <span className="ml-auto hidden text-sm text-muted-foreground sm:block">
                            {users.total} user
                        </span>
                    </div>

                    {/* table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                                    <th className="px-4 py-3 font-semibold">
                                        Nama
                                    </th>
                                    <th className="px-4 py-3 font-semibold">
                                        Peran
                                    </th>
                                    <th className="hidden px-4 py-3 font-semibold md:table-cell">
                                        Dibuat
                                    </th>
                                    <th className="px-4 py-3 text-right font-semibold">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.data.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="px-4 py-16 text-center text-sm text-muted-foreground"
                                        >
                                            Tidak ada user yang cocok.
                                        </td>
                                    </tr>
                                ) : (
                                    users.data.map((user) => (
                                        <tr
                                            key={user.id}
                                            className="border-b border-border/60 transition-colors last:border-0 hover:bg-white/40 dark:hover:bg-white/[0.04]"
                                        >
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lux-teal/12 text-xs font-semibold text-lux-teal-dark dark:text-lux-teal">
                                                        {user.name
                                                            .slice(0, 2)
                                                            .toUpperCase()}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <div className="font-medium">
                                                            {user.name}
                                                            {user.is_self && (
                                                                <span className="ml-2 text-xs font-normal text-muted-foreground">
                                                                    (Anda)
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="truncate text-xs text-muted-foreground">
                                                            {user.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge
                                                    className={
                                                        roleBadgeClass[user.role]
                                                    }
                                                >
                                                    {user.role_label}
                                                </Badge>
                                            </td>
                                            <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                                                {user.created_at ?? '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            openEdit(user)
                                                        }
                                                        title="Ubah"
                                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                        <span className="sr-only">
                                                            Ubah
                                                        </span>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            openReset(user)
                                                        }
                                                        title="Reset kata sandi"
                                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                    >
                                                        <KeyRound className="h-4 w-4" />
                                                        <span className="sr-only">
                                                            Reset kata sandi
                                                        </span>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        disabled={user.is_self}
                                                        onClick={() =>
                                                            setDeleting(user)
                                                        }
                                                        title="Hapus"
                                                        className="h-8 w-8 text-muted-foreground hover:text-red-600 disabled:opacity-40"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        <span className="sr-only">
                                                            Hapus
                                                        </span>
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* pagination footer */}
                    <div className="flex flex-col items-center justify-between gap-2 border-t border-border p-4 text-sm text-muted-foreground sm:flex-row">
                        <span>
                            Menampilkan {users.from ?? 0}–{users.to ?? 0} dari{' '}
                            {users.total} user
                        </span>
                        {users.links.length > 3 && (
                            <div className="flex flex-wrap items-center gap-1">
                                {users.links.map((link, i) => (
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

            {/* create dialog */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Tambah User</DialogTitle>
                        <DialogDescription>
                            Buat akun baru. Akun langsung aktif dan terverifikasi.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitCreate} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="create-name">Nama</Label>
                            <Input
                                id="create-name"
                                value={createForm.data.name}
                                onChange={(e) =>
                                    createForm.setData('name', e.target.value)
                                }
                                placeholder="Nama lengkap"
                                className={inputClasses}
                                autoFocus
                            />
                            <InputError message={createForm.errors.name} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="create-email">Email</Label>
                            <Input
                                id="create-email"
                                type="email"
                                value={createForm.data.email}
                                onChange={(e) =>
                                    createForm.setData('email', e.target.value)
                                }
                                placeholder="nama@email.com"
                                className={inputClasses}
                            />
                            <InputError message={createForm.errors.email} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="create-password">Kata sandi</Label>
                            <PasswordInput
                                id="create-password"
                                value={createForm.data.password}
                                onChange={(e) =>
                                    createForm.setData(
                                        'password',
                                        e.target.value,
                                    )
                                }
                                placeholder="Minimal 8 karakter"
                                className={inputClasses}
                                autoComplete="new-password"
                            />
                            <InputError message={createForm.errors.password} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="create-role">Peran</Label>
                            <Select
                                value={createForm.data.role}
                                onValueChange={(v) =>
                                    createForm.setData('role', v as UserRole)
                                }
                            >
                                <SelectTrigger
                                    id="create-role"
                                    className="bg-white/60 dark:bg-white/5"
                                >
                                    <SelectValue placeholder="Pilih peran" />
                                </SelectTrigger>
                                <SelectContent>
                                    {roleOptions.map((opt) => (
                                        <SelectItem
                                            key={opt.value}
                                            value={opt.value}
                                        >
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={createForm.errors.role} />
                        </div>
                        <DialogFooter className="gap-2">
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">
                                    Batal
                                </Button>
                            </DialogClose>
                            <Button
                                type="submit"
                                disabled={createForm.processing}
                                className={primaryButtonClass}
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
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ubah User</DialogTitle>
                        <DialogDescription>
                            Perbarui nama, email, dan peran user.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitEdit} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-name">Nama</Label>
                            <Input
                                id="edit-name"
                                value={editForm.data.name}
                                onChange={(e) =>
                                    editForm.setData('name', e.target.value)
                                }
                                className={inputClasses}
                                autoFocus
                            />
                            <InputError message={editForm.errors.name} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-email">Email</Label>
                            <Input
                                id="edit-email"
                                type="email"
                                value={editForm.data.email}
                                onChange={(e) =>
                                    editForm.setData('email', e.target.value)
                                }
                                className={inputClasses}
                            />
                            <InputError message={editForm.errors.email} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-role">Peran</Label>
                            <Select
                                value={editForm.data.role}
                                onValueChange={(v) =>
                                    editForm.setData('role', v as UserRole)
                                }
                                disabled={editing?.is_self}
                            >
                                <SelectTrigger
                                    id="edit-role"
                                    className="bg-white/60 dark:bg-white/5"
                                >
                                    <SelectValue placeholder="Pilih peran" />
                                </SelectTrigger>
                                <SelectContent>
                                    {roleOptions.map((opt) => (
                                        <SelectItem
                                            key={opt.value}
                                            value={opt.value}
                                        >
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {editing?.is_self && (
                                <p className="text-xs text-muted-foreground">
                                    Anda tidak dapat mengubah peran akun sendiri.
                                </p>
                            )}
                            <InputError message={editForm.errors.role} />
                        </div>
                        <DialogFooter className="gap-2">
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">
                                    Batal
                                </Button>
                            </DialogClose>
                            <Button
                                type="submit"
                                disabled={editForm.processing}
                                className={primaryButtonClass}
                            >
                                {editForm.processing && <Spinner />}
                                Simpan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* reset password dialog */}
            <Dialog
                open={resetting !== null}
                onOpenChange={(open) => !open && setResetting(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reset kata sandi</DialogTitle>
                        <DialogDescription>
                            Tetapkan kata sandi baru untuk{' '}
                            <span className="font-medium text-foreground">
                                {resetting?.name}
                            </span>
                            .
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitReset} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="reset-password">
                                Kata sandi baru
                            </Label>
                            <PasswordInput
                                id="reset-password"
                                value={resetForm.data.password}
                                onChange={(e) =>
                                    resetForm.setData('password', e.target.value)
                                }
                                placeholder="Minimal 8 karakter"
                                className={inputClasses}
                                autoComplete="new-password"
                                autoFocus
                            />
                            <InputError message={resetForm.errors.password} />
                        </div>
                        <DialogFooter className="gap-2">
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">
                                    Batal
                                </Button>
                            </DialogClose>
                            <Button
                                type="submit"
                                disabled={resetForm.processing}
                                className={primaryButtonClass}
                            >
                                {resetForm.processing && <Spinner />}
                                Simpan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* delete confirm dialog */}
            <Dialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Hapus user</DialogTitle>
                        <DialogDescription>
                            Yakin ingin menghapus akun{' '}
                            <span className="font-medium text-foreground">
                                {deleting?.name}
                            </span>
                            ? Tindakan ini tidak dapat dibatalkan.
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

UsersIndex.layout = {
    breadcrumbs: [
        { title: 'Dasbor', href: dashboard() },
        { title: 'Manajemen User', href: '/users' },
    ],
};
