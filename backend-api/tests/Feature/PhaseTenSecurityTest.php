<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PhaseTenSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_can_read_public_endpoints_but_are_blocked_from_student_and_admin_endpoints(): void
    {
        // Public read-only endpoints remain accessible
        $this->getJson('/api/v1/marketplace')->assertOk();
        $this->getJson('/api/v1/services')->assertOk();
        $this->getJson('/api/v1/lost-found')->assertOk();
        $this->getJson('/api/v1/events')->assertOk();
        $this->getJson('/api/v1/categories')->assertOk();

        // Student private & write endpoints reject unauthenticated guests with 401
        $this->getJson('/api/v1/users/me')->assertStatus(401);
        $this->putJson('/api/v1/users/profile', ['name' => 'Anon'])->assertStatus(401);
        $this->postJson('/api/v1/marketplace', ['title' => 'Ilegal'])->assertStatus(401);
        $this->getJson('/api/v1/favorites')->assertStatus(401);
        $this->getJson('/api/v1/conversations')->assertStatus(401);
        $this->postJson('/api/v1/media/upload')->assertStatus(401);

        // Admin portal endpoints reject unauthenticated guests with 401
        $this->getJson('/api/v1/admin/stats')->assertStatus(401);
        $this->getJson('/api/v1/admin/users')->assertStatus(401);
        $this->get('/api/v1/admin/users/export')->assertStatus(401);
    }

    public function test_student_and_admin_tokens_cannot_cross_access_protected_portals(): void
    {
        $student = User::factory()->create(['status' => 'active']);
        $studentToken = $student->createToken('student_token')->plainTextToken;

        $admin = Admin::create([
            'email' => 'moderator@upnjatim.ac.id',
            'password' => Hash::make('password123'),
            'role' => 'admin',
        ]);
        $adminToken = $admin->createToken('admin_token')->plainTextToken;

        // Student token cannot access Admin Portal (403)
        $this->withHeader('Authorization', "Bearer {$studentToken}")
            ->getJson('/api/v1/admin/stats')
            ->assertStatus(403);

        $this->withHeader('Authorization', "Bearer {$studentToken}")
            ->getJson('/api/v1/admin/users')
            ->assertStatus(403);

        $this->app['auth']->forgetGuards();

        // Admin token cannot access Student-only profile/chat routes (403)
        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->getJson('/api/v1/users/me')
            ->assertStatus(403);

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->getJson('/api/v1/conversations')
            ->assertStatus(403);

        // Both active Student and Admin CAN upload media
        Storage::fake('public');
        $pngBytes = base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
        );

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson('/api/v1/media/upload', [
                'file' => UploadedFile::fake()->createWithContent('poster.png', $pngBytes),
                'folder' => 'events',
            ])
            ->assertCreated();
    }

    public function test_suspending_or_banning_student_revokes_tokens_and_blocks_login(): void
    {
        $student = User::factory()->create([
            'email' => 'mhs@student.upnjatim.ac.id',
            'password' => Hash::make('password123'),
            'status' => 'active',
        ]);
        $studentToken = $student->createToken('student_token')->plainTextToken;

        $admin = Admin::create([
            'email' => 'admin@upnjatim.ac.id',
            'password' => Hash::make('password123'),
            'role' => 'admin',
        ]);
        $adminToken = $admin->createToken('admin_token')->plainTextToken;

        // Student token initially works
        $this->withHeader('Authorization', "Bearer {$studentToken}")
            ->getJson('/api/v1/users/me')
            ->assertOk();

        $this->app['auth']->forgetGuards();

        // Admin suspends student
        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->patchJson("/api/v1/admin/users/{$student->id}/status", [
                'status' => 'suspended',
            ])
            ->assertOk();

        // Token was deleted from personal_access_tokens
        $this->assertSame(0, $student->tokens()->count());

        // Reset auth guard cache between requests in the same PHPUnit process
        $this->app['auth']->forgetGuards();

        // Revoked token is rejected with 401
        $this->withHeader('Authorization', "Bearer {$studentToken}")
            ->getJson('/api/v1/users/me')
            ->assertStatus(401);

        // Suspended student cannot log in again (403)
        $this->postJson('/api/v1/auth/login', [
            'email' => 'mhs@student.upnjatim.ac.id',
            'password' => 'password123',
        ])->assertStatus(403);
    }

    public function test_admin_profile_uses_authenticated_admin_and_can_create_event_without_preseeded_users(): void
    {
        Admin::create([
            'email' => 'first@upnjatim.ac.id',
            'password' => Hash::make('password123'),
            'role' => 'superadmin',
        ]);

        $secondAdmin = Admin::create([
            'email' => 'second@upnjatim.ac.id',
            'password' => Hash::make('secret1234'),
            'role' => 'admin',
        ]);
        $token = $secondAdmin->createToken('admin_token')->plainTextToken;

        // Profile returns second@upnjatim.ac.id, NOT Admin::first()
        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/admin/profile')
            ->assertOk()
            ->assertJsonPath('data.email', 'second@upnjatim.ac.id');

        // Admin can create an event even when no User existed beforehand
        $cat = Category::create([
            'name' => 'Seminar',
            'slug' => 'seminar-sec',
            'type' => 'event',
            'is_active' => true,
        ]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/admin/events', [
                'title' => 'Seminar Keamanan Siber Kampus',
                'category_id' => $cat->id,
                'organizer_name' => 'BEM Fasilkom',
                'event_date' => '2026-12-10 09:00:00',
                'location' => 'Gedung Giri Loka',
                'description' => 'Terbuka untuk seluruh mahasiswa.',
                'status' => 'published',
            ])
            ->assertCreated();
    }

    public function test_login_endpoint_enforces_rate_limiting(): void
    {
        for ($i = 0; $i < 10; $i++) {
            $this->postJson('/api/v1/auth/login', [
                'email' => 'bruteforce@student.upnjatim.ac.id',
                'password' => 'wrong-password',
            ])->assertStatus(401);
        }

        // 11th attempt within 1 minute hits 429 Too Many Requests
        $this->postJson('/api/v1/auth/login', [
            'email' => 'bruteforce@student.upnjatim.ac.id',
            'password' => 'wrong-password',
        ])->assertStatus(429);
    }
}
