<?php

namespace App\Enums;

enum UserRole: string
{
    case Admin = 'admin';
    case KetuaTim = 'ketua_tim';
    case User = 'user';

    /**
     * Human-readable label (Indonesian) for the role.
     */
    public function label(): string
    {
        return match ($this) {
            self::Admin => 'Admin',
            self::KetuaTim => 'Ketua Tim',
            self::User => 'Anggota',
        };
    }

    /**
     * Roles that a user with this role is allowed to assign to others.
     *
     * @return array<int, self>
     */
    public function assignableRoles(): array
    {
        return match ($this) {
            self::Admin => [self::User, self::KetuaTim, self::Admin],
            self::KetuaTim => [self::User],
            self::User => [],
        };
    }

    /**
     * Whether this role can manage (create/edit/delete) user accounts.
     */
    public function canManageUsers(): bool
    {
        return $this === self::Admin || $this === self::KetuaTim;
    }

    /**
     * All roles as { value, label } pairs (e.g. for select inputs).
     *
     * @return array<int, array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(
            fn (self $role) => ['value' => $role->value, 'label' => $role->label()],
            self::cases(),
        );
    }
}
