<?php

namespace App\Enums;

enum Platform: string
{
    case Instagram = 'instagram';
    case TikTok = 'tiktok';
    case X = 'x';
    case Facebook = 'facebook';
    case YouTube = 'youtube';
    case Threads = 'threads';

    /**
     * Human-readable label for the platform.
     */
    public function label(): string
    {
        return match ($this) {
            self::Instagram => 'Instagram',
            self::TikTok => 'TikTok',
            self::X => 'X (Twitter)',
            self::Facebook => 'Facebook',
            self::YouTube => 'YouTube',
            self::Threads => 'Threads',
        };
    }

    /**
     * All platforms as { value, label } pairs (e.g. for select inputs).
     *
     * @return array<int, array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(
            fn (self $p) => ['value' => $p->value, 'label' => $p->label()],
            self::cases(),
        );
    }
}
