<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\KostListing;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminKostController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'nullable|in:available,hidden,full,inactive,deleted',
            'search' => 'nullable|string|max:255',
            'gender_type' => 'nullable|in:putra,putri,campur',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
        ]);

        $query = KostListing::query()
            ->with(['user:id,name', 'images'])
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
                    ->orWhere('address', 'like', "%{$keyword}%");
            });
        }

        if (! empty($validated['gender_type'])) {
            $query->where('gender_type', $validated['gender_type']);
        }

        if (! empty($validated['date_from'])) {
            $query->whereDate('created_at', '>=', $validated['date_from']);
        }

        if (! empty($validated['date_to'])) {
            $query->whereDate('created_at', '<=', $validated['date_to']);
        }

        return response()->json([
            'message' => 'Daftar kost admin berhasil diambil',
            'data' => $query->paginate(15),
        ]);
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'action' => 'required|in:hide,restore,delete',
        ]);

        try {
            $listing = KostListing::withTrashed()->where('id', $id)->firstOrFail();
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Data kost tidak ditemukan',
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
            $listing->update(['status' => 'available']);
        }

        $listing->load('user:id,name');
        $listing->loadCount('reports');

        return response()->json([
            'message' => 'Status kost berhasil diperbarui',
            'data' => $listing,
        ]);
    }
}
