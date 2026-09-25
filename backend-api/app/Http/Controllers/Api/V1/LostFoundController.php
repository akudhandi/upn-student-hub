<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\LostFoundReport;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LostFoundController extends Controller
{
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
        ]);

        $report = LostFoundReport::create([
            ...$validated,
            'user_id' => $request->user()?->id ?? 1,
            'status' => 'active',
        ]);

        $report->load([
            'user:id,name',
            'category:id,name,slug',
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
            ])
            ->latest();

        if ($request->filled('type')) {
            $type = $request->query('type');
            if (in_array($type, ['lost', 'found'], true)) {
                $query->where('type', $type);
            }
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

    public function show(string $id): JsonResponse
    {
        try {
            $report = LostFoundReport::query()
                ->with([
                    'user:id,name',
                    'category:id,name,slug',
                ])
                ->where('id', $id)
                ->firstOrFail();

            return response()->json([
                'message' => 'Detail laporan berhasil diambil',
                'data' => $report,
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Data laporan tidak ditemukan',
                'data' => null,
            ], 404);
        }
    }
}
