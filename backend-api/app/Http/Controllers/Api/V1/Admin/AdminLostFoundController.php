<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\LostFoundReport;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminLostFoundController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tab' => 'nullable|in:all,lost,found,resolved',
            'status' => 'nullable|in:open,hidden,closed,deleted',
            'search' => 'nullable|string|max:255',
        ]);

        $query = LostFoundReport::query()
            ->with(['user:id,name', 'category:id,name,slug', 'images'])
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

        if (($validated['status'] ?? null) === 'deleted') {
            $query->onlyTrashed();
        } elseif (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
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

        return response()->json([
            'message' => 'Daftar lost & found admin berhasil diambil',
            'data' => $query->paginate(15),
        ]);
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'action' => 'required|in:hide,restore,mark_resolved,delete',
        ]);

        try {
            $report = LostFoundReport::withTrashed()->where('id', $id)->firstOrFail();
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Data laporan tidak ditemukan',
                'data' => null,
            ], 404);
        }

        if ($validated['action'] === 'hide') {
            $report->update(['status' => 'hidden']);
        } elseif ($validated['action'] === 'mark_resolved') {
            if ($report->trashed()) {
                $report->restore();
            }
            $report->update(['status' => 'resolved']);
        } elseif ($validated['action'] === 'delete') {
            $report->delete();
        } else {
            if ($report->trashed()) {
                $report->restore();
            }
            $report->update(['status' => 'open']);
        }

        $report->load(['user:id,name', 'category:id,name,slug']);
        $report->loadCount('reports');

        return response()->json([
            'message' => 'Status laporan berhasil diperbarui',
            'data' => $report,
        ]);
    }
}
