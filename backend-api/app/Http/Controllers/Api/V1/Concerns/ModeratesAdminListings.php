<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Concerns;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

trait ModeratesAdminListings
{
    /**
     * @param  array<string, mixed>  $validated
     */
    protected function applyCategoryAndDateFilters(Builder $query, array $validated, string $dateColumn = 'created_at'): void
    {
        if (! empty($validated['category_id'])) {
            $query->where('category_id', $validated['category_id']);
        }

        if (! empty($validated['date_from'])) {
            $query->where($dateColumn, '>=', Carbon::parse((string) $validated['date_from'])->startOfDay());
        }

        if (! empty($validated['date_to'])) {
            $query->where($dateColumn, '<=', Carbon::parse((string) $validated['date_to'])->endOfDay());
        }
    }

    protected function applySoftDeleteStatusFilter(Builder $query, ?string $status): void
    {
        if ($status === 'deleted') {
            $query->onlyTrashed();
        } elseif (! empty($status)) {
            $query->where('status', $status);
        } else {
            $query->withTrashed();
        }
    }

    protected function applyModerationAction(Model $item, string $action, string $restoreStatus = 'active'): void
    {
        if ($action === 'hide') {
            $item->update(['status' => 'hidden']);
        } elseif ($action === 'mark_resolved') {
            if (method_exists($item, 'trashed') && $item->trashed()) {
                $item->restore();
            }
            $item->update(['status' => 'resolved']);
        } elseif ($action === 'delete') {
            $item->delete();
        } else {
            if (method_exists($item, 'trashed') && $item->trashed()) {
                $item->restore();
            }
            $item->update(['status' => $restoreStatus]);
        }
    }

    /**
     * @param  class-string<Model>  $modelClass
     */
    protected function updateSingleModerationStatus(
        string $modelClass,
        string $id,
        string $action,
        string $restoreStatus,
        string $notFoundMessage,
        string $successMessage
    ): JsonResponse {
        try {
            /** @var Model $item */
            $item = $modelClass::withTrashed()->where('id', $id)->firstOrFail();
        } catch (ModelNotFoundException) {
            return response()->json([
                'message' => $notFoundMessage,
                'data' => null,
            ], 404);
        }

        DB::transaction(function () use ($item, $action, $restoreStatus): void {
            $this->applyModerationAction($item, $action, $restoreStatus);
        });

        $item->load(['user:id,name', 'category:id,name,slug', 'images']);
        $item->loadCount('reports');

        return response()->json([
            'message' => $successMessage,
            'data' => $item,
        ]);
    }

    /**
     * @param  class-string<Model>  $modelClass
     * @param  array<int, int>  $rawIds
     */
    protected function updateBulkModerationStatus(
        string $modelClass,
        array $rawIds,
        string $action,
        string $restoreStatus,
        string $missingMessage,
        string $successMessage
    ): JsonResponse {
        $ids = array_values(array_unique($rawIds));

        $found = $modelClass::withTrashed()->whereIn('id', $ids)->pluck('id')->all();
        $missing = array_values(array_diff($ids, $found));
        if ($missing !== []) {
            return response()->json([
                'message' => $missingMessage,
                'data' => ['missing_ids' => $missing],
            ], 422);
        }

        DB::transaction(function () use ($modelClass, $ids, $action, $restoreStatus): void {
            $items = $modelClass::withTrashed()->whereIn('id', $ids)->get();
            foreach ($items as $item) {
                $this->applyModerationAction($item, $action, $restoreStatus);
            }
        });

        return response()->json([
            'message' => $successMessage,
            'data' => ['updated' => count($ids)],
        ]);
    }
}
