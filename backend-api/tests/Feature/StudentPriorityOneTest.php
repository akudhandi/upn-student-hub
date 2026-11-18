<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Category;
use App\Models\MarketplaceListing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StudentPriorityOneTest extends TestCase
{
    use RefreshDatabase;

    public function test_media_upload_stores_file_on_public_disk_and_returns_relative_path(): void
    {
        Storage::fake('public');
        Sanctum::actingAs(User::factory()->create(['status' => 'active']));

        // 1x1 valid PNG binary (tests real finfo + getimagesize validation without GD imagejpeg)
        $pngBytes = base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
        );
        $file = UploadedFile::fake()->createWithContent('buku-kalkulus.png', $pngBytes);

        $response = $this->postJson('/api/v1/media/upload', [
            'file' => $file,
            'folder' => 'marketplace',
        ]);

        $response->assertCreated();
        $path = $response->json('data.path');
        $this->assertIsString($path);
        $this->assertStringStartsWith('marketplace/', $path);
        Storage::disk('public')->assertExists($path);
    }

    public function test_student_can_fetch_me_and_update_profile(): void
    {
        $user = User::factory()->create(['name' => 'Budi Santoso']);
        Sanctum::actingAs($user);

        $update = $this->putJson('/api/v1/users/profile', [
            'name' => 'Budi Santoso Putra',
            'nim' => '22081010099',
            'faculty' => 'Fakultas Ilmu Komputer',
            'bio' => 'Mahasiswa Informatika UPN.',
            'avatar' => 'avatars/budi.jpg',
        ]);

        $update->assertOk();
        $update->assertJsonPath('data.name', 'Budi Santoso Putra');
        $update->assertJsonPath('data.profile.nim', '22081010099');
        $update->assertJsonPath('data.profile.avatar', 'avatars/budi.jpg');

        $me = $this->getJson('/api/v1/users/me');
        $me->assertOk();
        $me->assertJsonPath('data.user.profile.faculty', 'Fakultas Ilmu Komputer');
        $me->assertJsonPath('data.stats.active_listings_count', 0);
    }

    public function test_marketplace_owner_can_attach_images_edit_mark_sold_and_delete_while_non_owner_is_forbidden(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $category = Category::create([
            'name' => 'Elektronik',
            'slug' => 'elektronik-p1',
            'type' => 'marketplace',
            'is_active' => true,
        ]);

        Sanctum::actingAs($owner);

        $created = $this->postJson('/api/v1/marketplace', [
            'title' => 'Mouse Wireless Mulus',
            'description' => 'Kondisi normal lengkap dongle.',
            'price' => 85000,
            'condition' => 'like-new',
            'category_id' => $category->id,
            'image_paths' => ['marketplace/mouse-1.jpg', 'marketplace/mouse-2.jpg'],
        ]);

        $created->assertCreated();
        $listingId = $created->json('data.id');
        $this->assertCount(2, $created->json('data.images'));

        // Non-owner cannot edit or delete
        Sanctum::actingAs($other);
        $this->putJson("/api/v1/marketplace/{$listingId}", ['title' => 'Dibajak'])
            ->assertStatus(403);
        $this->deleteJson("/api/v1/marketplace/{$listingId}")
            ->assertStatus(403);

        // Owner can edit, mark sold, and soft-delete
        Sanctum::actingAs($owner);
        $this->putJson("/api/v1/marketplace/{$listingId}", [
            'title' => 'Mouse Logitech Wireless Mulus',
            'price' => 75000,
        ])->assertOk()
            ->assertJsonPath('data.title', 'Mouse Logitech Wireless Mulus');

        $this->patchJson("/api/v1/marketplace/{$listingId}/status", [
            'status' => 'sold',
        ])->assertOk()
            ->assertJsonPath('data.status', 'sold');

        $this->deleteJson("/api/v1/marketplace/{$listingId}")
            ->assertOk();

        $this->assertSoftDeleted('marketplace_listings', ['id' => $listingId]);
    }

    public function test_public_categories_endpoint_filters_active_by_type(): void
    {
        Category::create(['name' => 'Buku Kuliah', 'slug' => 'buku-kuliah-p1', 'type' => 'marketplace', 'is_active' => true]);
        Category::create(['name' => 'Nonaktif', 'slug' => 'nonaktif-p1', 'type' => 'marketplace', 'is_active' => false]);
        Category::create(['name' => 'Seminar', 'slug' => 'seminar-p1', 'type' => 'event', 'is_active' => true]);

        $response = $this->getJson('/api/v1/categories?type=marketplace');
        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertSame('Buku Kuliah', $response->json('data.0.name'));
    }

    public function test_marketplace_index_filters_by_price_range_and_updates_total(): void
    {
        $category = Category::create(['name' => 'Buku Kuliah', 'slug' => 'buku-kuliah-price', 'type' => 'marketplace', 'is_active' => true]);
        MarketplaceListing::factory()->create(['category_id' => $category->id, 'price' => 150000, 'status' => 'active']);
        MarketplaceListing::factory()->create(['category_id' => $category->id, 'price' => 750000, 'status' => 'active']);
        MarketplaceListing::factory()->create(['category_id' => $category->id, 'price' => 1500000, 'status' => 'active']);

        $mid = $this->getJson('/api/v1/marketplace?min_price=500000&max_price=1000000')->assertOk();
        $this->assertSame(1, $mid->json('data.total'));
        $this->assertEquals(750000, (float) $mid->json('data.data.0.price'));

        $low = $this->getJson('/api/v1/marketplace?max_price=499999')->assertOk();
        $this->assertSame(1, $low->json('data.total'));
        $this->assertEquals(150000, (float) $low->json('data.data.0.price'));
    }
}
