<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnnouncementController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'limit' => 'nullable|integer|min:1|max:50',
        ]);

        $announcements = Announcement::query()
            ->whereIn('target_role', ['all', 'student'])
            ->latest()
            ->limit($validated['limit'] ?? 20)
            ->get(['id', 'title', 'message', 'target_role', 'created_at']);

        return response()->json([
            'message' => 'Daftar pengumuman berhasil diambil',
            'data' => $announcements,
        ]);
    }
}
