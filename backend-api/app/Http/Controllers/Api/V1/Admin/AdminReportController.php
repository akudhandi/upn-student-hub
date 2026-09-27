<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\LostFoundReport;
use App\Models\Report;
use App\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminReportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'nullable|in:pending,resolved,dismissed',
        ]);

        $query = Report::query()
            ->with([
                'reporter:id,name,email',
                'reportable',
            ])
            ->latest();

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        $reports = $query->paginate(15);

        return response()->json([
            'message' => 'Daftar laporan berhasil diambil',
            'data' => $reports,
        ]);
    }

    public function resolve(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:resolved,dismissed',
            'target_action' => 'nullable|in:none,delete,deactivate,suspend_user',
        ]);

        try {
            $report = Report::with('reportable')->where('id', $id)->firstOrFail();
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Data laporan tidak ditemukan',
                'data' => null,
            ], 404);
        }

        $report->status = $validated['status'];

        $adminId = $request->user()?->id;
        if ($adminId !== null) {
            $report->resolved_by = $adminId;
        }

        $report->save();

        $targetAction = $validated['target_action'] ?? 'none';
        if ($targetAction !== 'none' && $report->reportable !== null) {
            $this->applyTargetAction($report->reportable, $targetAction);
        }

        $report->load(['reporter:id,name,email', 'reportable']);

        return response()->json([
            'message' => 'Laporan berhasil diproses',
            'data' => $report,
        ]);
    }

    private function applyTargetAction(object $target, string $action): void
    {
        if ($action === 'delete') {
            $target->delete();

            return;
        }

        if ($action === 'deactivate') {
            if ($target instanceof LostFoundReport) {
                $target->update(['status' => 'closed']);

                return;
            }

            if ($target instanceof User) {
                $target->update(['status' => 'suspended']);

                return;
            }

            $target->update(['status' => 'inactive']);

            return;
        }

        if ($action === 'suspend_user') {
            if ($target instanceof User) {
                $target->update(['status' => 'suspended']);

                return;
            }

            $owner = $target->user ?? null;
            if ($owner instanceof User) {
                $owner->update(['status' => 'suspended']);
            }
        }
    }
}
