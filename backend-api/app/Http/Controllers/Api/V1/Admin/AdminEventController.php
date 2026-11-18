<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\V1\Concerns\SyncsListingImages;
use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminEventController extends Controller
{
    use SyncsListingImages;
    public function index(Request $request): JsonResponse
    {
        $query = $this->filteredQuery($this->validateFilters($request));

        return response()->json([
            'message' => 'Daftar event admin berhasil diambil',
            'data' => $query->paginate(15),
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $rows = $this->filteredQuery($this->validateFilters($request))
            ->limit(5000)
            ->get();

        $filename = 'event-'.now()->format('Ymd-His').'.csv';

        return response()->streamDownload(function () use ($rows) {
            $handle = fopen('php://output', 'w');
            fwrite($handle, "\xEF\xBB\xBF");
            fputcsv($handle, ['ID', 'Judul', 'Kategori', 'Penyelenggara', 'Tanggal Acara', 'Lokasi', 'Status', 'Diunggah']);
            foreach ($rows as $row) {
                fputcsv($handle, [
                    $row->id,
                    $row->title,
                    $row->category->name ?? '',
                    $row->organizer_name,
                    $row->event_date,
                    $row->location,
                    $row->status,
                    $row->created_at,
                ]);
            }
            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /**
     * @return array<string, mixed>
     */
    private function validateFilters(Request $request): array
    {
        return $request->validate([
            'status' => 'nullable|in:draft,pending,published,rejected,archived',
            'search' => 'nullable|string|max:255',
            'category_id' => 'nullable|integer|exists:categories,id',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
        ]);
    }

    /**
     * @param array<string, mixed> $validated
     */
    private function filteredQuery(array $validated): Builder
    {
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

        if (! empty($validated['category_id'])) {
            $query->where('category_id', $validated['category_id']);
        }

        if (! empty($validated['date_from'])) {
            $query->whereDate('event_date', '>=', $validated['date_from']);
        }

        if (! empty($validated['date_to'])) {
            $query->whereDate('event_date', '<=', $validated['date_to']);
        }

        return $query;
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validatePayload($request, false);
        $validated['status'] ??= 'draft';

        $imagePaths = $validated['image_paths'] ?? null;
        unset($validated['image_paths']);

        $ownerUserId = $request->user() instanceof User
            ? $request->user()->id
            : (User::query()
                ->whereIn('account_type', User::OFFICIAL_ACCOUNT_TYPES)
                ->value('id')
                ?? User::query()->create([
                    'name' => 'UPN Kemahasiswaan',
                    'email' => 'kemahasiswaan@upnjatim.ac.id',
                    'password' => Hash::make(Str::random(32)),
                    'status' => 'active',
                    'account_type' => 'faculty',
                ])->id);

        $event = Event::create([
            ...$validated,
            'user_id' => $ownerUserId,
            'slug' => Str::slug($validated['title']).'-'.Str::lower(Str::random(5)),
            'is_verified' => true,
        ]);

        $event->update([
            'event_code' => sprintf('EVT-%s-%04d', $event->created_at->format('Y'), $event->id),
        ]);

        if (is_array($imagePaths) && $imagePaths !== []) {
            $this->syncImages($event, $imagePaths);
        }

        $event->load(['user:id,name,account_type', 'category:id,name,slug', 'images']);

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
        $hasImages = array_key_exists('image_paths', $validated);
        $imagePaths = $validated['image_paths'] ?? [];
        unset($validated['image_paths']);

        if (isset($validated['title']) && $validated['title'] !== $event->title) {
            $validated['slug'] = Str::slug($validated['title']).'-'.Str::lower(Str::random(5));
        }

        if ($validated !== []) {
            $event->update($validated);
        }

        if ($hasImages && is_array($imagePaths)) {
            $this->syncImages($event, $imagePaths);
        }

        $event->load(['user:id,name', 'category:id,name,slug', 'images']);

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
            'image_paths' => 'nullable|array|max:3',
            'image_paths.*' => 'string|max:500',
        ]);
    }
}
