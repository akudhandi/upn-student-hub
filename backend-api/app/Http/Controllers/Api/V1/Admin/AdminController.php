<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if ($denied = $this->denyUnlessSuperadmin($request)) {
            return $denied;
        }

        $admins = Admin::query()
            ->latest()
            ->paginate(15, ['id', 'email', 'role', 'created_at']);

        return response()->json([
            'message' => 'Daftar admin berhasil diambil',
            'data' => $admins,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        if ($denied = $this->denyUnlessSuperadmin($request)) {
            return $denied;
        }

        $validated = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('admins', 'email')],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['nullable', 'in:admin,superadmin'],
        ]);

        $admin = Admin::create([
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'] ?? 'admin',
        ]);

        return response()->json([
            'message' => 'Admin berhasil ditambahkan',
            'data' => $admin->only(['id', 'email', 'role', 'created_at']),
        ], 201);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        if ($denied = $this->denyUnlessSuperadmin($request)) {
            return $denied;
        }

        try {
            $admin = Admin::where('id', $id)->firstOrFail();
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Data admin tidak ditemukan',
                'data' => null,
            ], 404);
        }

        if ((int) $request->user()->id === (int) $admin->id) {
            return response()->json([
                'message' => 'Tidak dapat menghapus akun sendiri',
                'data' => null,
            ], 422);
        }

        $admin->tokens()->delete();
        $admin->delete();

        return response()->json([
            'message' => 'Admin berhasil dihapus',
            'data' => null,
        ]);
    }

    private function denyUnlessSuperadmin(Request $request): ?JsonResponse
    {
        if ($request->user()?->role !== 'superadmin') {
            return response()->json([
                'message' => 'Akses ditolak. Hanya superadmin yang dapat mengelola admin.',
                'data' => null,
            ], 403);
        }

        return null;
    }
}
