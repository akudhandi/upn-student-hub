<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Account types provisioned by Admin for verified campus organizations/faculties.
     *
     * @var array<int, string>
     */
    public const OFFICIAL_ACCOUNT_TYPES = ['hima', 'ormawa', 'faculty'];

    /**
     * @var array<int, string>
     */
    protected $appends = [
        'is_official_account',
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'google_id',
        'status',
        'account_type',
    ];

    protected $attributes = [
        'status' => 'active',
        'account_type' => 'student',
    ];

    public function isOfficialAccount(): bool
    {
        return in_array($this->account_type, self::OFFICIAL_ACCOUNT_TYPES, true);
    }

    public function getIsOfficialAccountAttribute(): bool
    {
        return $this->isOfficialAccount();
    }

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function profile(): HasOne
    {
        return $this->hasOne(StudentProfile::class);
    }

    public function marketplaceListings(): HasMany
    {
        return $this->hasMany(MarketplaceListing::class);
    }

    public function serviceListings(): HasMany
    {
        return $this->hasMany(ServiceListing::class);
    }

    public function lostFoundReports(): HasMany
    {
        return $this->hasMany(LostFoundReport::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(Event::class);
    }

    public function favorites(): HasMany
    {
        return $this->hasMany(Favorite::class);
    }

    public function ratings(): HasMany
    {
        return $this->hasMany(Rating::class);
    }

    public function reports(): HasMany
    {
        return $this->hasMany(Report::class, 'reporter_id');
    }

    public function receivedReports(): MorphMany
    {
        return $this->morphMany(Report::class, 'reportable');
    }

    public function chatParticipants(): HasMany
    {
        return $this->hasMany(ChatParticipant::class);
    }

    public function chatMessages(): HasMany
    {
        return $this->hasMany(ChatMessage::class);
    }
}
