<?php

namespace App\Enums;

enum TargetStatus: string
{
    case Open = 'open';
    case Closed = 'closed';

    /**
     * Human-readable label (Indonesian) for the status.
     */
    public function label(): string
    {
        return match ($this) {
            self::Open => 'Berjalan',
            self::Closed => 'Ditutup',
        };
    }
}
