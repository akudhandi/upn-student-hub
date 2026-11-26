<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class OtpCode extends Model
{
    public const TYPE_REGISTER = 'register';
    public const TYPE_PASSWORD_RESET = 'password_reset';
    public const EXPIRY_MINUTES = 10;
    public const RESEND_COOLDOWN_SECONDS = 60;

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'email',
        'code',
        'type',
        'expires_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
        ];
    }

    public static function remainingCooldownSeconds(string $email, string $type): int
    {
        $latest = static::query()
            ->where('email', $email)
            ->where('type', $type)
            ->latest('id')
            ->first();

        if ($latest === null || $latest->created_at === null) {
            return 0;
        }

        $cooldownEndsAt = $latest->created_at->copy()->addSeconds(self::RESEND_COOLDOWN_SECONDS);
        $remaining = $cooldownEndsAt->getTimestamp() - now()->getTimestamp();

        return $remaining > 0 ? $remaining : 0;
    }

    public static function issue(string $email, string $type): string
    {
        $plainCode = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        DB::transaction(function () use ($email, $type, $plainCode): void {
            static::query()
                ->where('email', $email)
                ->where('type', $type)
                ->delete();

            static::create([
                'email' => $email,
                'code' => Hash::make($plainCode),
                'type' => $type,
                'expires_at' => now()->addMinutes(self::EXPIRY_MINUTES),
            ]);
        });

        return $plainCode;
    }

    public static function consumeValid(string $email, string $type, string $plainCode): bool
    {
        $record = static::query()
            ->where('email', $email)
            ->where('type', $type)
            ->where('expires_at', '>', now())
            ->latest('id')
            ->first();

        if ($record === null || ! Hash::check($plainCode, $record->code)) {
            return false;
        }

        static::query()
            ->where('email', $email)
            ->where('type', $type)
            ->delete();

        return true;
    }
}
