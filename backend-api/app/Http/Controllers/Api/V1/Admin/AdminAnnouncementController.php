<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminAnnouncementController extends Controller
{
    public function index(): JsonResponse
    {
        $announcements = Announcement::with('admin:id,email')
            ->latest()
            ->paginate(15);

        return response()->json([
            'message' => 'Daftar pengumuman berhasil diambil',
            'data' => $announcements,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'message' => 'required|string|max:2000',
            'target_role' => 'nullable|in:all,student',
        ]);

        $announcement = Announcement::create([
            'title' => $validated['title'],
            'message' => $validated['message'],
            'target_role' => $validated['target_role'] ?? 'all',
            'admin_id' => $request->user()?->id,
        ]);

        return response()->json([
            'message' => 'Pengumuman berhasil dikirim',
            'data' => $announcement,
        ], 201);
    }

    public function destroy(string $id): JsonResponse
    {
        $announcement = Announcement::where('id', $id)->first();

        if ($announcement === null) {
            return response()->json([
                'message' => 'Data pengumuman tidak ditemukan',
                'data' => null,
            ], 404);
        }

        $announcement->delete();

        return response()->json([
            'message' => 'Pengumuman berhasil dihapus',
            'data' => null,
        ]);
    }
}
