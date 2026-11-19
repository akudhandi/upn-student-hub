<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Event;
use App\Models\MarketplaceListing;
use App\Models\ServiceListing;
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

    public function test_marketplace_index_sorts_by_price_and_latest(): void
    {
        $category = Category::create(['name' => 'Elektronik', 'slug' => 'elektronik-sort', 'type' => 'marketplace', 'is_active' => true]);
        MarketplaceListing::factory()->create(['category_id' => $category->id, 'price' => 450000, 'status' => 'active']);
        MarketplaceListing::factory()->create(['category_id' => $category->id, 'price' => 120000, 'status' => 'active']);
        MarketplaceListing::factory()->create(['category_id' => $category->id, 'price' => 980000, 'status' => 'active']);

        $asc = $this->getJson('/api/v1/marketplace?sort=price_asc')->assertOk();
        $this->assertEquals([120000, 450000, 980000], array_map('floatval', array_column($asc->json('data.data'), 'price')));

        $desc = $this->getJson('/api/v1/marketplace?sort=price_desc')->assertOk();
        $this->assertEquals([980000, 450000, 120000], array_map('floatval', array_column($desc->json('data.data'), 'price')));
    }

    public function test_lost_found_store_supports_nullable_privacy_and_social_contact(): void
    {
        $student = User::factory()->create();
        Sanctum::actingAs($student, ['student']);

        $chatOnly = $this->postJson('/api/v1/lost-found', [
            'type' => 'lost',
            'title' => 'Kartu Akses Lab',
            'location' => 'Gedung FIK',
            'description' => 'Tertinggal di ruang praktikum lantai 2',
            'contact_info' => null,
        ])->assertCreated();
        $this->assertNull($chatOnly->json('data.contact_info'));

        $social = $this->postJson('/api/v1/lost-found', [
            'type' => 'found',
            'title' => 'Tumbler Hitam',
            'location' => 'Perpustakaan UPN',
            'description' => 'Diamankan di meja informasi',
            'contact_info' => 'Instagram: @info.kampus.upn',
        ])->assertCreated();
        $this->assertSame('Instagram: @info.kampus.upn', $social->json('data.contact_info'));
    }

    public function test_services_index_filters_by_pricing_type_price_range_and_sorts(): void
    {
        $student = User::factory()->create();
        $category = Category::create([
            'name' => 'Jasa Desain & Media',
            'slug' => 'jasa-desain-media-p1',
            'type' => 'service',
            'is_active' => true,
        ]);

        ServiceListing::create([
            'user_id' => $student->id,
            'category_id' => $category->id,
            'title' => 'Tutor Kalkulus Privat',
            'description' => 'Bimbingan tatap muka di perpustakaan',
            'price_min' => 25000,
            'price_max' => null,
            'pricing_type' => 'per_hour',
            'status' => 'active',
        ]);
        ServiceListing::create([
            'user_id' => $student->id,
            'category_id' => $category->id,
            'title' => 'Desain Poster Acara',
            'description' => 'Paket desain cepat siap cetak',
            'price_min' => 80000,
            'price_max' => 120000,
            'pricing_type' => 'fixed',
            'status' => 'active',
        ]);
        ServiceListing::create([
            'user_id' => $student->id,
            'category_id' => $category->id,
            'title' => 'Dokumentasi Wisuda',
            'description' => 'Sesi foto kampus dan editing',
            'price_min' => 200000,
            'price_max' => 350000,
            'pricing_type' => 'starting_from',
            'status' => 'active',
        ]);

        $byPricing = $this->getJson('/api/v1/services?pricing_type=per_hour')->assertOk();
        $this->assertSame(1, $byPricing->json('data.total'));
        $this->assertSame('per_hour', $byPricing->json('data.data.0.pricing_type'));

        $byPriceRange = $this->getJson('/api/v1/services?min_price=50000&max_price=150000')->assertOk();
        $this->assertSame(1, $byPriceRange->json('data.total'));
        $this->assertEquals(80000, (float) $byPriceRange->json('data.data.0.price_min'));

        $asc = $this->getJson('/api/v1/services?sort=price_asc')->assertOk();
        $this->assertEquals([25000, 80000, 200000], array_map('floatval', array_column($asc->json('data.data'), 'price_min')));

        $desc = $this->getJson('/api/v1/services?sort=price_desc')->assertOk();
        $this->assertEquals([200000, 80000, 25000], array_map('floatval', array_column($desc->json('data.data'), 'price_min')));
    }

    public function test_events_index_filters_by_schedule_verified_and_sorts(): void
    {
        $student = User::factory()->create(['account_type' => 'student']);
        $hima = User::factory()->create(['account_type' => 'hima']);
        $category = Category::create([
            'name' => 'Seminar',
            'slug' => 'seminar-events-p1',
            'type' => 'event',
            'is_active' => true,
        ]);

        $pastEvent = Event::create([
            'user_id' => $student->id,
            'category_id' => $category->id,
            'title' => 'Workshop Lama',
            'slug' => 'workshop-lama-p1',
            'event_code' => 'EVT-PAST-01',
            'organizer_name' => 'Komunitas Mahasiswa',
            'event_date' => now()->subDays(5),
            'location' => 'Aula FIK',
            'description' => 'Kegiatan pekan lalu',
            'status' => 'published',
            'is_verified' => false,
        ]);
        $pastEvent->created_at = now()->subDays(10);
        $pastEvent->save();

        $upcomingOfficial = Event::create([
            'user_id' => $hima->id,
            'category_id' => $category->id,
            'title' => 'Seminar Nasional HIMA',
            'slug' => 'seminar-nasional-hima-p1',
            'event_code' => 'EVT-UP-01',
            'organizer_name' => 'HIMA Informatika',
            'event_date' => now()->addDays(3),
            'location' => 'Auditorium UPN',
            'description' => 'Seminar teknologi resmi',
            'status' => 'published',
            'is_verified' => false,
        ]);
        $upcomingOfficial->created_at = now()->subDays(2);
        $upcomingOfficial->save();

        $upcomingVerified = Event::create([
            'user_id' => $student->id,
            'category_id' => $category->id,
            'title' => 'Festival Kampus UPN',
            'slug' => 'festival-kampus-upn-p1',
            'event_code' => 'EVT-UP-02',
            'organizer_name' => 'Panitia Festival UPN',
            'event_date' => now()->addDays(14),
            'location' => 'Lapangan UPN',
            'description' => 'Festival tahunan mahasiswa',
            'status' => 'published',
            'is_verified' => true,
        ]);
        $upcomingVerified->created_at = now();
        $upcomingVerified->save();

        $upcoming = $this->getJson('/api/v1/events?schedule=upcoming')->assertOk();
        $this->assertSame(2, $upcoming->json('data.total'));
        $this->assertSame(
            ['Seminar Nasional HIMA', 'Festival Kampus UPN'],
            array_column($upcoming->json('data.data'), 'title')
        );

        $legacyUpcoming = $this->getJson('/api/v1/events?upcoming=1')->assertOk();
        $this->assertSame(2, $legacyUpcoming->json('data.total'));
        $this->assertSame(
            ['Seminar Nasional HIMA', 'Festival Kampus UPN'],
            array_column($legacyUpcoming->json('data.data'), 'title')
        );

        $past = $this->getJson('/api/v1/events?schedule=past')->assertOk();
        $this->assertSame(1, $past->json('data.total'));
        $this->assertSame(['Workshop Lama'], array_column($past->json('data.data'), 'title'));

        $verified = $this->getJson('/api/v1/events?verified=1')->assertOk();
        $this->assertSame(2, $verified->json('data.total'));
        $verifiedTitles = array_column($verified->json('data.data'), 'title');
        $this->assertContains('Seminar Nasional HIMA', $verifiedTitles);
        $this->assertContains('Festival Kampus UPN', $verifiedTitles);
        $this->assertNotContains('Workshop Lama', $verifiedTitles);

        $eventDesc = $this->getJson('/api/v1/events?sort=event_desc')->assertOk();
        $this->assertSame(
            ['Festival Kampus UPN', 'Seminar Nasional HIMA', 'Workshop Lama'],
            array_column($eventDesc->json('data.data'), 'title')
        );

        $latest = $this->getJson('/api/v1/events?sort=latest')->assertOk();
        $this->assertSame(
            ['Festival Kampus UPN', 'Seminar Nasional HIMA', 'Workshop Lama'],
            array_column($latest->json('data.data'), 'title')
        );
    }
}
