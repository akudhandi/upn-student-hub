<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\ResolvesStudentUser;
use App\Http\Controllers\Api\V1\Concerns\SyncsListingImages;
use App\Http\Controllers\Controller;
use App\Models\Event;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class EventController extends Controller
{
    use ResolvesStudentUser, SyncsListingImages;

    public function store(Request $request): JsonResponse
    {
        $studentUser = $this->resolveStudentUser($request);
        if ($studentUser === null || ! $studentUser->isOfficialAccount()) {
            return response()->json([
                'message' => 'Pengajuan event hanya tersedia untuk akun resmi HIMA, Ormawa, atau Fakultas.',
            ], 403);
        }

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
            'image_paths' => 'nullable|array|max:3',
            'image_paths.*' => 'string|max:500',
        ]);

        $imagePaths = $validated['image_paths'] ?? null;
        unset($validated['image_paths']);

        $event = Event::create([
            ...$validated,
            'user_id' => $studentUser->id,
            'slug' => Str::slug($request->title).'-'.Str::lower(Str::random(5)),
            'status' => 'pending',
            'is_verified' => true,
        ]);

        $event->update([
            'event_code' => sprintf('EVT-%s-%04d', $event->created_at->format('Y'), $event->id),
        ]);

        if (is_array($imagePaths) && $imagePaths !== []) {
            $this->syncImages($event, $imagePaths);
        }

        $event->load([
            'user:id,name,account_type',
            'category:id,name,slug',
            'images',
        ]);

        return response()->json([
            'message' => 'Pengajuan event berhasil dikirim dan menunggu kurasi admin',
            'data' => $event,
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $query = Event::query()
            ->with([
                'user:id,name,account_type',
                'category:id,name,slug',
                'images',
            ])
            ->where('status', 'published')
            ->orderBy('event_date', 'asc');

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->query('category_id'));
        }

        if ($request->boolean('upcoming')) {
            $query->where('event_date', '>=', now()->startOfDay());
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

    public function show(Request $request, string $id): JsonResponse
    {
        try {
            $event = Event::query()
                ->with([
                    'user:id,name,account_type',
                    'category:id,name,slug',
                    'images',
                ])
                ->where('id', $id)
                ->firstOrFail();

            if ($event->status !== 'published') {
                $viewer = $this->resolveStudentUser($request);
                if ($viewer === null || ! $this->isListingOwner($event, (int) $viewer->id)) {
                    throw new ModelNotFoundException();
                }
            }

            return response()->json([
                'message' => 'Detail event berhasil diambil',
                'data' => $event,
            ]);
        } catch (ModelNotFoundException) {
            return response()->json([
                'message' => 'Data event tidak ditemukan',
                'data' => null,
            ], 404);
        }
    }
}
