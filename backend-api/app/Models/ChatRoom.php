<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ChatRoom extends Model
{
    use HasFactory;

    protected $fillable = [
        'contextable_type',
        'contextable_id',
        'last_message_at',
    ];

    protected function casts(): array
    {
        return [
            'last_message_at' => 'datetime',
        ];
    }

    public function contextable(): MorphTo
    {
        return $this->morphTo();
    }

    public function participants(): HasMany
    {
        return $this->hasMany(ChatParticipant::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(ChatMessage::class);
    }
}
