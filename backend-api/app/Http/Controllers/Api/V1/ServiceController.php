<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ServiceListing;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServiceController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'category_id' => 'required|exists:categories,id',
            'price_min' => 'required|numeric|min:0',
            'price_max' => 'nullable|numeric|min:0|gte:price_min',
            'description' => 'required|string',
        ]);

        $listing = ServiceListing::create([
            ...$validated,
            'user_id' => $request->user()?->id ?? 1,
            'status' => 'active',
        ]);

        $listing->load([
            'user:id,name',
            'category:id,name,slug',
        ]);

        return response()->json([
            'message' => 'Listing jasa berhasil dibuat',
            'data' => $listing,
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $query = ServiceListing::query()
            ->with([
                'user:id,name',
                'category:id,name,slug',
            ])
            ->where('status', 'active')
            ->latest();

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->query('category_id'));
        }

        $services = $query->paginate(12);

        return response()->json([
            'message' => 'Daftar jasa berhasil diambil',
            'data' => $services,
        ]);
    }

    public function show(string $id): JsonResponse
    {
        try {
            $listing = ServiceListing::query()
                ->with([
                    'user:id,name',
                    'category:id,name,slug',
                ])
                ->where('id', $id)
                ->firstOrFail();

            return response()->json([
                'message' => 'Detail jasa berhasil diambil',
                'data' => $listing,
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Data jasa tidak ditemukan',
                'data' => null,
            ], 404);
        }
    }
}
