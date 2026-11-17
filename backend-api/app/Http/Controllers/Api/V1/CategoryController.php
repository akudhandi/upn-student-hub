<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'nullable|string|in:marketplace,service,lost_found,event',
        ]);

        $query = Category::query()
            ->where('is_active', true)
            ->orderBy('name');

        if (! empty($validated['type'])) {
            $query->where('type', $validated['type']);
        }

        return response()->json([
            'message' => 'Daftar kategori berhasil diambil',
            'data' => $query->get(['id', 'name', 'slug', 'type']),
        ]);
    }
}
