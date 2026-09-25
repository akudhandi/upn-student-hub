<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\ResolvesMorphType;
use App\Http\Controllers\Controller;
use App\Models\Favorite;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FavoriteController extends Controller
{
    use ResolvesMorphType;

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

        $userId = $request->user()?->id ?? 1;

        $favorite = Favorite::query()
            ->where('user_id', $userId)
            ->where('favoritable_type', $class)
            ->where('favoritable_id', $target->id)
            ->first();

        if ($favorite) {
            $favorite->delete();
            $favorited = false;
        } else {
            Favorite::create([
                'user_id' => $userId,
                'favoritable_type' => $class,
                'favoritable_id' => $target->id,
            ]);
            $favorited = true;
        }

        return response()->json([
            'message' => $favorited ? 'Ditambahkan ke favorit' : 'Dihapus dari favorit',
            'favorited' => $favorited,
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()?->id ?? 1;

        $favorites = Favorite::query()
            ->with('favoritable')
            ->where('user_id', $userId)
            ->latest()
            ->get()
            ->filter(fn (Favorite $favorite) => $favorite->favoritable !== null)
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
