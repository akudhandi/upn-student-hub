<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\User;
use Database\Seeders\AdminSeeder;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\App;
use Tests\TestCase;

class AuditStageOneHardeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_dev_header_auth_requires_explicit_opt_in_flag_even_in_local_environment(): void
    {
        $student = User::factory()->create(['status' => 'active']);
        $originalEnv = $this->app['env'];
        $originalFlag = config('app.allow_dev_fallback_auth');

        $this->app['env'] = 'local';
        config(['app.allow_dev_fallback_auth' => false]);

        try {
            $this->withHeader('X-Dev-User-Id', (string) $student->id)
                ->getJson('/api/v1/users/me')
                ->assertStatus(401);

            config(['app.allow_dev_fallback_auth' => true]);

            $this->withHeader('X-Dev-User-Id', (string) $student->id)
                ->getJson('/api/v1/users/me')
                ->assertOk()
                ->assertJsonPath('data.user.id', $student->id);
        } finally {
            config(['app.allow_dev_fallback_auth' => $originalFlag]);
            $this->app['env'] = $originalEnv;
        }
    }

    public function test_auth_attempts_enforces_per_ip_cap_across_rotating_emails(): void
    {
        for ($i = 1; $i <= 30; $i++) {
            $this->withServerVariables(['REMOTE_ADDR' => '10.99.99.55'])
                ->postJson('/api/v1/auth/login', [
                    'email' => "attacker{$i}@student.upnjatim.ac.id",
                    'password' => 'wrong-password',
                ])
                ->assertStatus(401);
        }

        // 31st attempt from the same IP with a brand-new email still hits 429
        $this->withServerVariables(['REMOTE_ADDR' => '10.99.99.55'])
            ->postJson('/api/v1/auth/login', [
                'email' => 'attacker31@student.upnjatim.ac.id',
                'password' => 'wrong-password',
            ])
            ->assertStatus(429);
    }

    public function test_api_rate_limiter_isolates_buckets_by_sanctum_user_on_same_ip(): void
    {
        $studentA = User::factory()->create(['status' => 'active']);
        $studentB = User::factory()->create(['status' => 'active']);

        $tokenA = $studentA->createToken('student-a')->plainTextToken;
        $tokenB = $studentB->createToken('student-b')->plainTextToken;

        $firstA = $this->withServerVariables(['REMOTE_ADDR' => '10.99.99.77'])
            ->withToken($tokenA)
            ->getJson('/api/v1/marketplace')
            ->assertOk();

        $secondA = $this->withServerVariables(['REMOTE_ADDR' => '10.99.99.77'])
            ->withToken($tokenA)
            ->getJson('/api/v1/marketplace')
            ->assertOk();

        // Reset resolved guard cache between separate requests in the same test process
        $this->app['auth']->forgetGuards();

        $firstB = $this->withServerVariables(['REMOTE_ADDR' => '10.99.99.77'])
            ->withToken($tokenB)
            ->getJson('/api/v1/marketplace')
            ->assertOk();

        $this->app['auth']->forgetGuards();
        $this->flushHeaders();

        $guest = $this->withServerVariables(['REMOTE_ADDR' => '10.99.99.77'])
            ->getJson('/api/v1/marketplace')
            ->assertOk();

        $this->assertSame('119', $firstA->headers->get('X-RateLimit-Remaining'));
        $this->assertSame('118', $secondA->headers->get('X-RateLimit-Remaining'));
        $this->assertSame('119', $firstB->headers->get('X-RateLimit-Remaining'));
        $this->assertSame('119', $guest->headers->get('X-RateLimit-Remaining'));
    }

    public function test_seeders_skip_default_accounts_in_production_environment(): void
    {
        $originalEnv = $this->app['env'];
        $this->app['env'] = 'production';

        try {
            App::make(AdminSeeder::class)->run();
            App::make(UserSeeder::class)->run();

            $this->assertSame(0, Admin::count());
            $this->assertSame(0, User::count());
        } finally {
            $this->app['env'] = $originalEnv;
        }
    }
}
