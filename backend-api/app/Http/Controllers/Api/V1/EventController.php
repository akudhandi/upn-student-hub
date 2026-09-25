<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Event;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class EventController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'category_id' => 'nullable|exists:categories,id',
            'organizer_name' => 'required|string|max:255',
            'event_date' => 'required|date',
            'event_time' => 'nullable|string|max:50',
            'location' => 'required|string|max:255',
            'registration_link' => 'nullable|url|max:2048',
            'speakers' => 'nullable|array',
            'speakers.*.name' => 'required|string|max:255',
            'speakers.*.role' => 'nullable|string|max:50',
            'speakers.*.organization' => 'nullable|string|max:255',
            'speakers.*.topic' => 'nullable|string|max:500',
            'benefits' => 'nullable|array',
            'benefits.*' => 'string|max:255',
            'contact_pics' => 'nullable|array',
            'contact_pics.*.name' => 'required|string|max:255',
            'contact_pics.*.whatsapp' => 'nullable|string|max:20',
            'contact_pics.*.email' => 'nullable|string|max:255',
            'documents' => 'nullable|array',
            'documents.*.name' => 'required|string|max:255',
            'documents.*.meta' => 'nullable|string|max:255',
            'description' => 'required|string',
        ]);

        $event = Event::create([
            ...$validated,
            'user_id' => $request->user()?->id ?? 1,
            'slug' => Str::slug($request->title).'-'.Str::lower(Str::random(5)),
            'status' => 'published',
        ]);

        // Deterministic, unique event code derived from the new id.
        $event->update([
            'event_code' => sprintf('EVT-%s-%04d', $event->created_at->format('Y'), $event->id),
        ]);

        $event->load([
            'user:id,name',
            'category:id,name,slug',
        ]);

        return response()->json([
            'message' => 'Event berhasil dibuat',
            'data' => $event,
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $query = Event::query()
            ->with([
                'user:id,name',
                'category:id,name,slug',
            ])
            ->orderBy('event_date', 'asc');

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->query('category_id'));
        }

        if ($request->filled('q')) {
            $keyword = (string) $request->query('q');
            $query->where(function ($q) use ($keyword) {
                $q->where('title', 'like', "%{$keyword}%")
                    ->orWhere('description', 'like', "%{$keyword}%")
                    ->orWhere('location', 'like', "%{$keyword}%")
                    ->orWhere('organizer_name', 'like', "%{$keyword}%");
            });
        }

        $events = $query->paginate(12);

        return response()->json([
            'message' => 'Daftar event berhasil diambil',
            'data' => $events,
        ]);
    }

    public function show(string $id): JsonResponse
    {
        try {
            $event = Event::query()
                ->with([
                    'user:id,name',
                    'category:id,name,slug',
                ])
                ->where('id', $id)
                ->firstOrFail();

            return response()->json([
                'message' => 'Detail event berhasil diambil',
                'data' => $event,
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Data event tidak ditemukan',
                'data' => null,
            ], 404);
        }
    }
}
