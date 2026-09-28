<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\MarketplaceListing;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminMarketplaceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = $this->filteredQuery($this->validateFilters($request));

        return response()->json([
            'message' => 'Daftar marketplace admin berhasil diambil',
            'data' => $query->paginate(15),
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $rows = $this->filteredQuery($this->validateFilters($request))
            ->limit(5000)
            ->get();

        $filename = 'marketplace-'.now()->format('Ymd-His').'.csv';

        return response()->streamDownload(function () use ($rows) {
            $handle = fopen('php://output', 'w');
            fwrite($handle, "\xEF\xBB\xBF");
            fputcsv($handle, ['ID', 'Judul', 'Kategori', 'Penjual', 'Harga', 'Kondisi', 'Status', 'Laporan', 'Diunggah']);
            foreach ($rows as $row) {
                fputcsv($handle, [
                    $row->id,
                    $row->title,
                    $row->category->name ?? '',
                    $row->user->name ?? '',
                    $row->price,
                    $row->condition,
                    $row->deleted_at ? 'deleted' : $row->status,
                    $row->reports_count ?? 0,
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
            'status' => 'nullable|in:active,hidden,sold,inactive,deleted',
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
        $query = MarketplaceListing::query()
            ->with(['user:id,name', 'category:id,name,slug', 'images'])
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
                    ->orWhere('description', 'like', "%{$keyword}%");
            });
        }

        if (! empty($validated['category_id'])) {
            $query->where('category_id', $validated['category_id']);
        }

        if (! empty($validated['date_from'])) {
            $query->whereDate('created_at', '>=', $validated['date_from']);
        }

        if (! empty($validated['date_to'])) {
            $query->whereDate('created_at', '<=', $validated['date_to']);
        }

        return $query;
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'action' => 'required|in:hide,restore,delete',
        ]);

        try {
            $listing = MarketplaceListing::withTrashed()->where('id', $id)->firstOrFail();
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Data listing tidak ditemukan',
                'data' => null,
            ], 404);
        }

        $this->applyAction($listing, $validated['action']);

        $listing->load(['user:id,name', 'category:id,name,slug']);
        $listing->loadCount('reports');

        return response()->json([
            'message' => 'Status listing berhasil diperbarui',
            'data' => $listing,
        ]);
    }

    public function bulkStatus(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1|max:100',
            'ids.*' => 'integer',
            'action' => 'required|in:hide,restore,delete',
        ]);

        $ids = array_values(array_unique($validated['ids']));

        $found = MarketplaceListing::withTrashed()->whereIn('id', $ids)->pluck('id')->all();
        $missing = array_values(array_diff($ids, $found));
        if ($missing !== []) {
            return response()->json([
                'message' => 'Sebagian data listing tidak ditemukan',
                'data' => ['missing_ids' => $missing],
            ], 422);
        }

        DB::transaction(function () use ($ids, $validated) {
            $listings = MarketplaceListing::withTrashed()->whereIn('id', $ids)->get();
            foreach ($listings as $listing) {
                $this->applyAction($listing, $validated['action']);
            }
        });

        return response()->json([
            'message' => 'Status listing berhasil diperbarui',
            'data' => ['updated' => count($ids)],
        ]);
    }

    private function applyAction(MarketplaceListing $listing, string $action): void
    {
        if ($action === 'hide') {
            $listing->update(['status' => 'hidden']);
        } elseif ($action === 'delete') {
            $listing->delete();
        } else {
            if ($listing->trashed()) {
                $listing->restore();
            }
            $listing->update(['status' => 'active']);
        }
    }
}
