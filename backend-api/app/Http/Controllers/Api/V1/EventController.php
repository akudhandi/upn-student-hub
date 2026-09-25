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
            'location' => 'required|string|max:255',
            'registration_link' => 'nullable|url|max:2048',
            'description' => 'required|string',
        ]);

        $event = Event::create([
            ...$validated,
            'user_id' => $request->user()?->id ?? 1,
            'slug' => Str::slug($request->title).'-'.Str::lower(Str::random(5)),
            'status' => 'published',
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
