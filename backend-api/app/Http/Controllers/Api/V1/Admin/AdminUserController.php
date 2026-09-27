<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
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
        ]);

        $query = User::query()
            ->with('profile')
            ->latest();

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

        $users = $query->paginate(15);

        return response()->json([
            'message' => 'Daftar pengguna berhasil diambil',
            'data' => $users,
        ]);
    }

    public function toggleStatus(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'nullable|in:active,suspended,inactive',
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
}
