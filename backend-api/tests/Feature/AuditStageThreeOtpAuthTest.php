<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Mail\OtpCodeMail;
use App\Models\OtpCode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class AuditStageThreeOtpAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_requires_otp_verification_hashes_code_and_blocks_unverified_login(): void
    {
        Mail::fake();

        $email = 'otp.student@student.upnjatim.ac.id';

        $registerRes = $this->postJson('/api/v1/auth/register', [
            'name' => 'Siti Aisyah',
            'email' => $email,
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'nim' => '22081010123',
            'faculty' => 'Fakultas Ilmu Komputer',
        ])->assertCreated();

        $registerRes
            ->assertJsonPath('requires_verification', true)
            ->assertJsonPath('email', $email)
            ->assertJsonMissingPath('token');

        $sentCode = null;
        Mail::assertSent(OtpCodeMail::class, function (OtpCodeMail $mail) use ($email, &$sentCode): bool {
            if ($mail->hasTo($email) && $mail->type === OtpCode::TYPE_REGISTER) {
                $sentCode = $mail->code;

                return true;
            }

            return false;
        });

        $this->assertIsString($sentCode);
        $this->assertMatchesRegularExpression('/^\d{6}$/', $sentCode);

        // OTP code in database must be hashed, never stored in plaintext
        $otpRecord = OtpCode::where('email', $email)->where('type', OtpCode::TYPE_REGISTER)->first();
        $this->assertNotNull($otpRecord);
        $this->assertNotSame($sentCode, $otpRecord->code);
        $this->assertTrue(Hash::check($sentCode, $otpRecord->code));

        // Login before email verification returns 403 with requires_verification flag
        $this->postJson('/api/v1/auth/login', [
            'email' => $email,
            'password' => 'password123',
        ])->assertStatus(403)->assertJsonPath('requires_verification', true);

        // Wrong OTP fails 422
        $wrongCode = $sentCode === '000000' ? '999999' : '000000';
        $this->postJson('/api/v1/auth/verify-otp', [
            'email' => $email,
            'code' => $wrongCode,
        ])->assertStatus(422);

        // Valid OTP verifies account, consumes OTP row, and returns usable Sanctum token
        $verifyRes = $this->postJson('/api/v1/auth/verify-otp', [
            'email' => $email,
            'code' => $sentCode,
        ])->assertOk();

        $token = $verifyRes->json('token');
        $this->assertIsString($token);
        $this->assertNotEmpty($token);

        $this->assertDatabaseMissing('otp_codes', [
            'email' => $email,
            'type' => OtpCode::TYPE_REGISTER,
        ]);

        $user = User::where('email', $email)->firstOrFail();
        $this->assertNotNull($user->email_verified_at);

        $this->withToken($token)
            ->getJson('/api/v1/users/me')
            ->assertOk()
            ->assertJsonPath('data.user.email', $email);
    }

    public function test_verify_otp_rejects_expired_code(): void
    {
        Mail::fake();

        $email = 'expired.otp@student.upnjatim.ac.id';
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Rizky Pratama',
            'email' => $email,
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertCreated();

        $sentCode = null;
        Mail::assertSent(OtpCodeMail::class, function (OtpCodeMail $mail) use (&$sentCode): bool {
            $sentCode = $mail->code;

            return true;
        });

        $this->travel(OtpCode::EXPIRY_MINUTES + 1)->minutes();

        $this->postJson('/api/v1/auth/verify-otp', [
            'email' => $email,
            'code' => (string) $sentCode,
        ])->assertStatus(422);
    }

    public function test_resend_otp_enforces_cooldown_and_invalidates_previous_code(): void
    {
        Mail::fake();

        $email = 'resend.otp@student.upnjatim.ac.id';
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Dewi Lestari',
            'email' => $email,
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertCreated();

        $firstCode = null;
        Mail::assertSent(OtpCodeMail::class, function (OtpCodeMail $mail) use (&$firstCode): bool {
            $firstCode = $mail->code;

            return true;
        });

        // Immediate resend within 60s hits 429 cooldown
        $this->postJson('/api/v1/auth/resend-otp', [
            'email' => $email,
            'type' => 'register',
        ])->assertStatus(429)->assertJsonStructure(['message', 'retry_after']);

        $this->travel(OtpCode::RESEND_COOLDOWN_SECONDS + 2)->seconds();

        $this->postJson('/api/v1/auth/resend-otp', [
            'email' => $email,
            'type' => 'register',
        ])->assertOk();

        $secondCode = null;
        Mail::assertSent(OtpCodeMail::class, function (OtpCodeMail $mail) use ($firstCode, &$secondCode): bool {
            if ($mail->code !== $firstCode) {
                $secondCode = $mail->code;

                return true;
            }

            return false;
        });

        // If by 1-in-1,000,000 chance same code was generated, skip differing assertion
        if ($secondCode !== null) {
            $this->postJson('/api/v1/auth/verify-otp', [
                'email' => $email,
                'code' => (string) $firstCode,
            ])->assertStatus(422);

            $this->postJson('/api/v1/auth/verify-otp', [
                'email' => $email,
                'code' => $secondCode,
            ])->assertOk();
        }
    }

    public function test_forgot_and_reset_password_anti_enumeration_updates_password_and_revokes_tokens(): void
    {
        Mail::fake();

        // Unknown email still returns 200 without sending email (anti-enumeration)
        $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'tidakada@student.upnjatim.ac.id',
        ])->assertOk();

        Mail::assertNothingSent();

        $user = User::factory()->create([
            'email' => 'reset.user@student.upnjatim.ac.id',
            'password' => Hash::make('oldpassword123'),
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $existingToken = $user->createToken('old-session')->plainTextToken;

        $this->postJson('/api/v1/auth/forgot-password', [
            'email' => $user->email,
        ])->assertOk();

        $resetCode = null;
        Mail::assertSent(OtpCodeMail::class, function (OtpCodeMail $mail) use ($user, &$resetCode): bool {
            if ($mail->hasTo($user->email) && $mail->type === OtpCode::TYPE_PASSWORD_RESET) {
                $resetCode = $mail->code;

                return true;
            }

            return false;
        });

        $this->assertNotNull($resetCode);

        // Wrong OTP fails 422 and preserves old password & token
        $wrongCode = $resetCode === '000000' ? '999999' : '000000';
        $this->postJson('/api/v1/auth/reset-password', [
            'email' => $user->email,
            'code' => $wrongCode,
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ])->assertStatus(422);

        // Valid OTP resets password, deletes OTP, and revokes all Sanctum tokens
        $this->postJson('/api/v1/auth/reset-password', [
            'email' => $user->email,
            'code' => $resetCode,
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ])->assertOk();

        $this->assertSame(0, $user->fresh()->tokens()->count());

        $this->withToken($existingToken)
            ->getJson('/api/v1/users/me')
            ->assertStatus(401);

        // Old password fails, new password succeeds
        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'oldpassword123',
        ])->assertStatus(401);

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'newpassword123',
        ])->assertOk()->assertJsonStructure(['token', 'user']);
    }
}
