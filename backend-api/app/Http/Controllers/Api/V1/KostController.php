<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\KostListing;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class KostController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'address' => 'required|string',
            'gender_type' => 'required|in:putra,putri,campur',
            'price' => 'required|integer|min:0',
            'facilities' => 'required|array',
            'description' => 'nullable|string',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
        ]);

        $listing = KostListing::create([
            ...$validated,
            'user_id' => $request->user()?->id ?? 1,
            'slug' => Str::slug($request->title).'-'.Str::lower(Str::random(5)),
            'latitude' => $request->input('latitude', -7.333),
            'longitude' => $request->input('longitude', 112.788),
            'status' => 'available',
        ]);

        $listing->load([
            'user:id,name',
        ]);

        return response()->json([
            'message' => 'Listing kost berhasil dibuat',
            'data' => $listing,
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $query = KostListing::query()
            ->with([
                'user:id,name',
            ])
            ->where('status', 'available')
            ->latest();

        if ($request->filled('gender_type')) {
            $genderType = $request->query('gender_type');
            if (in_array($genderType, ['putra', 'putri', 'campur'], true)) {
                $query->where('gender_type', $genderType);
            }
        }

        $kosts = $query->paginate(12);

        return response()->json([
            'message' => 'Daftar kost berhasil diambil',
            'data' => $kosts,
        ]);
    }

    public function show(string $idOrSlug): JsonResponse
    {
        try {
            $query = KostListing::query()->with([
                'user:id,name',
            ]);

            if (is_numeric($idOrSlug)) {
                $kost = $query->where('id', $idOrSlug)->firstOrFail();
            } else {
                $kost = $query->where('slug', $idOrSlug)->firstOrFail();
            }

            return response()->json([
                'message' => 'Detail kost berhasil diambil',
                'data' => $kost,
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Data kost tidak ditemukan',
                'data' => null,
            ], 404);
        }
    }
}
