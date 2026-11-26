<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\ResolvesMorphType;
use App\Http\Controllers\Api\V1\Concerns\ResolvesStudentUser;
use App\Http\Controllers\Controller;
use App\Models\MarketplaceListing;
use App\Models\Rating;
use App\Models\ServiceListing;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    use ResolvesMorphType, ResolvesStudentUser;

    /**
     * @var list<class-string>
     */
    private const REVIEWABLE_CLASSES = [
        MarketplaceListing::class,
        ServiceListing::class,
    ];

    private function resolveReviewableClass(string $type): ?string
    {
        $class = static::resolveMorphClass($type);
        if ($class === null || ! in_array($class, self::REVIEWABLE_CLASSES, true)) {
            return null;
        }

        return $class;
    }

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'required|string',
            'id' => 'required|integer|min:1',
        ]);

        $class = $this->resolveReviewableClass($validated['type']);
        if ($class === null) {
            return response()->json([
                'message' => 'Tipe ulasan tidak valid. Ulasan hanya tersedia untuk Marketplace dan Jasa.',
                'data' => null,
            ], 422);
        }

        $limit = max(1, min(100, (int) $request->query('limit', 20)));
        $page = max(1, (int) $request->query('page', 1));

        $summaryRows = Rating::query()
            ->selectRaw('rating, COUNT(*) as aggregate_count')
            ->where('rateable_type', $class)
            ->where('rateable_id', $validated['id'])
            ->groupBy('rating')
            ->pluck('aggregate_count', 'rating');

        $count = 0;
        $weightedSum = 0;
        $distribution = [5 => 0, 4 => 0, 3 => 0, 2 => 0, 1 => 0];
        foreach ($distribution as $star => $_) {
            $starCount = (int) ($summaryRows[$star] ?? 0);
            $distribution[$star] = $starCount;
            $count += $starCount;
            $weightedSum += $star * $starCount;
        }
        $average = $count > 0 ? round($weightedSum / $count, 1) : 0;

        $reviews = Rating::query()
            ->with('user:id,name,account_type')
            ->where('rateable_type', $class)
            ->where('rateable_id', $validated['id'])
            ->latest('id')
            ->forPage($page, $limit)
            ->get();

        return response()->json([
            'message' => 'Daftar ulasan berhasil diambil',
            'data' => [
                'summary' => [
                    'count' => $count,
                    'average' => $average,
                    'distribution' => $distribution,
                ],
                'reviews' => $reviews,
                'meta' => [
                    'total' => $count,
                    'limit' => $limit,
                    'page' => $page,
                    'has_more' => ($page * $limit) < $count,
                ],
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

        $class = $this->resolveReviewableClass($validated['reviewable_type']);
        if ($class === null) {
            return response()->json([
                'message' => 'Tipe ulasan tidak valid. Ulasan hanya tersedia untuk Marketplace dan Jasa.',
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

        $userId = $this->resolveStudentUserId($request);

        if ($this->isListingOwner($target, $userId)) {
            return response()->json([
                'message' => 'Anda tidak dapat memberikan ulasan pada iklan milik sendiri.',
                'data' => null,
            ], 422);
        }

        $alreadyReviewed = Rating::query()
            ->where('user_id', $userId)
            ->where('rateable_type', $class)
            ->where('rateable_id', $target->id)
            ->exists();

        if ($alreadyReviewed) {
            return response()->json([
                'message' => 'Anda sudah memberikan ulasan untuk iklan ini.',
                'data' => null,
            ], 422);
        }

        $rating = Rating::create([
            'user_id' => $userId,
            'rateable_type' => $class,
            'rateable_id' => $target->id,
            'rating' => $validated['rating'],
            'review' => $validated['comment'] ?? null,
        ]);

        $rating->load('user:id,name,account_type');

        return response()->json([
            'message' => 'Ulasan berhasil dikirim',
            'data' => $rating,
        ], 201);
    }
}
