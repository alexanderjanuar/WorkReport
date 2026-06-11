<?php

namespace App\Models;

use App\Enums\TargetStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'user_id',
    'assigned_by',
    'start_date',
    'end_date',
    'status',
    'closed_at',
    'close_reason',
    'note',
])]
class Target extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'closed_at' => 'datetime',
            'status' => TargetStatus::class,
        ];
    }

    public function isOpen(): bool
    {
        return $this->status === TargetStatus::Open;
    }

    /**
     * The member this target is assigned to.
     */
    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * The admin / ketua tim who assigned this target.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    /**
     * Goal items (platform + activity + amount) for this target.
     */
    public function items(): HasMany
    {
        return $this->hasMany(TargetItem::class);
    }

    /**
     * Daily progress entries logged against this target.
     */
    public function reports(): HasMany
    {
        return $this->hasMany(Report::class);
    }
}
