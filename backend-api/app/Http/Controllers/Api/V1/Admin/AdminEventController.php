<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Event;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class AdminEventController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'nullable|in:draft,pending,published,rejected,archived',
            'search' => 'nullable|string|max:255',
        ]);

        $query = Event::query()
            ->with([
                'user:id,name',
                'category:id,name,slug',
                'images',
            ])
            ->latest();

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (! empty($validated['search'])) {
            $keyword = (string) $validated['search'];
            $query->where(function ($q) use ($keyword) {
                $q->where('title', 'like', "%{$keyword}%")
                    ->orWhere('organizer_name', 'like', "%{$keyword}%");
            });
        }

        return response()->json([
            'message' => 'Daftar event admin berhasil diambil',
            'data' => $query->paginate(15),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validatePayload($request, false);
        $validated['status'] ??= 'draft';

        $event = Event::create([
            ...$validated,
            'user_id' => $request->user()?->id ?? 1,
            'slug' => Str::slug($validated['title']).'-'.Str::lower(Str::random(5)),
        ]);

        $event->update([
            'event_code' => sprintf('EVT-%s-%04d', $event->created_at->format('Y'), $event->id),
        ]);

        $event->load(['user:id,name', 'category:id,name,slug']);

        return response()->json([
            'message' => 'Event berhasil dibuat',
            'data' => $event,
        ], 201);
    }

    public function show(string $id): JsonResponse
    {
        try {
            $event = Event::with(['user:id,name', 'category:id,name,slug', 'images'])
                ->where('id', $id)
                ->firstOrFail();
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Data event tidak ditemukan',
                'data' => null,
            ], 404);
        }

        return response()->json([
            'message' => 'Detail event berhasil diambil',
            'data' => $event,
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        try {
            $event = Event::where('id', $id)->firstOrFail();
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Data event tidak ditemukan',
                'data' => null,
            ], 404);
        }

        $validated = $this->validatePayload($request, true);

        if (isset($validated['title']) && $validated['title'] !== $event->title) {
            $validated['slug'] = Str::slug($validated['title']).'-'.Str::lower(Str::random(5));
        }

        $event->update($validated);
        $event->load(['user:id,name', 'category:id,name,slug']);

        return response()->json([
            'message' => 'Event berhasil diperbarui',
            'data' => $event,
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        try {
            $event = Event::where('id', $id)->firstOrFail();
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Data event tidak ditemukan',
                'data' => null,
            ], 404);
        }

        $event->delete();

        return response()->json([
            'message' => 'Event berhasil dihapus',
            'data' => null,
        ]);
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:draft,pending,published,rejected,archived',
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

    /**
     * @return array<string, mixed>
     */
    private function validatePayload(Request $request, bool $isUpdate): array
    {
        $required = $isUpdate ? 'sometimes|required' : 'required';

        return $request->validate([
            'title' => "{$required}|string|max:255",
            'category_id' => 'nullable|exists:categories,id',
            'organizer_name' => "{$required}|string|max:255",
            'event_date' => "{$required}|date",
            'event_time' => 'nullable|string|max:50',
            'location' => "{$required}|string|max:255",
            'registration_link' => 'nullable|url|max:2048',
            'speakers' => 'nullable|array',
            'benefits' => 'nullable|array',
            'benefits.*' => 'string|max:255',
            'contact_pics' => 'nullable|array',
            'documents' => 'nullable|array',
            'description' => "{$required}|string",
            'status' => 'nullable|in:draft,pending,published,rejected,archived',
        ]);
    }
}
