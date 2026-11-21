<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Event;
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

        $marketplaceStats = MarketplaceListing::query()
            ->selectRaw("COUNT(*) as total, COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0) as active_count")
            ->first();
        $serviceStats = ServiceListing::query()
            ->selectRaw("COUNT(*) as total, COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0) as active_count")
            ->first();
        $lostFoundStats = LostFoundReport::query()
            ->selectRaw("COUNT(*) as total, COALESCE(SUM(CASE WHEN status IN ('open', 'active') THEN 1 ELSE 0 END), 0) as active_count")
            ->first();
        $eventStats = Event::query()
            ->selectRaw("COUNT(*) as total, COALESCE(SUM(CASE WHEN status IN ('draft', 'pending') THEN 1 ELSE 0 END), 0) as pending_count")
            ->first();
        $reportStats = Report::query()
            ->where('status', 'pending')
            ->selectRaw(
                'COUNT(*) as pending_total,
                 COUNT(DISTINCT CASE WHEN reportable_type != ? THEN reportable_id END) as reported_listings,
                 COUNT(DISTINCT CASE WHEN reportable_type = ? THEN reportable_id END) as reported_users',
                [User::class, User::class]
            )
            ->first();

        $marketplaceCount = (int) ($marketplaceStats?->total ?? 0);
        $servicesCount = (int) ($serviceStats?->total ?? 0);
        $lostFoundCount = (int) ($lostFoundStats?->total ?? 0);
        $eventsCount = (int) ($eventStats?->total ?? 0);

        $activeListings = (int) ($marketplaceStats?->active_count ?? 0)
            + (int) ($serviceStats?->active_count ?? 0)
            + (int) ($lostFoundStats?->active_count ?? 0);

        $pendingEventsCount = (int) ($eventStats?->pending_count ?? 0);
        $pendingReportsCount = (int) ($reportStats?->pending_total ?? 0);
        $reportedListingIds = (int) ($reportStats?->reported_listings ?? 0);
        $reportedUsersCount = (int) ($reportStats?->reported_users ?? 0);

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
