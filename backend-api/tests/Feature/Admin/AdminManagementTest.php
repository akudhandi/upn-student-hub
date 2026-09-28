<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\Admin;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminManagementTest extends TestCase
{
    use RefreshDatabase;

    private function superadminToken(): string
    {
        $admin = Admin::create([
            'email' => 'super@upnjatim.ac.id',
            'password' => Hash::make('password'),
            'role' => 'superadmin',
        ]);

        return $admin->createToken('test')->plainTextToken;
    }

    private function adminToken(): string
    {
        $admin = Admin::create([
            'email' => 'staff@upnjatim.ac.id',
            'password' => Hash::make('password'),
            'role' => 'admin',
        ]);

        return $admin->createToken('test')->plainTextToken;
    }

    public function test_guests_cannot_manage_admins(): void
    {
        $this->getJson('/api/v1/admin/admins')->assertStatus(401);
    }

    public function test_non_superadmin_cannot_manage_admins(): void
    {
        $headers = ['Authorization' => 'Bearer '.$this->adminToken()];

        $this->getJson('/api/v1/admin/admins', $headers)->assertStatus(403);
        $this->postJson('/api/v1/admin/admins', [
            'email' => 'baru@upnjatim.ac.id',
            'password' => 'password123',
        ], $headers)->assertStatus(403);
    }

    public function test_superadmin_can_list_admins_without_passwords(): void
    {
        $headers = ['Authorization' => 'Bearer '.$this->superadminToken()];

        $response = $this->getJson('/api/v1/admin/admins', $headers);

        $response->assertOk();
        $this->assertSame('super@upnjatim.ac.id', $response->json('data.data.0.email'));
        $this->assertArrayNotHasKey('password', $response->json('data.data.0'));
    }

    public function test_superadmin_can_create_admin(): void
    {
        $headers = ['Authorization' => 'Bearer '.$this->superadminToken()];

        $response = $this->postJson('/api/v1/admin/admins', [
            'email' => 'baru@upnjatim.ac.id',
            'password' => 'password123',
            'role' => 'admin',
        ], $headers);

        $response->assertStatus(201);
        $this->assertSame('baru@upnjatim.ac.id', $response->json('data.email'));
        $this->assertTrue(Hash::check(
            'password123',
            Admin::where('email', 'baru@upnjatim.ac.id')->firstOrFail()->password
        ));

        $this->postJson('/api/v1/admin/admins', [
            'email' => 'baru@upnjatim.ac.id',
            'password' => 'password123',
        ], $headers)->assertStatus(422);
    }

    public function test_superadmin_can_delete_other_admin_but_not_self_or_last_superadmin(): void
    {
        $super = Admin::create([
            'email' => 'super@upnjatim.ac.id',
            'password' => Hash::make('password'),
            'role' => 'superadmin',
        ]);
        $headers = ['Authorization' => 'Bearer '.$super->createToken('test')->plainTextToken];

        $staff = Admin::create([
            'email' => 'staff@upnjatim.ac.id',
            'password' => Hash::make('password'),
            'role' => 'admin',
        ]);

        $this->deleteJson("/api/v1/admin/admins/{$staff->id}", [], $headers)->assertOk();
        $this->assertNull(Admin::find($staff->id));

        $self = $this->deleteJson("/api/v1/admin/admins/{$super->id}", [], $headers);
        $self->assertStatus(422);
        $self->assertJsonPath('message', 'Tidak dapat menghapus akun sendiri');

        $this->deleteJson('/api/v1/admin/admins/999999', [], $headers)->assertStatus(404);
    }
}
