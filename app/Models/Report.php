<?php

namespace App\Models;

use App\Enums\Platform;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['target_id', 'target_item_id', 'item_label', 'user_id', 'reported_on', 'platform', 'quantity', 'post_url', 'note'])]
class Report extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'reported_on' => 'date',
            'platform' => Platform::class,
            'quantity' => 'integer',
        ];
    }

    /**
     * The user who logged this progress entry.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * The target this progress counts towards.
     */
    public function target(): BelongsTo
    {
        return $this->belongsTo(Target::class);
    }

    /**
     * The specific target checklist item this entry draws down (optional).
     */
    public function targetItem(): BelongsTo
    {
        return $this->belongsTo(TargetItem::class);
    }
}
