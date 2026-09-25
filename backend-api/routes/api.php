<?php

use App\Http\Controllers\Api\V1\AdminAuthController;
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

    // Admin Authentication Routes
    Route::prefix('admin/auth')->group(function () {
        Route::post('/login', [AdminAuthController::class, 'login']);

        Route::middleware('auth:sanctum')->group(function () {
            Route::post('/logout', [AdminAuthController::class, 'logout']);
        });
    });
});
