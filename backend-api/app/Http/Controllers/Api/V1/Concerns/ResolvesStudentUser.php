<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Concerns;

use App\Models\User;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

trait ResolvesStudentUser
{
    public static function resolveFromDevHeader(Request $request, bool $requireActive = false): ?User
    {
        if (! app()->environment('local')) {
            return null;
        }

        $devId = $request->header('X-Dev-User-Id');
        if ($devId === null || ! ctype_digit((string) $devId)) {
            return null;
        }

        $user = User::find((int) $devId);
        if ($user === null) {
            return null;
        }

        if ($requireActive && ($user->status ?? 'active') !== 'active') {
            return null;
        }

        return $user;
    }

    protected function resolveStudentUser(Request $request): ?User
    {
        $resolved = $request->user();
        if ($resolved instanceof User) {
            return $resolved;
        }

        $sanctumUser = $request->user('sanctum');
        if ($sanctumUser instanceof User) {
            return $sanctumUser;
        }

        return self::resolveFromDevHeader($request, true);
    }

    /**
     * @throws AuthenticationException
     */
    protected function resolveStudentUserId(Request $request): int
    {
        $user = $this->resolveStudentUser($request);
        if ($user === null) {
            throw new AuthenticationException('Autentikasi mahasiswa diperlukan.');
        }

        return (int) $user->id;
    }

    protected function isListingOwner(Model $listing, int $userId): bool
    {
        return (int) $listing->getAttribute('user_id') === $userId;
    }
}
