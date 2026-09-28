<?php

use App\Http\Controllers\Api\V1\Admin\AdminAnnouncementController;
use App\Http\Controllers\Api\V1\Admin\AdminCategoryController;
use App\Http\Controllers\Api\V1\Admin\AdminController;
use App\Http\Controllers\Api\V1\Admin\AdminDashboardController;
use App\Http\Controllers\Api\V1\Admin\AdminEventController;
use App\Http\Controllers\Api\V1\Admin\AdminKostController;
use App\Http\Controllers\Api\V1\Admin\AdminLostFoundController;
use App\Http\Controllers\Api\V1\Admin\AdminMarketplaceController;
use App\Http\Controllers\Api\V1\Admin\AdminReportController;
use App\Http\Controllers\Api\V1\Admin\AdminServiceController;
use App\Http\Controllers\Api\V1\Admin\AdminSettingsController;
use App\Http\Controllers\Api\V1\Admin\AdminUserController;
use App\Http\Controllers\Api\V1\AdminAuthController;
use App\Http\Controllers\Api\V1\AnnouncementController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\ChatController;
use App\Http\Controllers\Api\V1\EventController;
use App\Http\Controllers\Api\V1\FavoriteController;
use App\Http\Controllers\Api\V1\KostController;
use App\Http\Controllers\Api\V1\LostFoundController;
use App\Http\Controllers\Api\V1\MarketplaceController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\ReviewController;
use App\Http\Controllers\Api\V1\ServiceController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Student Authentication Routes
    Route::prefix('auth')->group(function () {
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/login', [AuthController::class, 'login']);

        Route::middleware('auth:sanctum')->group(function () {
            Route::post('/logout', [AuthController::class, 'logout']);
        });
    });

    // Marketplace Routes
    Route::get('/marketplace', [MarketplaceController::class, 'index']);
    Route::post('/marketplace', [MarketplaceController::class, 'store']);
    Route::get('/marketplace/{id}', [MarketplaceController::class, 'show']);

    // Kost Routes
    Route::get('/kost', [KostController::class, 'index']);
    Route::post('/kost', [KostController::class, 'store']);
    Route::get('/kost/{id}', [KostController::class, 'show']);

    // Service Routes
    Route::get('/services', [ServiceController::class, 'index']);
    Route::post('/services', [ServiceController::class, 'store']);
    Route::get('/services/{id}', [ServiceController::class, 'show']);

    // Lost & Found Routes
    Route::get('/lost-found', [LostFoundController::class, 'index']);
    Route::post('/lost-found', [LostFoundController::class, 'store']);
    Route::get('/lost-found/{id}', [LostFoundController::class, 'show']);

    // Event & Informasi Kampus Routes
    Route::get('/events', [EventController::class, 'index']);
    Route::post('/events', [EventController::class, 'store']);
    Route::get('/events/{id}', [EventController::class, 'show']);

    // Pengumuman dari admin untuk mahasiswa (dibaca via bel notifikasi).
    Route::get('/announcements', [AnnouncementController::class, 'index']);

    // Polymorphic Interactions
    Route::get('/favorites', [FavoriteController::class, 'index']);
    Route::post('/favorites/toggle', [FavoriteController::class, 'toggle']);
    Route::get('/reviews', [ReviewController::class, 'index']);
    Route::post('/reviews', [ReviewController::class, 'store']);
    Route::post('/reports', [ReportController::class, 'store']);

    // 1-on-1 Chat (facade over chat_rooms / chat_participants / chat_messages)
    Route::get('/conversations', [ChatController::class, 'index']);
    Route::post('/conversations', [ChatController::class, 'store']);
    Route::get('/conversations/{id}', [ChatController::class, 'show']);
    Route::post('/conversations/{id}/messages', [ChatController::class, 'sendMessage']);
    Route::patch('/conversations/{id}/read', [ChatController::class, 'markAsRead']);

    // Admin Portal (dashboard, content moderation, events, users, master data)
    Route::prefix('admin')->group(function () {
        Route::get('/stats', [AdminDashboardController::class, 'stats']);

        // Content monitoring & moderation (view, hide, restore, delete).
        Route::get('/marketplace', [AdminMarketplaceController::class, 'index']);
        Route::get('/marketplace/export', [AdminMarketplaceController::class, 'export']);
        Route::post('/marketplace/bulk-status', [AdminMarketplaceController::class, 'bulkStatus']);
        Route::patch('/marketplace/{id}/status', [AdminMarketplaceController::class, 'updateStatus']);
        Route::get('/services', [AdminServiceController::class, 'index']);
        Route::get('/services/export', [AdminServiceController::class, 'export']);
        Route::post('/services/bulk-status', [AdminServiceController::class, 'bulkStatus']);
        Route::patch('/services/{id}/status', [AdminServiceController::class, 'updateStatus']);
        Route::get('/kost', [AdminKostController::class, 'index']);
        Route::get('/kost/export', [AdminKostController::class, 'export']);
        Route::post('/kost/bulk-status', [AdminKostController::class, 'bulkStatus']);
        Route::patch('/kost/{id}/status', [AdminKostController::class, 'updateStatus']);
        Route::get('/lost-found', [AdminLostFoundController::class, 'index']);
        Route::get('/lost-found/export', [AdminLostFoundController::class, 'export']);
        Route::post('/lost-found/bulk-status', [AdminLostFoundController::class, 'bulkStatus']);
        Route::patch('/lost-found/{id}/status', [AdminLostFoundController::class, 'updateStatus']);

        // Event & Informasi Kampus (full CRUD + status workflow).
        Route::get('/events', [AdminEventController::class, 'index']);
        Route::get('/events/export', [AdminEventController::class, 'export']);
        Route::post('/events', [AdminEventController::class, 'store']);
        Route::get('/events/{id}', [AdminEventController::class, 'show']);
        Route::put('/events/{id}', [AdminEventController::class, 'update']);
        Route::delete('/events/{id}', [AdminEventController::class, 'destroy']);
        Route::patch('/events/{id}/status', [AdminEventController::class, 'updateStatus']);

        // Category master data.
        Route::get('/categories', [AdminCategoryController::class, 'index']);
        Route::post('/categories', [AdminCategoryController::class, 'store']);
        Route::put('/categories/{id}', [AdminCategoryController::class, 'update']);
        Route::delete('/categories/{id}', [AdminCategoryController::class, 'destroy']);
        Route::patch('/categories/{id}/toggle', [AdminCategoryController::class, 'toggleActive']);

        // Announcements (MVP notification sender).
        Route::get('/announcements', [AdminAnnouncementController::class, 'index']);
        Route::post('/announcements', [AdminAnnouncementController::class, 'store']);
        Route::delete('/announcements/{id}', [AdminAnnouncementController::class, 'destroy']);

        // Users & reports resolution.
        Route::get('/reports', [AdminReportController::class, 'index']);
        Route::get('/reports/export', [AdminReportController::class, 'export']);
        Route::post('/reports/bulk-resolve', [AdminReportController::class, 'bulkResolve']);
        Route::patch('/reports/{id}/resolve', [AdminReportController::class, 'resolve']);
        Route::get('/users', [AdminUserController::class, 'index']);
        Route::get('/users/export', [AdminUserController::class, 'export']);
        Route::post('/users/bulk-status', [AdminUserController::class, 'bulkStatus']);
        Route::get('/users/{id}', [AdminUserController::class, 'show']);
        Route::patch('/users/{id}/status', [AdminUserController::class, 'toggleStatus']);

        // Admin settings & system status.
        Route::get('/profile', [AdminSettingsController::class, 'profile']);
        Route::patch('/profile/password', [AdminSettingsController::class, 'updatePassword']);
        Route::get('/system-status', [AdminSettingsController::class, 'systemStatus']);

        // Kelola akun admin (khusus superadmin, wajib token Sanctum).
        Route::middleware('auth:sanctum')->group(function () {
            Route::get('/admins', [AdminController::class, 'index']);
            Route::post('/admins', [AdminController::class, 'store']);
            Route::delete('/admins/{id}', [AdminController::class, 'destroy']);
        });
    });

    // Admin Authentication Routes
    Route::prefix('admin/auth')->group(function () {
        Route::post('/login', [AdminAuthController::class, 'login']);

        Route::middleware('auth:sanctum')->group(function () {
            Route::post('/logout', [AdminAuthController::class, 'logout']);
        });
    });
});
