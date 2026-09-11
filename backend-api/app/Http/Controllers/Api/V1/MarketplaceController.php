<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\MarketplaceListing;
use Illuminate\Http\JsonResponse;

class MarketplaceController extends Controller
{
    public function index(): JsonResponse
    {
        $listings = MarketplaceListing::query()
            ->with([
                'user:id,name',
                'category:id,name,slug',
            ])
            ->where('status', 'active')
            ->latest()
            ->paginate(12);

        return response()->json([
            'message' => 'Daftar marketplace berhasil diambil',
            'data' => $listings,
        ]);
    }
}
