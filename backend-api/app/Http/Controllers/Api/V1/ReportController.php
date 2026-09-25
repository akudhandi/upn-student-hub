<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\ResolvesMorphType;
use App\Http\Controllers\Controller;
use App\Models\Report;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    use ResolvesMorphType;

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'reportable_type' => 'required|string',
            'reportable_id' => 'required|integer|min:1',
            'reason' => 'required|in:spam,fraud,inappropriate,other',
            'description' => 'nullable|string|max:2000',
        ]);

        $class = static::resolveMorphClass($validated['reportable_type']);
        if ($class === null) {
            return response()->json([
                'message' => 'Tipe laporan tidak valid',
                'data' => null,
            ], 422);
        }

        $target = $class::query()->where('id', $validated['reportable_id'])->first();
        if ($target === null) {
            return response()->json([
                'message' => 'Data tidak ditemukan',
                'data' => null,
            ], 404);
        }

        $report = Report::create([
            'reporter_id' => $request->user()?->id ?? 1,
            'reportable_type' => $class,
            'reportable_id' => $target->id,
            'reason' => $validated['reason'],
            'description' => $validated['description'] ?? null,
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Laporan berhasil dikirim dan akan ditinjau admin',
            'data' => $report,
        ], 201);
    }
}
