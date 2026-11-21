<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\V1\Concerns\ExportsCsv;
use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Models\StudentProfile;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminUserController extends Controller
{
    use ExportsCsv;

    public function index(Request $request): JsonResponse
    {
        $users = $this->filteredQuery($this->validateFilters($request))->paginate(15);

        return response()->json([
            'message' => 'Daftar pengguna berhasil diambil',
            'data' => $users,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|min:2|max:255',
            'email' => 'required|string|email|max:255|unique:users,email',
            'password' => 'required|string|min:8|max:128',
            'account_type' => 'required|in:student,hima,ormawa,faculty',
            'nim' => 'nullable|string|max:30',
            'faculty' => 'nullable|string|max:150',
            'bio' => 'nullable|string|max:500',
        ], [
            'name.required' => 'Nama akun wajib diisi.',
            'email.required' => 'Email wajib diisi.',
            'email.email' => 'Format email tidak valid.',
            'email.unique' => 'Email sudah terdaftar.',
            'password.required' => 'Password wajib diisi.',
            'password.min' => 'Password minimal 8 karakter.',
            'account_type.required' => 'Tipe akun wajib dipilih.',
            'account_type.in' => 'Tipe akun tidak valid.',
        ]);

        $user = DB::transaction(function () use ($validated) {
            $created = User::create([
                'name' => $validated['name'],
                'email' => strtolower(trim($validated['email'])),
                'password' => Hash::make($validated['password']),
                'status' => 'active',
                'account_type' => $validated['account_type'],
                'email_verified_at' => now(),
            ]);

            StudentProfile::create([
                'user_id' => $created->id,
                'name' => $validated['name'],
                'nim' => $validated['nim'] ?? null,
                'faculty' => $validated['faculty'] ?? null,
                'bio' => $validated['bio'] ?? null,
            ]);

            return $created;
        });

        $user->load('profile');

        return response()->json([
            'message' => 'Akun pengguna berhasil dibuat',
            'data' => $user,
        ], 201);
    }

    public function updateAccountType(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'account_type' => 'required|in:student,hima,ormawa,faculty',
            'password' => 'nullable|string|min:8|max:128',
        ], [
            'account_type.required' => 'Tipe akun wajib dipilih.',
            'account_type.in' => 'Tipe akun tidak valid.',
            'password.min' => 'Password baru minimal 8 karakter.',
        ]);

        try {
            $user = User::where('id', $id)->firstOrFail();
        } catch (ModelNotFoundException) {
            return response()->json([
                'message' => 'Data pengguna tidak ditemukan',
                'data' => null,
            ], 404);
        }

        DB::transaction(function () use ($user, $validated): void {
            $user->account_type = $validated['account_type'];
            if (! empty($validated['password'])) {
                $user->password = Hash::make($validated['password']);
                $user->tokens()->delete();
            }
            $user->save();
        });
        $user->load('profile');

        return response()->json([
            'message' => 'Tipe akun pengguna berhasil diperbarui',
            'data' => $user,
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $query = $this->filteredQuery($this->validateFilters($request));
        $filename = 'users-'.now()->format('Ymd-His').'.csv';

        return $this->streamCsv(
            $filename,
            ['ID', 'Nama', 'Email', 'Tipe Akun', 'NIM', 'Fakultas', 'Status', 'Terdaftar'],
            $this->chunkedExportRows($query),
            static fn ($row): array => [
                $row->id,
                $row->profile->name ?? $row->name,
                $row->email,
                $row->account_type ?? 'student',
                $row->profile->nim ?? '',
                $row->profile->faculty ?? '',
                $row->status,
                $row->created_at,
            ],
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function validateFilters(Request $request): array
    {
        return $request->validate([
            'search' => 'nullable|string|max:255',
            'status' => 'nullable|in:active,suspended,banned,inactive',
            'account_type' => 'nullable|in:student,hima,ormawa,faculty',
            'faculty' => 'nullable|string|max:100',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
        ]);
    }

    /**
     * @param array<string, mixed> $validated
     */
    private function filteredQuery(array $validated): Builder
    {
        $query = User::query()
            ->with('profile')
            ->latest();

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (! empty($validated['account_type'])) {
            $query->where('account_type', $validated['account_type']);
        }

        if (! empty($validated['faculty'])) {
            $faculty = (string) $validated['faculty'];
            $query->whereHas('profile', function ($profile) use ($faculty) {
                $profile->where('faculty', 'like', "%{$faculty}%");
            });
        }

        if (! empty($validated['search'])) {
            $keyword = (string) $validated['search'];
            $query->where(function ($q) use ($keyword) {
                $q->where('name', 'like', "%{$keyword}%")
                    ->orWhere('email', 'like', "%{$keyword}%")
                    ->orWhereHas('profile', function ($profile) use ($keyword) {
                        $profile->where('name', 'like', "%{$keyword}%")
                            ->orWhere('nim', 'like', "%{$keyword}%");
                    });
            });
        }

        if (! empty($validated['date_from'])) {
            $query->where('users.created_at', '>=', Carbon::parse((string) $validated['date_from'])->startOfDay());
        }

        if (! empty($validated['date_to'])) {
            $query->where('users.created_at', '<=', Carbon::parse((string) $validated['date_to'])->endOfDay());
        }

        return $query;
    }

    public function show(string $id): JsonResponse
    {
        try {
            $user = User::with('profile')->where('id', $id)->firstOrFail();
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Data pengguna tidak ditemukan',
                'data' => null,
            ], 404);
        }

        $listingsCount = $user->marketplaceListings()->count()
            + $user->serviceListings()->count()
            + $user->lostFoundReports()->count();

        $reportsHistory = Report::with('reporter:id,name')
            ->where(function ($q) use ($user) {
                $q->where('reporter_id', $user->id)
                    ->orWhere(function ($q) use ($user) {
                        $q->where('reportable_type', User::class)
                            ->where('reportable_id', $user->id);
                    });
            })
            ->latest()
            ->limit(10)
            ->get();

        return response()->json([
            'message' => 'Detail pengguna berhasil diambil',
            'data' => [
                'user' => $user,
                'listings_count' => $listingsCount,
                'reports_history' => $reportsHistory,
            ],
        ]);
    }

    public function toggleStatus(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'nullable|in:active,suspended,banned,inactive',
        ]);

        try {
            $user = User::where('id', $id)->firstOrFail();
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Data pengguna tidak ditemukan',
                'data' => null,
            ], 404);
        }

        DB::transaction(function () use ($user, $validated): void {
            if (! empty($validated['status'])) {
                $user->status = $validated['status'];
            } else {
                $user->status = $user->status === 'active' ? 'suspended' : 'active';
            }

            $user->save();
            if ($user->status !== 'active') {
                $user->tokens()->delete();
            }
        });
        $user->load('profile');

        return response()->json([
            'message' => 'Status pengguna berhasil diperbarui',
            'data' => $user,
        ]);
    }

    public function bulkStatus(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1|max:100',
            'ids.*' => 'integer',
            'status' => 'required|in:active,suspended,banned,inactive',
        ]);

        $ids = array_values(array_unique($validated['ids']));

        $found = User::whereIn('id', $ids)->pluck('id')->all();
        $missing = array_values(array_diff($ids, $found));
        if ($missing !== []) {
            return response()->json([
                'message' => 'Sebagian data pengguna tidak ditemukan',
                'data' => ['missing_ids' => $missing],
            ], 422);
        }

        $updated = DB::transaction(function () use ($ids, $validated): int {
            $count = User::whereIn('id', $ids)->update(['status' => $validated['status']]);
            if ($validated['status'] !== 'active') {
                PersonalAccessToken::query()
                    ->where('tokenable_type', User::class)
                    ->whereIn('tokenable_id', $ids)
                    ->delete();
            }

            return $count;
        });

        return response()->json([
            'message' => 'Status pengguna berhasil diperbarui',
            'data' => ['updated' => $updated],
        ]);
    }
}
