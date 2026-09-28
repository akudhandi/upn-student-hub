<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\Category;
use App\Models\Event;
use App\Models\KostListing;
use App\Models\LostFoundReport;
use App\Models\MarketplaceListing;
use App\Models\Report;
use App\Models\ServiceListing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminFilterTest extends TestCase
{
    use RefreshDatabase;

    public function test_marketplace_can_filter_by_category(): void
    {
        $catA = Category::create(['name' => 'Elektronik', 'slug' => 'elektronik-test', 'type' => 'marketplace']);
        $catB = Category::create(['name' => 'Buku', 'slug' => 'buku-test', 'type' => 'marketplace']);
        $wanted = MarketplaceListing::factory()->create(['category_id' => $catA->id]);
        MarketplaceListing::factory()->create(['category_id' => $catB->id]);

        $response = $this->getJson("/api/v1/admin/marketplace?category_id={$catA->id}");

        $response->assertOk();
        $this->assertSame(1, $response->json('data.total'));
        $this->assertSame($wanted->id, $response->json('data.data.0.id'));
    }

    public function test_marketplace_can_filter_by_date_range(): void
    {
        MarketplaceListing::factory()->create(['created_at' => '2026-01-10 10:00:00']);
        $wanted = MarketplaceListing::factory()->create(['created_at' => '2026-02-20 10:00:00']);

        $response = $this->getJson('/api/v1/admin/marketplace?date_from=2026-02-01&date_to=2026-02-28');

        $response->assertOk();
        $this->assertSame(1, $response->json('data.total'));
        $this->assertSame($wanted->id, $response->json('data.data.0.id'));
    }

    public function test_services_can_filter_by_category(): void
    {
        $cat = Category::create(['name' => 'Desain', 'slug' => 'desain-test', 'type' => 'service']);
        $other = Category::create(['name' => 'Les', 'slug' => 'les-test', 'type' => 'service']);
        $wanted = ServiceListing::factory()->create(['category_id' => $cat->id]);
        ServiceListing::factory()->create(['category_id' => $other->id]);

        $response = $this->getJson("/api/v1/admin/services?category_id={$cat->id}");

        $response->assertOk();
        $this->assertSame(1, $response->json('data.total'));
        $this->assertSame($wanted->id, $response->json('data.data.0.id'));
    }

    public function test_kost_can_filter_by_gender_type(): void
    {
        $wanted = KostListing::factory()->create(['gender_type' => 'putra']);
        KostListing::factory()->create(['gender_type' => 'putri']);

        $response = $this->getJson('/api/v1/admin/kost?gender_type=putra');

        $response->assertOk();
        $this->assertSame(1, $response->json('data.total'));
        $this->assertSame($wanted->id, $response->json('data.data.0.id'));
    }

    public function test_lost_found_can_filter_by_category(): void
    {
        $cat = Category::create(['name' => 'Dompet', 'slug' => 'dompet-test', 'type' => 'lost_found']);
        $other = Category::create(['name' => 'Kunci', 'slug' => 'kunci-test', 'type' => 'lost_found']);
        $wanted = LostFoundReport::factory()->create(['category_id' => $cat->id, 'status' => 'open']);
        LostFoundReport::factory()->create(['category_id' => $other->id, 'status' => 'open']);

        $response = $this->getJson("/api/v1/admin/lost-found?category_id={$cat->id}");

        $response->assertOk();
        $this->assertSame(1, $response->json('data.total'));
        $this->assertSame($wanted->id, $response->json('data.data.0.id'));
    }

    public function test_events_can_filter_by_category_and_event_date(): void
    {
        $cat = Category::create(['name' => 'Lomba', 'slug' => 'lomba-test', 'type' => 'event']);
        $wanted = Event::factory()->create(['category_id' => $cat->id, 'event_date' => '2026-05-10 09:00:00']);
        Event::factory()->create(['event_date' => '2026-08-10 09:00:00']);

        $response = $this->getJson("/api/v1/admin/events?category_id={$cat->id}&date_from=2026-05-01&date_to=2026-05-31");

        $response->assertOk();
        $this->assertSame(1, $response->json('data.total'));
        $this->assertSame($wanted->id, $response->json('data.data.0.id'));
    }

    public function test_reports_can_search_and_filter_by_type(): void
    {
        $reporter = User::factory()->create(['name' => 'Pelapor Unik']);
        $target = User::factory()->create();
        $wanted = Report::create([
            'reporter_id' => $reporter->id,
            'reportable_type' => User::class,
            'reportable_id' => $target->id,
            'reason' => 'Dugaan penipuan-THX-123',
            'status' => 'pending',
        ]);
        Report::create([
            'reporter_id' => $reporter->id,
            'reportable_type' => MarketplaceListing::class,
            'reportable_id' => MarketplaceListing::factory()->create()->id,
            'reason' => 'Barang tidak sesuai',
            'status' => 'pending',
        ]);

        $search = $this->getJson('/api/v1/admin/reports?search=THX-123');
        $search->assertOk();
        $this->assertSame(1, $search->json('data.total'));
        $this->assertSame($wanted->id, $search->json('data.data.0.id'));

        $byType = $this->getJson('/api/v1/admin/reports?reportable_type='.urlencode(User::class));
        $byType->assertOk();
        $this->assertSame(1, $byType->json('data.total'));
    }

    public function test_users_can_filter_by_date_range(): void
    {
        User::factory()->create(['created_at' => '2026-01-05 10:00:00']);
        $wanted = User::factory()->create(['created_at' => '2026-03-15 10:00:00']);

        $response = $this->getJson('/api/v1/admin/users?date_from=2026-03-01&date_to=2026-03-31');

        $response->assertOk();
        $this->assertSame(1, $response->json('data.total'));
        $this->assertSame($wanted->id, $response->json('data.data.0.id'));
    }
}
