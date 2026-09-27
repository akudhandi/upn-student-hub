<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\KostListing;
use App\Models\LostFoundReport;
use App\Models\MarketplaceListing;
use App\Models\Report;
use App\Models\ServiceListing;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class AdminDashboardController extends Controller
{
    public function stats(): JsonResponse
    {
        $usersCount = User::count();

        $activeListings = MarketplaceListing::where('status', 'active')->count()
            + KostListing::where('status', 'available')->count()
            + ServiceListing::where('status', 'active')->count()
            + LostFoundReport::where('status', 'open')->count();

        $pendingEventsCount = Event::whereIn('status', ['draft', 'pending'])->count();

        $pendingReportsCount = Report::where('status', 'pending')->count();

        return response()->json([
            'message' => 'Statistik dashboard admin berhasil diambil',
            'data' => [
                'users_count' => $usersCount,
                'active_listings' => $activeListings,
                'pending_events_count' => $pendingEventsCount,
                'pending_reports_count' => $pendingReportsCount,
            ],
        ]);
    }
}
