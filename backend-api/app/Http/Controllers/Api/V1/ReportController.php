<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\ResolvesMorphType;
use App\Http\Controllers\Api\V1\Concerns\ResolvesStudentUser;
use App\Http\Controllers\Controller;
use App\Models\Report;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    use ResolvesMorphType, ResolvesStudentUser;

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

        $reporterId = $this->resolveStudentUserId($request);

        if (isset($target->user_id) && (int) $target->user_id === $reporterId) {
            return response()->json([
                'message' => 'Tidak dapat melaporkan konten milik sendiri.',
                'data' => null,
            ], 422);
        }

        $alreadyReported = Report::query()
            ->where('reporter_id', $reporterId)
            ->where('reportable_type', $class)
            ->where('reportable_id', $target->id)
            ->where('status', 'pending')
            ->exists();

        if ($alreadyReported) {
            return response()->json([
                'message' => 'Anda sudah mengirim laporan yang sedang ditinjau untuk konten ini.',
                'data' => null,
            ], 422);
        }

        $report = Report::create([
            'reporter_id' => $reporterId,
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
