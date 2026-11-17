<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\ResolvesStudentUser;
use App\Http\Controllers\Controller;
use App\Models\MarketplaceListing;
use App\Models\Rating;
use App\Models\ServiceListing;
use App\Models\StudentProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class UserProfileController extends Controller
{
    use ResolvesStudentUser;

    public function me(Request $request): JsonResponse
    {
        $user = $this->resolveStudentUser($request);
        if ($user === null) {
            return response()->json([
                'message' => 'Unauthenticated.',
                'data' => null,
            ], 401);
        }

        $user->load('profile');

        $marketplace = $user->marketplaceListings()
            ->with(['category:id,name,slug', 'images'])
            ->latest()
            ->get();

        $services = $user->serviceListings()
            ->with(['category:id,name,slug', 'images'])
            ->latest()
            ->get();

        $lostFound = $user->lostFoundReports()
            ->with(['category:id,name,slug', 'images'])
            ->latest()
            ->get();

        $marketplaceIds = $marketplace->pluck('id');
        $serviceIds = $services->pluck('id');

        $reviewsQuery = Rating::query()
            ->with(['user:id,name', 'rateable'])
            ->where(function ($q) use ($marketplaceIds, $serviceIds) {
                $q->where(function ($sub) use ($marketplaceIds) {
                    $sub->where('rateable_type', MarketplaceListing::class)
                        ->whereIn('rateable_id', $marketplaceIds);
                })->orWhere(function ($sub) use ($serviceIds) {
                    $sub->where('rateable_type', ServiceListing::class)
                        ->whereIn('rateable_id', $serviceIds);
                });
            });

        $ratingCount = (clone $reviewsQuery)->count();
        $ratingAverage = $ratingCount > 0
            ? round((float) (clone $reviewsQuery)->avg('rating'), 1)
            : 0.0;

        $recentReviews = $reviewsQuery
            ->latest()
            ->limit(10)
            ->get()
            ->map(fn (Rating $rating) => [
                'id' => $rating->id,
                'rating' => $rating->rating,
                'review' => $rating->review,
                'created_at' => $rating->created_at,
                'reviewer_name' => $rating->user?->name ?? 'Mahasiswa UPN',
                'target_title' => $rating->rateable?->getAttribute('title') ?? 'Listing',
            ])
            ->values();

        $activeCount = $marketplace->where('status', 'active')->count()
            + $services->where('status', 'active')->count()
            + $lostFound->whereIn('status', ['active', 'open'])->count();

        $completedCount = $marketplace->where('status', 'sold')->count()
            + $lostFound->whereIn('status', ['resolved', 'closed'])->count();

        return response()->json([
            'message' => 'Profil pengguna berhasil diambil',
            'data' => [
                'user' => $user,
                'stats' => [
                    'active_listings_count' => $activeCount,
                    'completed_count' => $completedCount,
                    'rating_average' => $ratingAverage,
                    'rating_count' => $ratingCount,
                ],
                'listings' => [
                    'marketplace' => $marketplace,
                    'services' => $services,
                    'lost_found' => $lostFound,
                ],
                'reviews' => $recentReviews,
            ],
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $this->resolveStudentUser($request);
        if ($user === null) {
            return response()->json([
                'message' => 'Unauthenticated.',
                'data' => null,
            ], 401);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'nim' => 'nullable|string|max:50',
            'faculty' => 'nullable|string|max:255',
            'bio' => 'nullable|string|max:1000',
            'avatar' => 'nullable|string|max:500',
        ]);

        DB::transaction(function () use ($user, $validated) {
            $user->update(['name' => $validated['name']]);

            $profilePayload = [
                'name' => $validated['name'],
                'nim' => $validated['nim'] ?? null,
                'faculty' => $validated['faculty'] ?? null,
                'bio' => $validated['bio'] ?? null,
            ];

            if (array_key_exists('avatar', $validated)) {
                $avatar = $validated['avatar'];
                if (is_string($avatar)) {
                    $trimmed = ltrim(trim($avatar), '/');
                    $trimmed = preg_replace('#^storage/#', '', $trimmed) ?? $trimmed;
                    if ($trimmed !== '' && ! str_contains($trimmed, '..')) {
                        $profilePayload['avatar'] = $trimmed;
                    }
                } elseif ($avatar === null) {
                    $profilePayload['avatar'] = null;
                }
            }

            StudentProfile::updateOrCreate(
                ['user_id' => $user->id],
                $profilePayload
            );
        });

        $user->refresh()->load('profile');

        return response()->json([
            'message' => 'Profil berhasil diperbarui',
            'data' => $user,
        ]);
    }
}
