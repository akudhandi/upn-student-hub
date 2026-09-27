<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\Event;
use App\Models\KostListing;
use App\Models\LostFoundReport;
use App\Models\MarketplaceListing;
use App\Models\Report;
use App\Models\ServiceListing;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class AdminSettingsController extends Controller
{
    public function profile(): JsonResponse
    {
        $admin = Admin::first(['id', 'email', 'role', 'created_at']);

        if ($admin === null) {
            return response()->json([
                'message' => 'Data admin tidak ditemukan',
                'data' => null,
            ], 404);
        }

        return response()->json([
            'message' => 'Profil admin berhasil diambil',
            'data' => $admin,
        ]);
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $admin = Admin::first();

        if ($admin === null) {
            return response()->json([
                'message' => 'Data admin tidak ditemukan',
                'data' => null,
            ], 404);
        }

        if (! Hash::check($validated['current_password'], $admin->password)) {
            return response()->json([
                'message' => 'Password saat ini tidak sesuai',
                'data' => null,
            ], 422);
        }

        $admin->update(['password' => $validated['password']]);

        return response()->json([
            'message' => 'Password admin berhasil diperbarui',
            'data' => null,
        ]);
    }

    public function systemStatus(): JsonResponse
    {
        try {
            DB::connection()->getPdo();

            $database = 'connected';
        } catch (\Throwable $e) {
            $database = 'disconnected';
        }

        return response()->json([
            'message' => 'Status sistem berhasil diambil',
            'data' => [
                'app_time' => now()->toDateTimeString(),
                'database' => $database,
                'storage_writable' => is_writable(Storage::disk('local')->path('')),
                'totals' => [
                    'users' => User::count(),
                    'marketplace' => MarketplaceListing::count(),
                    'services' => ServiceListing::count(),
                    'kost' => KostListing::count(),
                    'lost_found' => LostFoundReport::count(),
                    'events' => Event::count(),
                    'reports_pending' => Report::where('status', 'pending')->count(),
                ],
            ],
        ]);
    }
}
