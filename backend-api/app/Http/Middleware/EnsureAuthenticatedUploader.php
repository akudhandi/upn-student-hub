<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Http\Controllers\Api\V1\Concerns\ResolvesStudentUser;
use App\Models\Admin;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAuthenticatedUploader
{
    public function handle(Request $request, Closure $next): Response
    {
        $actor = $request->user('sanctum') ?? ResolvesStudentUser::resolveFromDevHeader($request);

        if ($actor === null) {
            return response()->json([
                'message' => 'Autentikasi diperlukan untuk mengunggah berkas.',
            ], 401);
        }

        if ($actor instanceof User) {
            if (($actor->status ?? 'active') !== 'active') {
                return response()->json([
                    'message' => 'Akun Anda sedang ditangguhkan atau dinonaktifkan.',
                ], 403);
            }

            $request->setUserResolver(static fn () => $actor);

            return $next($request);
        }

        if ($actor instanceof Admin) {
            $request->setUserResolver(static fn () => $actor);

            return $next($request);
        }

        return response()->json([
            'message' => 'Akses ditolak.',
        ], 403);
    }
}
