<?php

namespace App\Models;

use App\Enums\Platform;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'platform', 'followers', 'logo_path', 'url', 'note'])]
class Media extends Model
{
    protected $table = 'media';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'platform' => Platform::class,
            'followers' => 'integer',
        ];
    }

    /**
     * Comments distributed for/through this media account.
     */
    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class);
    }
}
