<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Event;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class AdminEventController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'nullable|in:pending,published,rejected',
        ]);

        $query = Event::query()
            ->with([
                'user:id,name',
                'category:id,name,slug',
            ])
            ->latest();

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        $events = $query->paginate(15);

        return response()->json([
            'message' => 'Daftar event admin berhasil diambil',
            'data' => $events,
        ]);
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:published,rejected',
            'rejection_reason' => 'nullable|string|max:2000',
        ]);

        try {
            $event = Event::where('id', $id)->firstOrFail();
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Data event tidak ditemukan',
                'data' => null,
            ], 404);
        }

        $event->status = $validated['status'];

        // Persist rejection_reason only when the column exists, keeping
        // the endpoint forward-compatible without requiring a migration.
        if (
            array_key_exists('rejection_reason', $validated)
            && $validated['rejection_reason'] !== null
            && Schema::hasColumn('events', 'rejection_reason')
        ) {
            $event->setAttribute('rejection_reason', $validated['rejection_reason']);
        }

        $event->save();
        $event->load([
            'user:id,name',
            'category:id,name,slug',
        ]);

        return response()->json([
            'message' => 'Status event berhasil diperbarui',
            'data' => $event,
        ]);
    }
}
