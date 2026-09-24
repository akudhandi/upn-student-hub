<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\MarketplaceListing;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MarketplaceController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'price' => 'required|numeric|min:0',
            'condition' => 'required|in:new,like-new,good,fair',
            'category_id' => 'required|exists:categories,id',
        ]);

        $listing = MarketplaceListing::create([
            ...$validated,
            'user_id' => $request->user()?->id ?? 1,
            'status' => 'active',
        ]);

        $listing->load([
            'user:id,name',
            'category:id,name,slug',
        ]);

        return response()->json([
            'message' => 'Listing marketplace berhasil dibuat',
            'data' => $listing,
        ], 201);
    }

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

    public function show(string $id): JsonResponse
    {
        try {
            $listing = MarketplaceListing::query()
                ->with([
                    'user:id,name',
                    'category:id,name,slug',
                ])
                ->where('id', $id)
                ->firstOrFail();

            return response()->json([
                'message' => 'Detail marketplace berhasil diambil',
                'data' => $listing,
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Data marketplace tidak ditemukan',
                'data' => null,
            ], 404);
        }
    }
}
