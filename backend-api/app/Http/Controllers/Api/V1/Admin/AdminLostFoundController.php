<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\V1\Concerns\ExportsCsv;
use App\Http\Controllers\Api\V1\Concerns\ModeratesAdminListings;
use App\Http\Controllers\Controller;
use App\Models\LostFoundReport;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminLostFoundController extends Controller
{
    use ExportsCsv, ModeratesAdminListings;

    public function index(Request $request): JsonResponse
    {
        $query = $this->filteredQuery($this->validateFilters($request));

        return response()->json([
            'message' => 'Daftar lost & found admin berhasil diambil',
            'data' => $query->paginate(15),
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $query = $this->filteredQuery($this->validateFilters($request), false);
        $filename = 'lost-found-'.now()->format('Ymd-His').'.csv';

        return $this->streamCsv(
            $filename,
            ['ID', 'Judul', 'Tipe', 'Kategori', 'Lokasi', 'Pelapor', 'Status', 'Laporan', 'Diunggah'],
            $this->chunkedExportRows($query),
            static fn ($row): array => [
                $row->id,
                $row->title,
                $row->type,
                $row->category->name ?? '',
                $row->location,
                $row->user->name ?? '',
                $row->deleted_at ? 'deleted' : $row->status,
                $row->reports_count ?? 0,
                $row->created_at,
            ],
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function validateFilters(Request $request): array
    {
        return $request->validate([
            'tab' => 'nullable|in:all,lost,found,resolved',
            'status' => 'nullable|in:open,active,resolved,hidden,closed,deleted',
            'search' => 'nullable|string|max:255',
            'category_id' => 'nullable|integer|exists:categories,id',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
        ]);
    }

    /**
     * @param array<string, mixed> $validated
     */
    private function filteredQuery(array $validated, bool $withImages = true): Builder
    {
        $relations = ['user:id,name', 'category:id,name,slug'];
        if ($withImages) {
            $relations[] = 'images';
        }

        $query = LostFoundReport::query()
            ->with($relations)
            ->withCount('reports')
            ->latest();

        $tab = $validated['tab'] ?? 'all';
        if ($tab === 'lost') {
            $query->where('type', 'lost');
        } elseif ($tab === 'found') {
            $query->where('type', 'found');
        } elseif ($tab === 'resolved') {
            $query->whereIn('status', ['resolved', 'closed']);
        }

        $statusFilter = $validated['status'] ?? null;
        if ($statusFilter === 'deleted') {
            $query->onlyTrashed();
        } elseif ($statusFilter === 'open' || $statusFilter === 'active') {
            $query->whereIn('status', ['open', 'active']);
        } elseif (! empty($statusFilter)) {
            $query->where('status', $statusFilter);
        } elseif ($tab === 'all') {
            $query->withTrashed();
        }

        if (! empty($validated['search'])) {
            $keyword = (string) $validated['search'];
            $query->where(function ($q) use ($keyword) {
                $q->where('title', 'like', "%{$keyword}%")
                    ->orWhere('location', 'like', "%{$keyword}%");
            });
        }

        $this->applyCategoryAndDateFilters($query, $validated);

        return $query;
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'action' => 'required|in:hide,restore,mark_resolved,delete',
        ]);

        return $this->updateSingleModerationStatus(
            LostFoundReport::class,
            $id,
            $validated['action'],
            'open',
            'Data laporan tidak ditemukan',
            'Status laporan berhasil diperbarui',
        );
    }

    public function bulkStatus(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1|max:100',
            'ids.*' => 'integer',
            'action' => 'required|in:hide,restore,mark_resolved,delete',
        ]);

        return $this->updateBulkModerationStatus(
            LostFoundReport::class,
            $validated['ids'],
            $validated['action'],
            'open',
            'Sebagian data laporan tidak ditemukan',
            'Status laporan berhasil diperbarui',
        );
    }
}
