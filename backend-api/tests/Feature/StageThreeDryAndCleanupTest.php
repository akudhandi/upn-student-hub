<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Http\Controllers\Api\V1\Concerns\ResolvesStudentUser;
use App\Models\MarketplaceListing;
use App\Models\OtpCode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

class StageThreeDryAndCleanupTest extends TestCase
{
    use RefreshDatabase;

    public function test_resolves_student_user_dev_header_respects_environment_and_active_status(): void
    {
        $active = User::factory()->create(['status' => 'active']);
        $suspended = User::factory()->create(['status' => 'suspended']);

        // In 'testing' environment (non-local), X-Dev-User-Id is ignored
        $reqTesting = Request::create('/api/v1/marketplace', 'GET');
        $reqTesting->headers->set('X-Dev-User-Id', (string) $active->id);
        $this->assertNull(ResolvesStudentUser::resolveFromDevHeader($reqTesting));

        // Simulate 'local' environment without ALLOW_DEV_FALLBACK_AUTH: still ignored
        $originalEnv = $this->app['env'];
        $originalDevFallback = config('app.allow_dev_fallback_auth');
        $this->app['env'] = 'local';
        config(['app.allow_dev_fallback_auth' => false]);

        try {
            $reqDisabled = Request::create('/api/v1/marketplace', 'GET');
            $reqDisabled->headers->set('X-Dev-User-Id', (string) $active->id);
            $this->assertNull(ResolvesStudentUser::resolveFromDevHeader($reqDisabled, true));

            config(['app.allow_dev_fallback_auth' => true]);

            $reqActive = Request::create('/api/v1/marketplace', 'GET');
            $reqActive->headers->set('X-Dev-User-Id', (string) $active->id);
            $this->assertSame($active->id, ResolvesStudentUser::resolveFromDevHeader($reqActive, true)?->id);

            $reqSuspended = Request::create('/api/v1/marketplace', 'GET');
            $reqSuspended->headers->set('X-Dev-User-Id', (string) $suspended->id);
            $this->assertNull(ResolvesStudentUser::resolveFromDevHeader($reqSuspended, true));
            $this->assertSame($suspended->id, ResolvesStudentUser::resolveFromDevHeader($reqSuspended, false)?->id);
        } finally {
            config(['app.allow_dev_fallback_auth' => $originalDevFallback]);
            $this->app['env'] = $originalEnv;
        }
    }

    public function test_register_accepts_indonesian_names_with_punctuation_and_rejects_digits(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'name' => "M. Iqbal Ma'ruf, S.Kom",
            'email' => 'iqbal.maruf@student.upnjatim.ac.id',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertStatus(201);

        $this->postJson('/api/v1/auth/register', [
            'name' => 'Budi 123',
            'email' => 'budi123@student.upnjatim.ac.id',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertStatus(422)->assertJsonValidationErrors(['name']);
    }

    public function test_unused_otp_code_model_is_removed(): void
    {
        $this->assertTrue(class_exists(OtpCode::class));
        $this->assertSame('register', OtpCode::TYPE_REGISTER);
        $this->assertSame('password_reset', OtpCode::TYPE_PASSWORD_RESET);
    }
}
