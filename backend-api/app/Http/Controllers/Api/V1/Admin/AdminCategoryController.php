<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminCategoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'nullable|in:marketplace,service,event',
        ]);

        $query = Category::query()->orderBy('type')->orderBy('name');

        if (! empty($validated['type'])) {
            $query->where('type', $validated['type']);
        }

        return response()->json([
            'message' => 'Daftar kategori berhasil diambil',
            'data' => $query->paginate(30),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'type' => 'required|in:marketplace,service,event',
        ]);

        $category = Category::create([
            'name' => $validated['name'],
            'slug' => $this->uniqueSlug($validated['name']),
            'type' => $validated['type'],
            'is_active' => true,
        ]);

        return response()->json([
            'message' => 'Kategori berhasil dibuat',
            'data' => $category,
        ], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        try {
            $category = Category::where('id', $id)->firstOrFail();
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Data kategori tidak ditemukan',
                'data' => null,
            ], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:100',
            'type' => 'sometimes|required|in:marketplace,service,event',
        ]);

        if (isset($validated['name']) && $validated['name'] !== $category->name) {
            $validated['slug'] = $this->uniqueSlug($validated['name'], $category->id);
        }

        $category->update($validated);

        return response()->json([
            'message' => 'Kategori berhasil diperbarui',
            'data' => $category,
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        try {
            $category = Category::where('id', $id)->firstOrFail();
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Data kategori tidak ditemukan',
                'data' => null,
            ], 404);
        }

        $category->delete();

        return response()->json([
            'message' => 'Kategori berhasil dihapus',
            'data' => null,
        ]);
    }

    public function toggleActive(string $id): JsonResponse
    {
        try {
            $category = Category::where('id', $id)->firstOrFail();
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Data kategori tidak ditemukan',
                'data' => null,
            ], 404);
        }

        $category->update(['is_active' => ! $category->is_active]);

        return response()->json([
            'message' => 'Status kategori berhasil diperbarui',
            'data' => $category,
        ]);
    }

    private function uniqueSlug(string $name, ?int $ignoreId = null): string
    {
        $base = Str::slug($name) ?: 'kategori';
        $slug = $base;
        $counter = 2;

        while (Category::where('slug', $slug)->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))->exists()) {
            $slug = "{$base}-{$counter}";
            $counter++;
        }

        return $slug;
    }
}
