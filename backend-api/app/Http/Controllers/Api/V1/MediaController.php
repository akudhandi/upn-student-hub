<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MediaController extends Controller
{
    public function upload(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => 'required|file|image|mimes:jpg,jpeg,png,webp|max:5120',
            'folder' => 'nullable|string|in:listings,marketplace,services,lost-found,events,avatars',
        ]);

        $folder = $validated['folder'] ?? 'listings';
        $relativePath = $request->file('file')->store($folder, 'public');

        return response()->json([
            'message' => 'File berhasil diunggah',
            'data' => [
                'path' => $relativePath,
                'url' => Storage::disk('public')->url($relativePath),
            ],
        ], 201);
    }
}
