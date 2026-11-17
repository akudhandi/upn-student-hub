<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Concerns;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

trait ResolvesStudentUser
{
    protected function resolveStudentUser(Request $request): ?User
    {
        $sanctumUser = $request->user('sanctum');
        if ($sanctumUser instanceof User) {
            return $sanctumUser;
        }

        if (! app()->isProduction()) {
            $devId = $request->header('X-Dev-User-Id');
            if ($devId !== null && ctype_digit((string) $devId)) {
                $devUser = User::find((int) $devId);
                if ($devUser !== null) {
                    return $devUser;
                }
            }

            return User::find(1) ?? User::first();
        }

        return null;
    }

    protected function resolveStudentUserId(Request $request): int
    {
        return $this->resolveStudentUser($request)?->id ?? 1;
    }

    protected function isListingOwner(Model $listing, int $userId): bool
    {
        return (int) $listing->getAttribute('user_id') === $userId;
    }
}
