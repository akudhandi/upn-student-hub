<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\V1\Concerns\ExportsCsv;
use App\Http\Controllers\Api\V1\Concerns\ModeratesAdminListings;
use App\Http\Controllers\Controller;
use App\Models\ServiceListing;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminServiceController extends Controller
{
    use ExportsCsv, ModeratesAdminListings;

    public function index(Request $request): JsonResponse
    {
        $query = $this->filteredQuery($this->validateFilters($request));

        return response()->json([
            'message' => 'Daftar jasa admin berhasil diambil',
            'data' => $query->paginate(15),
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $query = $this->filteredQuery($this->validateFilters($request), false);
        $filename = 'jasa-'.now()->format('Ymd-His').'.csv';

        return $this->streamCsv(
            $filename,
            ['ID', 'Judul', 'Kategori', 'Penyedia', 'Harga Min', 'Harga Maks', 'Status', 'Laporan', 'Diunggah'],
            $this->chunkedExportRows($query),
            static fn ($row): array => [
                $row->id,
                $row->title,
                $row->category->name ?? '',
                $row->user->name ?? '',
                $row->price_min,
                $row->price_max,
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
            'status' => 'nullable|in:active,hidden,inactive,deleted',
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

        $query = ServiceListing::query()
            ->with($relations)
            ->withCount('reports')
            ->latest();

        $this->applySoftDeleteStatusFilter($query, $validated['status'] ?? null);

        if (! empty($validated['search'])) {
            $keyword = (string) $validated['search'];
            $query->where(function ($q) use ($keyword) {
                $q->where('title', 'like', "%{$keyword}%")
                    ->orWhere('description', 'like', "%{$keyword}%");
            });
        }

        $this->applyCategoryAndDateFilters($query, $validated);

        return $query;
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'action' => 'required|in:hide,restore,delete',
        ]);

        return $this->updateSingleModerationStatus(
            ServiceListing::class,
            $id,
            $validated['action'],
            'active',
            'Data jasa tidak ditemukan',
            'Status jasa berhasil diperbarui',
        );
    }

    public function bulkStatus(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1|max:100',
            'ids.*' => 'integer',
            'action' => 'required|in:hide,restore,delete',
        ]);

        return $this->updateBulkModerationStatus(
            ServiceListing::class,
            $validated['ids'],
            $validated['action'],
            'active',
            'Sebagian data jasa tidak ditemukan',
            'Status jasa berhasil diperbarui',
        );
    }
}
