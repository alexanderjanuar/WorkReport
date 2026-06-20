<?php

namespace App\Models;

use App\Enums\Platform;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'target_id', 'media_id', 'commented_on', 'platform', 'quantity', 'replies', 'likes', 'boosters', 'post_url', 'proof_url', 'proof_path'])]
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
            'quantity' => 'integer',
            'replies' => 'integer',
            'likes' => 'integer',
            'boosters' => 'integer',
        ];
    }

    /**
     * Human-readable summary of every action done on the post, e.g.
     * "1 komen, berbalas 5, like 19, komen booster 10" (extras omitted when 0).
     */
    public function actionSummary(): string
    {
        $parts = [$this->quantity.' komen'];

        if ($this->replies > 0) {
            $parts[] = 'berbalas '.$this->replies;
        }
        if ($this->likes > 0) {
            $parts[] = 'like '.$this->likes;
        }
        if ($this->boosters > 0) {
            $parts[] = 'komen booster '.$this->boosters;
        }

        return implode(', ', $parts);
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

    /**
     * The media account this comment relates to (optional).
     */
    public function media(): BelongsTo
    {
        return $this->belongsTo(Media::class);
    }
}
