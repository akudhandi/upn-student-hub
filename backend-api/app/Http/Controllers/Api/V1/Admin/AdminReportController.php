<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\V1\Concerns\ExportsCsv;
use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\LostFoundReport;
use App\Models\MarketplaceListing;
use App\Models\Report;
use App\Models\ServiceListing;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminReportController extends Controller
{
    use ExportsCsv;

    public function index(Request $request): JsonResponse
    {
        $reports = $this->filteredQuery($this->validateFilters($request))->paginate(15);

        return response()->json([
            'message' => 'Daftar laporan berhasil diambil',
            'data' => $reports,
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $rows = $this->filteredQuery($this->validateFilters($request))
            ->limit(5000)
            ->get();

        $filename = 'reports-'.now()->format('Ymd-His').'.csv';

        return $this->streamCsv(
            $filename,
            ['ID', 'Tipe Objek', 'ID Objek', 'Alasan', 'Pelapor', 'Status', 'Diselesaikan Oleh', 'Dilaporkan'],
            $rows,
            static fn ($row): array => [
                $row->id,
                $row->reportable_type,
                $row->reportable_id,
                $row->reason,
                $row->reporter->name ?? '',
                $row->status,
                $row->resolved_by,
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
            'status' => 'nullable|in:pending,reviewing,resolved,rejected,dismissed',
            'search' => 'nullable|string|max:255',
            'reportable_type' => 'nullable|string|max:255',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
        ]);
    }

    /**
     * @param array<string, mixed> $validated
     */
    private function filteredQuery(array $validated): Builder
    {
        $query = Report::query()
            ->with([
                'reporter:id,name,email',
                'reportable' => $this->reportableWithTrashedLoader(),
            ])
            ->latest();

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (! empty($validated['search'])) {
            $keyword = (string) $validated['search'];
            $query->where(function ($q) use ($keyword) {
                $q->where('reason', 'like', "%{$keyword}%")
                    ->orWhere('description', 'like', "%{$keyword}%")
                    ->orWhereHas('reporter', function ($reporter) use ($keyword) {
                        $reporter->where('name', 'like', "%{$keyword}%");
                    });
            });
        }

        if (! empty($validated['reportable_type'])) {
            $query->where('reportable_type', $validated['reportable_type']);
        }

        if (! empty($validated['date_from'])) {
            $query->whereDate('created_at', '>=', $validated['date_from']);
        }

        if (! empty($validated['date_to'])) {
            $query->whereDate('created_at', '<=', $validated['date_to']);
        }

        return $query;
    }

    public function resolve(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:reviewing,resolved,rejected,dismissed',
            'target_action' => 'nullable|in:none,hide_content,delete_content,suspend_user,ban_user,delete,deactivate',
        ]);

        try {
            $report = Report::with(['reportable' => $this->reportableWithTrashedLoader()])
                ->where('id', $id)
                ->firstOrFail();
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Data laporan tidak ditemukan',
                'data' => null,
            ], 404);
        }

        $targetAction = $validated['target_action'] ?? 'none';

        if (
            in_array($targetAction, ['delete', 'delete_content'], true)
            && $report->reportable instanceof User
        ) {
            return response()->json([
                'message' => 'Aksi hapus permanen tidak didukung untuk target pengguna. Gunakan suspend_user atau ban_user.',
                'data' => null,
            ], 422);
        }

        $this->applyResolution(
            $report,
            $validated['status'],
            $targetAction,
            $request->user()?->id
        );

        $report->load([
            'reporter:id,name,email',
            'reportable' => $this->reportableWithTrashedLoader(),
        ]);

        return response()->json([
            'message' => 'Laporan berhasil diproses',
            'data' => $report,
        ]);
    }

    public function bulkResolve(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1|max:100',
            'ids.*' => 'integer',
            'status' => 'required|in:reviewing,resolved,rejected,dismissed',
            'target_action' => 'nullable|in:none,hide_content,delete_content,suspend_user,ban_user,delete,deactivate',
        ]);

        $ids = array_values(array_unique($validated['ids']));

        $found = Report::whereIn('id', $ids)->pluck('id')->all();
        $missing = array_values(array_diff($ids, $found));
        if ($missing !== []) {
            return response()->json([
                'message' => 'Sebagian data laporan tidak ditemukan',
                'data' => ['missing_ids' => $missing],
            ], 422);
        }

        $adminId = $request->user()?->id;
        $targetAction = $validated['target_action'] ?? 'none';

        if (
            in_array($targetAction, ['delete', 'delete_content'], true)
            && Report::whereIn('id', $ids)->where('reportable_type', User::class)->exists()
        ) {
            return response()->json([
                'message' => 'Aksi hapus permanen tidak didukung untuk target pengguna. Gunakan suspend_user atau ban_user.',
                'data' => null,
            ], 422);
        }

        DB::transaction(function () use ($ids, $validated, $targetAction, $adminId) {
            $reports = Report::with(['reportable' => $this->reportableWithTrashedLoader()])
                ->whereIn('id', $ids)
                ->get();
            foreach ($reports as $report) {
                $this->applyResolution($report, $validated['status'], $targetAction, $adminId);
            }
        });

        return response()->json([
            'message' => 'Laporan berhasil diproses',
            'data' => ['updated' => count($ids)],
        ]);
    }

    private function applyResolution(Report $report, string $status, string $targetAction, ?int $adminId): void
    {
        $report->status = $status;

        if ($adminId !== null) {
            $report->resolved_by = $adminId;
        }

        $report->save();

        if ($targetAction !== 'none' && $report->reportable !== null) {
            $this->applyTargetAction($report->reportable, $targetAction);
        }
    }

    private function reportableWithTrashedLoader(): \Closure
    {
        return static function (MorphTo $morphTo): void {
            $morphTo->constrain([
                MarketplaceListing::class => fn ($q) => $q->withTrashed(),
                ServiceListing::class => fn ($q) => $q->withTrashed(),
                LostFoundReport::class => fn ($q) => $q->withTrashed(),
                Event::class => fn ($q) => $q->withTrashed(),
            ]);
        };
    }

    private function applyTargetAction(object $target, string $action): void
    {
        // Canonical moderation verbs used by the admin portal.
        if ($action === 'delete_content') {
            $action = 'delete';
        }

        if ($action === 'delete') {
            if ($target instanceof User) {
                return;
            }

            $target->delete();

            return;
        }

        if ($action === 'hide_content' || $action === 'deactivate') {
            if ($target instanceof User) {
                $target->update(['status' => 'suspended']);
                $target->tokens()->delete();

                return;
            }

            if ($target instanceof Event) {
                $target->update(['status' => 'archived']);

                return;
            }

            if (
                $target instanceof MarketplaceListing
                || $target instanceof ServiceListing
                || $target instanceof LostFoundReport
            ) {
                $target->update(['status' => 'hidden']);

                return;
            }

            $target->update(['status' => 'inactive']);

            return;
        }

        if ($action === 'suspend_user' || $action === 'ban_user') {
            $status = $action === 'ban_user' ? 'banned' : 'suspended';

            if ($target instanceof User) {
                $target->update(['status' => $status]);
                $target->tokens()->delete();

                return;
            }

            $owner = $target->user ?? null;
            if ($owner instanceof User) {
                $owner->update(['status' => $status]);
                $owner->tokens()->delete();
            }
        }
    }
}
