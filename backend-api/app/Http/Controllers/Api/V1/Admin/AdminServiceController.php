<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\ServiceListing;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminServiceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'nullable|in:active,hidden,inactive,deleted',
            'search' => 'nullable|string|max:255',
        ]);

        $query = ServiceListing::query()
            ->with(['user:id,name', 'category:id,name,slug', 'images'])
            ->withCount('reports')
            ->latest();

        if (($validated['status'] ?? null) === 'deleted') {
            $query->onlyTrashed();
        } elseif (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        } else {
            $query->withTrashed();
        }

        if (! empty($validated['search'])) {
            $keyword = (string) $validated['search'];
            $query->where(function ($q) use ($keyword) {
                $q->where('title', 'like', "%{$keyword}%")
                    ->orWhere('description', 'like', "%{$keyword}%");
            });
        }

        return response()->json([
            'message' => 'Daftar jasa admin berhasil diambil',
            'data' => $query->paginate(15),
        ]);
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'action' => 'required|in:hide,restore,delete',
        ]);

        try {
            $listing = ServiceListing::withTrashed()->where('id', $id)->firstOrFail();
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Data jasa tidak ditemukan',
                'data' => null,
            ], 404);
        }

        if ($validated['action'] === 'hide') {
            $listing->update(['status' => 'hidden']);
        } elseif ($validated['action'] === 'delete') {
            $listing->delete();
        } else {
            if ($listing->trashed()) {
                $listing->restore();
            }
            $listing->update(['status' => 'active']);
        }

        $listing->load(['user:id,name', 'category:id,name,slug']);
        $listing->loadCount('reports');

        return response()->json([
            'message' => 'Status jasa berhasil diperbarui',
            'data' => $listing,
        ]);
    }
}
