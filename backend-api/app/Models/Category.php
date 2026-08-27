<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'type',
    ];

    public function marketplaceListings(): HasMany
    {
        return $this->hasMany(MarketplaceListing::class);
    }

    public function serviceListings(): HasMany
    {
        return $this->hasMany(ServiceListing::class);
    }
}
