<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Concerns;

use App\Models\Event;
use App\Models\KostListing;
use App\Models\LostFoundReport;
use App\Models\MarketplaceListing;
use App\Models\ServiceListing;

trait ResolvesMorphType
{
    /**
     * Short API aliases mapped to listing models. Frontend sends the alias,
     * storage keeps the FQCN via Eloquent morphs.
     *
     * @var array<string, class-string>
     */
    protected static array $morphAliases = [
        'marketplace' => MarketplaceListing::class,
        'kost' => KostListing::class,
        'service' => ServiceListing::class,
        'lostfound' => LostFoundReport::class,
        'event' => Event::class,
    ];

    protected static function resolveMorphClass(string $alias): ?string
    {
        return static::$morphAliases[$alias] ?? null;
    }

    protected static function resolveMorphAlias(string $class): ?string
    {
        $alias = array_search($class, static::$morphAliases, true);
        return $alias === false ? null : $alias;
    }
}
