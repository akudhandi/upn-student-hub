<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Concerns;

use App\Models\ChatRoom;
use App\Models\Event;
use App\Models\LostFoundReport;
use App\Models\MarketplaceListing;
use App\Models\ServiceListing;
use App\Models\User;

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
        'service' => ServiceListing::class,
        'lostfound' => LostFoundReport::class,
        'event' => Event::class,
    ];

    /**
     * Extra reportable targets supported exclusively by moderation reports.
     *
     * @var array<string, class-string>
     */
    protected static array $reportableExtraAliases = [
        'user' => User::class,
        'chat' => ChatRoom::class,
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

    protected static function resolveReportableClass(string $alias): ?string
    {
        return static::$morphAliases[$alias] ?? static::$reportableExtraAliases[$alias] ?? null;
    }

    protected static function resolveReportableAlias(string $class): ?string
    {
        $alias = static::resolveMorphAlias($class);
        if ($alias !== null) {
            return $alias;
        }

        $extraAlias = array_search($class, static::$reportableExtraAliases, true);

        return $extraAlias === false ? null : $extraAlias;
    }
}
