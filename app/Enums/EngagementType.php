<?php

namespace App\Enums;

enum EngagementType: string
{
    case Account = 'account';
    case Comment = 'comment';
    case Like = 'like';
    case Repost = 'repost';
    case Share = 'share';

    /**
     * Human-readable label (Indonesian) for the activity type.
     */
    public function label(): string
    {
        return match ($this) {
            self::Account => 'Buat Akun',
            self::Comment => 'Komentar',
            self::Like => 'Like',
            self::Repost => 'Repost',
            self::Share => 'Bagikan',
        };
    }

    /**
     * All engagement types as { value, label } pairs (e.g. for select inputs).
     *
     * @return array<int, array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(
            fn (self $t) => ['value' => $t->value, 'label' => $t->label()],
            self::cases(),
        );
    }
}
