<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\Admin;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminAuthenticated
{
    public function handle(Request $request, Closure $next): Response
    {
        $actor = $request->user('sanctum');

        if ($actor === null) {
            return response()->json([
                'message' => 'Autentikasi administrator diperlukan.',
            ], 401);
        }

        if (! ($actor instanceof Admin)) {
            return response()->json([
                'message' => 'Akses ditolak. Endpoint ini khusus administrator.',
            ], 403);
        }

        $request->setUserResolver(static fn () => $actor);

        return $next($request);
    }
}
