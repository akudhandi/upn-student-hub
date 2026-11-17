<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\ResolvesStudentUser;
use App\Http\Controllers\Api\V1\Concerns\SyncsListingImages;
use App\Http\Controllers\Controller;
use App\Models\ServiceListing;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServiceController extends Controller
{
    use ResolvesStudentUser, SyncsListingImages;

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'category_id' => 'required|exists:categories,id',
            'price_min' => 'required|numeric|min:0',
            'price_max' => 'nullable|numeric|min:0|gte:price_min',
            'pricing_type' => 'nullable|in:fixed,per_hour,starting_from,negotiable',
            'estimated_time' => 'nullable|string|max:255',
            'payment_method' => 'nullable|in:dp,full,flexible',
            'whatsapp_number' => 'nullable|string|max:20',
            'target_faculties' => 'nullable|array',
            'target_faculties.*' => 'string|max:255',
            'description' => 'required|string',
            'image_paths' => 'nullable|array|max:6',
            'image_paths.*' => 'string|max:500',
        ]);

        $imagePaths = $validated['image_paths'] ?? null;
        unset($validated['image_paths']);

        $listing = ServiceListing::create([
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
            'message' => 'Listing jasa berhasil dibuat',
            'data' => $listing,
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $query = ServiceListing::query()
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

        if ($request->filled('q')) {
            $keyword = (string) $request->query('q');
            $query->where(function ($q) use ($keyword) {
                $q->where('title', 'like', "%{$keyword}%")
                    ->orWhere('description', 'like', "%{$keyword}%");
            });
        }

        return response()->json([
            'message' => 'Daftar jasa berhasil diambil',
            'data' => $query->paginate(12),
        ]);
    }

    public function show(string $id): JsonResponse
    {
        try {
            $listing = ServiceListing::query()
                ->with([
                    'user:id,name',
                    'category:id,name,slug',
                    'images',
                ])
                ->where('id', $id)
                ->firstOrFail();

            return response()->json([
                'message' => 'Detail jasa berhasil diambil',
                'data' => $listing,
            ]);
        } catch (ModelNotFoundException) {
            return response()->json([
                'message' => 'Data jasa tidak ditemukan',
                'data' => null,
            ], 404);
        }
    }

    public function update(Request $request, string $id): JsonResponse
    {
        try {
            $listing = ServiceListing::where('id', $id)->firstOrFail();
        } catch (ModelNotFoundException) {
            return response()->json([
                'message' => 'Data jasa tidak ditemukan',
                'data' => null,
            ], 404);
        }

        if (! $this->isListingOwner($listing, $this->resolveStudentUserId($request))) {
            return response()->json([
                'message' => 'Anda tidak berhak mengubah jasa ini.',
                'data' => null,
            ], 403);
        }

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'category_id' => 'sometimes|required|exists:categories,id',
            'price_min' => 'sometimes|required|numeric|min:0',
            'price_max' => 'nullable|numeric|min:0',
            'pricing_type' => 'nullable|in:fixed,per_hour,starting_from,negotiable',
            'estimated_time' => 'nullable|string|max:255',
            'payment_method' => 'nullable|in:dp,full,flexible',
            'whatsapp_number' => 'nullable|string|max:20',
            'target_faculties' => 'nullable|array',
            'target_faculties.*' => 'string|max:255',
            'description' => 'sometimes|required|string',
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
            'message' => 'Listing jasa berhasil diperbarui',
            'data' => $listing,
        ]);
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        try {
            $listing = ServiceListing::where('id', $id)->firstOrFail();
        } catch (ModelNotFoundException) {
            return response()->json([
                'message' => 'Data jasa tidak ditemukan',
                'data' => null,
            ], 404);
        }

        if (! $this->isListingOwner($listing, $this->resolveStudentUserId($request))) {
            return response()->json([
                'message' => 'Anda tidak berhak mengubah status jasa ini.',
                'data' => null,
            ], 403);
        }

        $validated = $request->validate([
            'status' => 'required|in:active,inactive',
        ]);

        $listing->update(['status' => $validated['status']]);
        $listing->load(['user:id,name', 'category:id,name,slug', 'images']);

        return response()->json([
            'message' => 'Status jasa berhasil diperbarui',
            'data' => $listing,
        ]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        try {
            $listing = ServiceListing::where('id', $id)->firstOrFail();
        } catch (ModelNotFoundException) {
            return response()->json([
                'message' => 'Data jasa tidak ditemukan',
                'data' => null,
            ], 404);
        }

        if (! $this->isListingOwner($listing, $this->resolveStudentUserId($request))) {
            return response()->json([
                'message' => 'Anda tidak berhak menghapus jasa ini.',
                'data' => null,
            ], 403);
        }

        $listing->delete();

        return response()->json([
            'message' => 'Listing jasa berhasil dihapus',
            'data' => null,
        ]);
    }
}
