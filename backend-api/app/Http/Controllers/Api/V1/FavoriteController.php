<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\ResolvesMorphType;
use App\Http\Controllers\Api\V1\Concerns\ResolvesStudentUser;
use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Favorite;
use App\Models\LostFoundReport;
use App\Models\MarketplaceListing;
use App\Models\ServiceListing;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FavoriteController extends Controller
{
    use ResolvesMorphType, ResolvesStudentUser;

    public function toggle(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'favoritable_type' => 'required|string',
            'favoritable_id' => 'required|integer|min:1',
        ]);

        $class = static::resolveMorphClass($validated['favoritable_type']);
        if ($class === null) {
            return response()->json([
                'message' => 'Tipe favorit tidak valid',
                'favorited' => false,
            ], 422);
        }

        $target = $class::query()->where('id', $validated['favoritable_id'])->first();
        if ($target === null) {
            return response()->json([
                'message' => 'Data tidak ditemukan',
                'favorited' => false,
            ], 404);
        }

        $userId = $this->resolveStudentUserId($request);

        $favorited = DB::transaction(function () use ($userId, $class, $target): bool {
            $favorite = Favorite::query()
                ->where('user_id', $userId)
                ->where('favoritable_type', $class)
                ->where('favoritable_id', $target->id)
                ->first();

            if ($favorite) {
                $favorite->delete();

                return false;
            }

            try {
                Favorite::create([
                    'user_id' => $userId,
                    'favoritable_type' => $class,
                    'favoritable_id' => $target->id,
                ]);
            } catch (UniqueConstraintViolationException) {
                return true;
            }

            return true;
        });

        return response()->json([
            'message' => $favorited ? 'Ditambahkan ke favorit' : 'Dihapus dari favorit',
            'favorited' => $favorited,
        ]);
    }

    public function check(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'required|string',
            'id' => 'required|integer|min:1',
        ]);

        $class = static::resolveMorphClass($validated['type']);
        if ($class === null) {
            return response()->json([
                'message' => 'Tipe favorit tidak valid',
                'favorited' => false,
            ], 422);
        }

        $userId = $this->resolveStudentUserId($request);

        $exists = Favorite::query()
            ->where('user_id', $userId)
            ->where('favoritable_type', $class)
            ->where('favoritable_id', $validated['id'])
            ->exists();

        return response()->json([
            'message' => 'Status favorit berhasil diambil',
            'favorited' => $exists,
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $userId = $this->resolveStudentUserId($request);

        $relations = ['user:id,name,account_type', 'category:id,name,slug', 'images'];

        $favorites = Favorite::query()
            ->with([
                'favoritable' => static function (MorphTo $morphTo) use ($relations): void {
                    $morphTo->morphWith([
                        MarketplaceListing::class => $relations,
                        ServiceListing::class => $relations,
                        LostFoundReport::class => $relations,
                        Event::class => $relations,
                    ]);
                },
            ])
            ->where('user_id', $userId)
            ->latest()
            ->get()
            ->filter(function (Favorite $favorite): bool {
                $target = $favorite->favoritable;
                if ($target === null) {
                    return false;
                }
                if ($target->getAttribute('status') === 'hidden') {
                    return false;
                }
                if ($target instanceof Event && $target->status !== 'published') {
                    return false;
                }

                return true;
            })
            ->map(fn (Favorite $favorite) => [
                'id' => $favorite->id,
                'type' => static::resolveMorphAlias($favorite->favoritable_type),
                'favorited_at' => $favorite->created_at,
                'item' => $favorite->favoritable,
            ])
            ->values();

        return response()->json([
            'message' => 'Daftar favorit berhasil diambil',
            'data' => $favorites,
        ]);
    }
}
