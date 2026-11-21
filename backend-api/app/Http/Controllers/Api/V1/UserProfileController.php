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

        if ($marketplaceIds->isEmpty() && $serviceIds->isEmpty()) {
            $ratingCount = 0;
            $ratingAverage = 0.0;
            $recentReviews = collect();
        } else {
            $reviewsQuery = Rating::query()
                ->where(function ($q) use ($marketplaceIds, $serviceIds) {
                    if ($marketplaceIds->isNotEmpty()) {
                        $q->where(function ($sub) use ($marketplaceIds) {
                            $sub->where('rateable_type', MarketplaceListing::class)
                                ->whereIn('rateable_id', $marketplaceIds);
                        });
                    }
                    if ($serviceIds->isNotEmpty()) {
                        $q->orWhere(function ($sub) use ($serviceIds) {
                            $sub->where('rateable_type', ServiceListing::class)
                                ->whereIn('rateable_id', $serviceIds);
                        });
                    }
                });

            $aggregate = (clone $reviewsQuery)
                ->selectRaw('COUNT(*) as rating_count, COALESCE(AVG(rating), 0) as rating_avg')
                ->first();

            $ratingCount = (int) ($aggregate?->rating_count ?? 0);
            $ratingAverage = $ratingCount > 0
                ? round((float) ($aggregate?->rating_avg ?? 0), 1)
                : 0.0;

            $recentReviews = $reviewsQuery
                ->with(['user:id,name', 'rateable'])
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
        }

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

        $avatarUpdate = ['provided' => false, 'value' => null];
        if (array_key_exists('avatar', $validated)) {
            $avatarUpdate['provided'] = true;
            $avatar = $validated['avatar'];
            if ($avatar === null) {
                $avatarUpdate['value'] = null;
            } elseif (is_string($avatar)) {
                $raw = trim($avatar);
                if ($raw === '') {
                    $avatarUpdate['value'] = null;
                } else {
                    $normalized = ltrim($raw, '/');
                    $trimmed = preg_replace('#^storage/#', '', $normalized) ?? $normalized;
                    if (
                        preg_match('/^[a-z][a-z0-9+\-.]*:/i', $trimmed) === 1
                        || str_contains($trimmed, '..')
                        || str_contains($trimmed, '\\')
                        || preg_match('/[\x00-\x1F\x7F]/', $trimmed) === 1
                        || ! str_starts_with($trimmed, 'avatars/')
                        || strlen($trimmed) <= strlen('avatars/')
                    ) {
                        return response()->json([
                            'message' => 'Path avatar tidak valid.',
                            'errors' => ['avatar' => ['Path avatar harus merujuk ke folder avatars/ yang valid.']],
                        ], 422);
                    }
                    $avatarUpdate['value'] = $trimmed;
                }
            }
        }

        DB::transaction(function () use ($user, $validated, $avatarUpdate) {
            $user->update(['name' => $validated['name']]);

            $profilePayload = [
                'name' => $validated['name'],
                'nim' => $validated['nim'] ?? null,
                'faculty' => $validated['faculty'] ?? null,
                'bio' => $validated['bio'] ?? null,
            ];

            if ($avatarUpdate['provided']) {
                $profilePayload['avatar'] = $avatarUpdate['value'];
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
