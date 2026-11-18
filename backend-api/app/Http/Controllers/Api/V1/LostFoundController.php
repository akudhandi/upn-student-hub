<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\ResolvesStudentUser;
use App\Http\Controllers\Api\V1\Concerns\SyncsListingImages;
use App\Http\Controllers\Controller;
use App\Models\LostFoundReport;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LostFoundController extends Controller
{
    use ResolvesStudentUser, SyncsListingImages;

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'required|in:lost,found',
            'title' => 'required|string|max:255',
            'category_id' => 'nullable|exists:categories,id',
            'location' => 'required|string|max:255',
            'date_event' => 'nullable|date',
            'description' => 'required|string',
            'contact_info' => 'required|string|max:50',
            'reward' => 'nullable|string|max:255',
            'image_paths' => 'nullable|array|max:3',
            'image_paths.*' => 'string|max:500',
        ]);

        $imagePaths = $validated['image_paths'] ?? null;
        unset($validated['image_paths']);

        $report = LostFoundReport::create([
            ...$validated,
            'user_id' => $this->resolveStudentUserId($request),
            'status' => 'open',
        ]);

        if (is_array($imagePaths) && $imagePaths !== []) {
            $this->syncImages($report, $imagePaths);
        }

        $report->load([
            'user:id,name',
            'category:id,name,slug',
            'images',
        ]);

        return response()->json([
            'message' => 'Laporan berhasil dibuat',
            'data' => $report,
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $query = LostFoundReport::query()
            ->with([
                'user:id,name',
                'category:id,name,slug',
                'images',
            ])
            ->where('status', '!=', 'hidden')
            ->latest();

        if ($request->filled('type')) {
            $type = $request->query('type');
            if (in_array($type, ['lost', 'found'], true)) {
                $query->where('type', $type);
            }
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->query('category_id'));
        }

        if ($request->filled('q')) {
            $keyword = (string) $request->query('q');
            $query->where(function ($q) use ($keyword) {
                $q->where('title', 'like', "%{$keyword}%")
                    ->orWhere('description', 'like', "%{$keyword}%")
                    ->orWhere('location', 'like', "%{$keyword}%");
            });
        }

        $reports = $query->paginate(12);

        return response()->json([
            'message' => 'Daftar laporan berhasil diambil',
            'data' => $reports,
        ]);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        try {
            $report = LostFoundReport::query()
                ->with([
                    'user:id,name',
                    'category:id,name,slug',
                    'images',
                ])
                ->where('id', $id)
                ->firstOrFail();

            if ($report->status === 'hidden') {
                $viewer = $this->resolveStudentUser($request);
                if ($viewer === null || ! $this->isListingOwner($report, (int) $viewer->id)) {
                    throw new ModelNotFoundException();
                }
            }

            return response()->json([
                'message' => 'Detail laporan berhasil diambil',
                'data' => $report,
            ]);
        } catch (ModelNotFoundException) {
            return response()->json([
                'message' => 'Data laporan tidak ditemukan',
                'data' => null,
            ], 404);
        }
    }

    public function update(Request $request, string $id): JsonResponse
    {
        try {
            $report = LostFoundReport::where('id', $id)->firstOrFail();
        } catch (ModelNotFoundException) {
            return response()->json([
                'message' => 'Data laporan tidak ditemukan',
                'data' => null,
            ], 404);
        }

        if (! $this->isListingOwner($report, $this->resolveStudentUserId($request))) {
            return response()->json([
                'message' => 'Anda tidak berhak mengubah laporan ini.',
                'data' => null,
            ], 403);
        }

        $validated = $request->validate([
            'type' => 'sometimes|required|in:lost,found',
            'title' => 'sometimes|required|string|max:255',
            'category_id' => 'nullable|exists:categories,id',
            'location' => 'sometimes|required|string|max:255',
            'date_event' => 'nullable|date',
            'description' => 'sometimes|required|string',
            'contact_info' => 'sometimes|required|string|max:50',
            'reward' => 'nullable|string|max:255',
            'image_paths' => 'nullable|array|max:3',
            'image_paths.*' => 'string|max:500',
        ]);

        $hasImages = array_key_exists('image_paths', $validated);
        $imagePaths = $validated['image_paths'] ?? [];
        unset($validated['image_paths']);

        if ($validated !== []) {
            $report->update($validated);
        }
        if ($hasImages && is_array($imagePaths)) {
            $this->syncImages($report, $imagePaths);
        }

        $report->load(['user:id,name', 'category:id,name,slug', 'images']);

        return response()->json([
            'message' => 'Laporan berhasil diperbarui',
            'data' => $report,
        ]);
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        try {
            $report = LostFoundReport::where('id', $id)->firstOrFail();
        } catch (ModelNotFoundException) {
            return response()->json([
                'message' => 'Data laporan tidak ditemukan',
                'data' => null,
            ], 404);
        }

        if (! $this->isListingOwner($report, $this->resolveStudentUserId($request))) {
            return response()->json([
                'message' => 'Anda tidak berhak mengubah status laporan ini.',
                'data' => null,
            ], 403);
        }

        if ($report->status === 'hidden') {
            return response()->json([
                'message' => 'Laporan ini sedang disembunyikan oleh moderator dan tidak dapat diubah statusnya.',
                'data' => null,
            ], 403);
        }

        $validated = $request->validate([
            'status' => 'required|in:active,open,resolved,closed',
        ]);

        $normalizedStatus = $validated['status'] === 'active' ? 'open' : $validated['status'];
        $report->update(['status' => $normalizedStatus]);
        $report->load(['user:id,name', 'category:id,name,slug', 'images']);

        return response()->json([
            'message' => 'Status laporan berhasil diperbarui',
            'data' => $report,
        ]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        try {
            $report = LostFoundReport::where('id', $id)->firstOrFail();
        } catch (ModelNotFoundException) {
            return response()->json([
                'message' => 'Data laporan tidak ditemukan',
                'data' => null,
            ], 404);
        }

        if (! $this->isListingOwner($report, $this->resolveStudentUserId($request))) {
            return response()->json([
                'message' => 'Anda tidak berhak menghapus laporan ini.',
                'data' => null,
            ], 403);
        }

        $report->delete();

        return response()->json([
            'message' => 'Laporan berhasil dihapus',
            'data' => null,
        ]);
    }
}
