<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Event extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'title',
        'slug',
        'event_code',
        'category_id',
        'organizer_name',
        'event_date',
        'event_time',
        'location',
        'registration_link',
        'speakers',
        'benefits',
        'contact_pics',
        'documents',
        'description',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'event_date' => 'datetime',
            'speakers' => 'array',
            'benefits' => 'array',
            'contact_pics' => 'array',
            'documents' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function images(): MorphMany
    {
        return $this->morphMany(Image::class, 'imageable')->orderBy('sort_order');
    }
}
