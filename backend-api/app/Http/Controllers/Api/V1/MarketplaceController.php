<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\ResolvesStudentUser;
use App\Http\Controllers\Api\V1\Concerns\SyncsListingImages;
use App\Http\Controllers\Controller;
use App\Models\MarketplaceListing;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MarketplaceController extends Controller
{
    use ResolvesStudentUser, SyncsListingImages;

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'price' => 'required|numeric|min:0',
            'condition' => 'required|in:new,like-new,good,fair',
            'category_id' => 'required|exists:categories,id',
            'image_paths' => 'nullable|array|max:6',
            'image_paths.*' => 'string|max:500',
        ]);

        $imagePaths = $validated['image_paths'] ?? null;
        unset($validated['image_paths']);

        $listing = MarketplaceListing::create([
            ...$validated,
            'user_id' => $this->resolveStudentUserId($request),
            'status' => 'active',
        ]);

        if (is_array($imagePaths) && $imagePaths !== []) {
            $this->syncImages($listing, $imagePaths);
        }

        $listing->load([
            'user:id,name',
            'category:id,name,slug',
            'images',
        ]);

        return response()->json([
            'message' => 'Listing marketplace berhasil dibuat',
            'data' => $listing,
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $query = MarketplaceListing::query()
            ->with([
                'user:id,name',
                'category:id,name,slug',
                'images',
            ])
            ->where('status', 'active')
            ->latest();

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->query('category_id'));
        }

        if ($request->filled('condition')) {
            $query->where('condition', $request->query('condition'));
        }

        if ($request->filled('q')) {
            $keyword = (string) $request->query('q');
            $query->where(function ($q) use ($keyword) {
                $q->where('title', 'like', "%{$keyword}%")
                    ->orWhere('description', 'like', "%{$keyword}%");
            });
        }

        return response()->json([
            'message' => 'Daftar marketplace berhasil diambil',
            'data' => $query->paginate(12),
        ]);
    }

    public function show(string $id): JsonResponse
    {
        try {
            $listing = MarketplaceListing::query()
                ->with([
                    'user:id,name',
                    'category:id,name,slug',
                    'images',
                ])
                ->where('id', $id)
                ->firstOrFail();

            return response()->json([
                'message' => 'Detail marketplace berhasil diambil',
                'data' => $listing,
            ]);
        } catch (ModelNotFoundException) {
            return response()->json([
                'message' => 'Data marketplace tidak ditemukan',
                'data' => null,
            ], 404);
        }
    }

    public function update(Request $request, string $id): JsonResponse
    {
        try {
            $listing = MarketplaceListing::where('id', $id)->firstOrFail();
        } catch (ModelNotFoundException) {
            return response()->json([
                'message' => 'Data marketplace tidak ditemukan',
                'data' => null,
            ], 404);
        }

        if (! $this->isListingOwner($listing, $this->resolveStudentUserId($request))) {
            return response()->json([
                'message' => 'Anda tidak berhak mengubah listing ini.',
                'data' => null,
            ], 403);
        }

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'sometimes|required|string',
            'price' => 'sometimes|required|numeric|min:0',
            'condition' => 'sometimes|required|in:new,like-new,good,fair',
            'category_id' => 'sometimes|required|exists:categories,id',
            'image_paths' => 'nullable|array|max:6',
            'image_paths.*' => 'string|max:500',
        ]);

        $hasImages = array_key_exists('image_paths', $validated);
        $imagePaths = $validated['image_paths'] ?? [];
        unset($validated['image_paths']);

        if ($validated !== []) {
            $listing->update($validated);
        }
        if ($hasImages && is_array($imagePaths)) {
            $this->syncImages($listing, $imagePaths);
        }

        $listing->load(['user:id,name', 'category:id,name,slug', 'images']);

        return response()->json([
            'message' => 'Listing marketplace berhasil diperbarui',
            'data' => $listing,
        ]);
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        try {
            $listing = MarketplaceListing::where('id', $id)->firstOrFail();
        } catch (ModelNotFoundException) {
            return response()->json([
                'message' => 'Data marketplace tidak ditemukan',
                'data' => null,
            ], 404);
        }

        if (! $this->isListingOwner($listing, $this->resolveStudentUserId($request))) {
            return response()->json([
                'message' => 'Anda tidak berhak mengubah status listing ini.',
                'data' => null,
            ], 403);
        }

        $validated = $request->validate([
            'status' => 'required|in:active,sold,inactive',
        ]);

        $listing->update(['status' => $validated['status']]);
        $listing->load(['user:id,name', 'category:id,name,slug', 'images']);

        return response()->json([
            'message' => 'Status listing berhasil diperbarui',
            'data' => $listing,
        ]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        try {
            $listing = MarketplaceListing::where('id', $id)->firstOrFail();
        } catch (ModelNotFoundException) {
            return response()->json([
                'message' => 'Data marketplace tidak ditemukan',
                'data' => null,
            ], 404);
        }

        if (! $this->isListingOwner($listing, $this->resolveStudentUserId($request))) {
            return response()->json([
                'message' => 'Anda tidak berhak menghapus listing ini.',
                'data' => null,
            ], 403);
        }

        $listing->delete();

        return response()->json([
            'message' => 'Listing marketplace berhasil dihapus',
            'data' => null,
        ]);
    }
}
