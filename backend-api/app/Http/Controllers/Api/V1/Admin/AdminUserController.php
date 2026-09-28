<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminUserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => 'nullable|string|max:255',
            'status' => 'nullable|in:active,suspended,banned,inactive',
            'faculty' => 'nullable|string|max:100',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
        ]);

        $query = User::query()
            ->with('profile')
            ->latest();

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (! empty($validated['faculty'])) {
            $faculty = (string) $validated['faculty'];
            $query->whereHas('profile', function ($profile) use ($faculty) {
                $profile->where('faculty', 'like', "%{$faculty}%");
            });
        }

        if (! empty($validated['search'])) {
            $keyword = (string) $validated['search'];
            $query->where(function ($q) use ($keyword) {
                $q->where('name', 'like', "%{$keyword}%")
                    ->orWhere('email', 'like', "%{$keyword}%")
                    ->orWhereHas('profile', function ($profile) use ($keyword) {
                        $profile->where('name', 'like', "%{$keyword}%")
                            ->orWhere('nim', 'like', "%{$keyword}%");
                    });
            });
        }

        if (! empty($validated['date_from'])) {
            $query->whereDate('users.created_at', '>=', $validated['date_from']);
        }

        if (! empty($validated['date_to'])) {
            $query->whereDate('users.created_at', '<=', $validated['date_to']);
        }

        $users = $query->paginate(15);

        return response()->json([
            'message' => 'Daftar pengguna berhasil diambil',
            'data' => $users,
        ]);
    }

    public function show(string $id): JsonResponse
    {
        try {
            $user = User::with('profile')->where('id', $id)->firstOrFail();
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Data pengguna tidak ditemukan',
                'data' => null,
            ], 404);
        }

        $listingsCount = $user->marketplaceListings()->count()
            + $user->serviceListings()->count()
            + $user->kostListings()->count()
            + $user->lostFoundReports()->count();

        $reportsHistory = Report::with('reporter:id,name')
            ->where(function ($q) use ($user) {
                $q->where('reporter_id', $user->id)
                    ->orWhere(function ($q) use ($user) {
                        $q->where('reportable_type', User::class)
                            ->where('reportable_id', $user->id);
                    });
            })
            ->latest()
            ->limit(10)
            ->get();

        return response()->json([
            'message' => 'Detail pengguna berhasil diambil',
            'data' => [
                'user' => $user,
                'listings_count' => $listingsCount,
                'reports_history' => $reportsHistory,
            ],
        ]);
    }

    public function toggleStatus(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'nullable|in:active,suspended,banned,inactive',
        ]);

        try {
            $user = User::where('id', $id)->firstOrFail();
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Data pengguna tidak ditemukan',
                'data' => null,
            ], 404);
        }

        if (! empty($validated['status'])) {
            $user->status = $validated['status'];
        } else {
            $user->status = $user->status === 'active' ? 'suspended' : 'active';
        }

        $user->save();
        $user->load('profile');

        return response()->json([
            'message' => 'Status pengguna berhasil diperbarui',
            'data' => $user,
        ]);
    }

    public function bulkStatus(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1|max:100',
            'ids.*' => 'integer',
            'status' => 'required|in:active,suspended,banned,inactive',
        ]);

        $ids = array_values(array_unique($validated['ids']));

        $found = User::whereIn('id', $ids)->pluck('id')->all();
        $missing = array_values(array_diff($ids, $found));
        if ($missing !== []) {
            return response()->json([
                'message' => 'Sebagian data pengguna tidak ditemukan',
                'data' => ['missing_ids' => $missing],
            ], 422);
        }

        $updated = User::whereIn('id', $ids)->update(['status' => $validated['status']]);

        return response()->json([
            'message' => 'Status pengguna berhasil diperbarui',
            'data' => ['updated' => $updated],
        ]);
    }
}
