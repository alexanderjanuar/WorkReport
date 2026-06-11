<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['target_id', 'label', 'quantity', 'is_done', 'done_at'])]
class TargetItem extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'is_done' => 'boolean',
            'done_at' => 'datetime',
        ];
    }

    public function target(): BelongsTo
    {
        return $this->belongsTo(Target::class);
    }

    /**
     * Daily progress entries linked to this item (drawing down its quota).
     */
    public function reports(): HasMany
    {
        return $this->hasMany(Report::class);
    }
}
