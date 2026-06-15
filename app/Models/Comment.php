<?php

namespace App\Models;

use App\Enums\Platform;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'target_id', 'commented_on', 'platform', 'post_url', 'proof_url'])]
class Comment extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'commented_on' => 'date',
            'platform' => Platform::class,
        ];
    }

    /**
     * The member who distributed this comment.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * The target this comment optionally belongs to.
     */
    public function target(): BelongsTo
    {
        return $this->belongsTo(Target::class);
    }
}
