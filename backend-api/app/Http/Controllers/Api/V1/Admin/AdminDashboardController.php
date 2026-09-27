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

        $marketplaceCount = MarketplaceListing::count();
        $servicesCount = ServiceListing::count();
        $kostCount = KostListing::count();
        $lostFoundCount = LostFoundReport::count();
        $eventsCount = Event::count();

        $activeListings = MarketplaceListing::where('status', 'active')->count()
            + KostListing::where('status', 'available')->count()
            + ServiceListing::where('status', 'active')->count()
            + LostFoundReport::where('status', 'open')->count();

        $pendingEventsCount = Event::whereIn('status', ['draft', 'pending'])->count();
        $pendingReportsCount = Report::where('status', 'pending')->count();

        $reportedListingIds = Report::where('status', 'pending')
            ->where('reportable_type', '!=', User::class)
            ->distinct('reportable_id')
            ->count('reportable_id');

        $reportedUsersCount = Report::where('status', 'pending')
            ->where('reportable_type', User::class)
            ->distinct('reportable_id')
            ->count('reportable_id');

        return response()->json([
            'message' => 'Statistik dashboard admin berhasil diambil',
            'data' => [
                // Backward-compatible keys (Phase 9.1 overview).
                'users_count' => $usersCount,
                'active_listings' => $activeListings,
                'pending_events_count' => $pendingEventsCount,
                'pending_reports_count' => $pendingReportsCount,
                // Per-module totals.
                'counts' => [
                    'users' => $usersCount,
                    'marketplace' => $marketplaceCount,
                    'services' => $servicesCount,
                    'kost' => $kostCount,
                    'lost_found' => $lostFoundCount,
                    'events' => $eventsCount,
                ],
                // Items that need admin attention.
                'needs_attention' => [
                    'pending_reports' => $pendingReportsCount,
                    'reported_listings' => $reportedListingIds,
                    'reported_users' => $reportedUsersCount,
                    'pending_events' => $pendingEventsCount,
                ],
                // Latest activity streams (minimal columns, capped at 5).
                'recent_activity' => [
                    'users' => User::with('profile:user_id,nim,name,faculty')
                        ->latest()->limit(5)
                        ->get(['id', 'name', 'email', 'status', 'created_at']),
                    'marketplace' => MarketplaceListing::with('user:id,name')
                        ->latest()->limit(5)
                        ->get(['id', 'title', 'price', 'status', 'user_id', 'created_at']),
                    'reports' => Report::with('reporter:id,name')
                        ->latest()->limit(5)
                        ->get(['id', 'reportable_type', 'reportable_id', 'reason', 'status', 'reporter_id', 'created_at']),
                    'events' => Event::latest()->limit(5)
                        ->get(['id', 'title', 'status', 'event_date', 'created_at']),
                ],
            ],
        ]);
    }
}
