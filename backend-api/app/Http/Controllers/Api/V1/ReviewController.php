<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\ResolvesMorphType;
use App\Http\Controllers\Controller;
use App\Models\Rating;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    use ResolvesMorphType;

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'required|string',
            'id' => 'required|integer|min:1',
        ]);

        $class = static::resolveMorphClass($validated['type']);
        if ($class === null) {
            return response()->json([
                'message' => 'Tipe ulasan tidak valid',
                'data' => null,
            ], 422);
        }

        $reviews = Rating::query()
            ->with('user:id,name')
            ->where('rateable_type', $class)
            ->where('rateable_id', $validated['id'])
            ->latest()
            ->get();

        $count = $reviews->count();
        $distribution = [5 => 0, 4 => 0, 3 => 0, 2 => 0, 1 => 0];
        foreach ($reviews as $review) {
            if (isset($distribution[$review->rating])) {
                $distribution[$review->rating]++;
            }
        }

        return response()->json([
            'message' => 'Daftar ulasan berhasil diambil',
            'data' => [
                'summary' => [
                    'count' => $count,
                    'average' => $count > 0 ? round($reviews->avg('rating'), 1) : 0,
                    'distribution' => $distribution,
                ],
                'reviews' => $reviews,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'reviewable_type' => 'required|string',
            'reviewable_id' => 'required|integer|min:1',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
        ]);

        $class = static::resolveMorphClass($validated['reviewable_type']);
        if ($class === null) {
            return response()->json([
                'message' => 'Tipe ulasan tidak valid',
                'data' => null,
            ], 422);
        }

        $target = $class::query()->where('id', $validated['reviewable_id'])->first();
        if ($target === null) {
            return response()->json([
                'message' => 'Data tidak ditemukan',
                'data' => null,
            ], 404);
        }

        $rating = Rating::create([
            'user_id' => $request->user()?->id ?? 1,
            'rateable_type' => $class,
            'rateable_id' => $target->id,
            'rating' => $validated['rating'],
            'review' => $validated['comment'] ?? null,
        ]);

        $rating->load('user:id,name');

        return response()->json([
            'message' => 'Ulasan berhasil dikirim',
            'data' => $rating,
        ], 201);
    }
}
