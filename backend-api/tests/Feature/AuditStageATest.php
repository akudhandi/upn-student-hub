<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Category;
use App\Models\Event;
use App\Models\LostFoundReport;
use App\Models\MarketplaceListing;
use App\Models\Report;
use App\Models\ServiceListing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuditStageATest extends TestCase
{
    use RefreshDatabase;

    private function createAdminToken(): string
    {
        $admin = Admin::create([
            'email' => 'moderator-a@upnjatim.ac.id',
            'password' => Hash::make('password123'),
            'role' => 'admin',
        ]);

        return $admin->createToken('admin_token')->plainTextToken;
    }

    /**
     * @return array<string, string>
     */
    private function bearer(string $token): array
    {
        $this->app['auth']->forgetGuards();

        return ['Authorization' => "Bearer {$token}"];
    }

    public function test_student_event_submission_starts_pending_and_non_published_events_do_not_leak(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $ownerToken = $owner->createToken('student_token')->plainTextToken;
        $otherToken = $other->createToken('student_token')->plainTextToken;

        $cat = Category::create([
            'name' => 'Seminar',
            'slug' => 'seminar-stage-a',
            'type' => 'event',
            'is_active' => true,
        ]);

        // Student submits an event -> status must be pending
        $submit = $this->postJson('/api/v1/events', [
            'title' => 'Workshop Riset Mahasiswa',
            'category_id' => $cat->id,
            'organizer_name' => 'UKM Penalaran',
            'event_date' => '2026-12-20 09:00:00',
            'location' => 'Aula Fasilkom',
            'description' => 'Workshop metodologi penelitian.',
        ], $this->bearer($ownerToken));

        $submit->assertCreated()
            ->assertJsonPath('data.status', 'pending');

        $pendingEventId = $submit->json('data.id');

        // Also create published, draft, and archived events
        $published = Event::factory()->create(['status' => 'published', 'title' => 'Event Publik']);
        Event::factory()->create(['status' => 'draft', 'title' => 'Event Draft']);
        Event::factory()->create(['status' => 'archived', 'title' => 'Event Arsip']);

        // Public index only returns published events
        $this->app['auth']->forgetGuards();
        $index = $this->getJson('/api/v1/events')->assertOk();
        $this->assertSame(1, $index->json('data.total'));
        $this->assertSame($published->id, $index->json('data.data.0.id'));

        // Guest and other student receive 404 for pending event detail
        $this->app['auth']->forgetGuards();
        $this->getJson("/api/v1/events/{$pendingEventId}")->assertStatus(404);

        $this->getJson("/api/v1/events/{$pendingEventId}", $this->bearer($otherToken))
            ->assertStatus(404);

        // Owner CAN preview their own pending event
        $this->getJson("/api/v1/events/{$pendingEventId}", $this->bearer($ownerToken))
            ->assertOk()
            ->assertJsonPath('data.status', 'pending');
    }

    public function test_lost_found_moderation_hides_items_and_syncs_open_active_statuses(): void
    {
        $owner = User::factory()->create();
        $ownerToken = $owner->createToken('student_token')->plainTextToken;
        $adminToken = $this->createAdminToken();

        // Student creates a new Lost & Found -> canonical status 'open'
        $created = $this->postJson('/api/v1/lost-found', [
            'type' => 'lost',
            'title' => 'KTM Hilang Dekat Kantin',
            'location' => 'Kantin FTI',
            'description' => 'KTM atas nama Budi.',
            'contact_info' => '081234567890',
        ], $this->bearer($ownerToken))
            ->assertCreated();

        $this->assertSame('open', $created->json('data.status'));
        $openId = $created->json('data.id');

        // Legacy active record + hidden record
        $legacyActive = LostFoundReport::factory()->create(['status' => 'active', 'title' => 'Kunci Motor Lama']);
        $hidden = LostFoundReport::factory()->create(['status' => 'hidden', 'title' => 'Laporan Disembunyikan']);

        // Public index excludes hidden report
        $this->app['auth']->forgetGuards();
        $publicIndex = $this->getJson('/api/v1/lost-found')->assertOk();
        $publicIds = collect($publicIndex->json('data.data'))->pluck('id')->all();
        $this->assertContains($openId, $publicIds);
        $this->assertContains($legacyActive->id, $publicIds);
        $this->assertNotContains($hidden->id, $publicIds);

        // Guest gets 404 on hidden report detail
        $this->app['auth']->forgetGuards();
        $this->getJson("/api/v1/lost-found/{$hidden->id}")->assertStatus(404);

        // Admin filter status=open matches BOTH open and legacy active
        $adminOpen = $this->getJson('/api/v1/admin/lost-found?status=open', $this->bearer($adminToken))
            ->assertOk();
        $this->assertSame(2, $adminOpen->json('data.total'));

        // Admin dashboard counts both open and active in active_listings
        $stats = $this->getJson('/api/v1/admin/stats', $this->bearer($adminToken))
            ->assertOk();
        $this->assertSame(2, $stats->json('data.active_listings'));
    }

    public function test_owner_cannot_reactivate_admin_hidden_listings_and_report_hide_content_is_consistent(): void
    {
        $owner = User::factory()->create();
        $reporter = User::factory()->create();
        $ownerToken = $owner->createToken('student_token')->plainTextToken;
        $adminToken = $this->createAdminToken();

        $mkt = MarketplaceListing::factory()->create(['user_id' => $owner->id, 'status' => 'hidden']);
        $svc = ServiceListing::factory()->create(['user_id' => $owner->id, 'status' => 'hidden']);
        $lf = LostFoundReport::factory()->create(['user_id' => $owner->id, 'status' => 'hidden']);

        // Owner cannot bypass moderation via PATCH status
        $this->patchJson("/api/v1/marketplace/{$mkt->id}/status", ['status' => 'active'], $this->bearer($ownerToken))
            ->assertStatus(403);
        $this->patchJson("/api/v1/services/{$svc->id}/status", ['status' => 'active'], $this->bearer($ownerToken))
            ->assertStatus(403);
        $this->patchJson("/api/v1/lost-found/{$lf->id}/status", ['status' => 'open'], $this->bearer($ownerToken))
            ->assertStatus(403);

        // Report hide_content sets hidden on marketplace and archived on event
        $activeMkt = MarketplaceListing::factory()->create(['user_id' => $owner->id, 'status' => 'active']);
        $activeEvent = Event::factory()->create(['status' => 'published']);

        $reportMkt = Report::create([
            'reporter_id' => $reporter->id,
            'reportable_type' => MarketplaceListing::class,
            'reportable_id' => $activeMkt->id,
            'reason' => 'spam',
            'status' => 'pending',
        ]);
        $reportEvt = Report::create([
            'reporter_id' => $reporter->id,
            'reportable_type' => Event::class,
            'reportable_id' => $activeEvent->id,
            'reason' => 'inappropriate',
            'status' => 'pending',
        ]);

        $this->patchJson("/api/v1/admin/reports/{$reportMkt->id}/resolve", [
            'status' => 'resolved',
            'target_action' => 'hide_content',
        ], $this->bearer($adminToken))->assertOk();
        $this->assertSame('hidden', $activeMkt->fresh()->status);

        $this->patchJson("/api/v1/admin/reports/{$reportEvt->id}/resolve", [
            'status' => 'resolved',
            'target_action' => 'hide_content',
        ], $this->bearer($adminToken))->assertOk();
        $this->assertSame('archived', $activeEvent->fresh()->status);

        // Soft-deleted target still loads inside admin reports listing
        $activeMkt->delete();
        $reportsIndex = $this->getJson('/api/v1/admin/reports', $this->bearer($adminToken))
            ->assertOk();
        $foundReport = collect($reportsIndex->json('data.data'))->firstWhere('id', $reportMkt->id);
        $this->assertNotNull($foundReport['reportable']);
        $this->assertSame($activeMkt->title, $foundReport['reportable']['title']);
    }

    public function test_favorites_eager_load_images_and_check_endpoint_works(): void
    {
        $student = User::factory()->create();
        $seller = User::factory()->create(['name' => 'Penjual Asli']);
        $token = $student->createToken('student_token')->plainTextToken;

        $category = Category::create([
            'name' => 'Buku Kuliah',
            'slug' => 'buku-kuliah-fav',
            'type' => 'marketplace',
            'is_active' => true,
        ]);

        $listing = MarketplaceListing::factory()->create([
            'user_id' => $seller->id,
            'category_id' => $category->id,
            'status' => 'active',
        ]);
        $listing->images()->create(['file_path' => 'marketplace/foto-asli.jpg', 'sort_order' => 0]);

        // Initially not favorited
        $this->getJson("/api/v1/favorites/check?type=marketplace&id={$listing->id}", $this->bearer($token))
            ->assertOk()
            ->assertJsonPath('favorited', false);

        // Toggle favorite on
        $this->postJson('/api/v1/favorites/toggle', [
            'favoritable_type' => 'marketplace',
            'favoritable_id' => $listing->id,
        ], $this->bearer($token))
            ->assertOk()
            ->assertJsonPath('favorited', true);

        // Check returns true
        $this->getJson("/api/v1/favorites/check?type=marketplace&id={$listing->id}", $this->bearer($token))
            ->assertOk()
            ->assertJsonPath('favorited', true);

        // Index returns eager-loaded images, category, and user
        $list = $this->getJson('/api/v1/favorites', $this->bearer($token))
            ->assertOk();
        $this->assertSame('marketplace/foto-asli.jpg', $list->json('data.0.item.images.0.file_path'));
        $this->assertSame('Buku Kuliah', $list->json('data.0.item.category.name'));
        $this->assertSame('Penjual Asli', $list->json('data.0.item.user.name'));
    }

    public function test_reviews_block_self_review_duplicate_review_and_invalid_types(): void
    {
        $owner = User::factory()->create();
        $buyer = User::factory()->create();
        $ownerToken = $owner->createToken('student_token')->plainTextToken;
        $buyerToken = $buyer->createToken('student_token')->plainTextToken;

        $listing = MarketplaceListing::factory()->create(['user_id' => $owner->id, 'status' => 'active']);
        $event = Event::factory()->create(['status' => 'published']);

        // Non-reviewable type (event) rejected with 422
        $this->postJson('/api/v1/reviews', [
            'reviewable_type' => 'event',
            'reviewable_id' => $event->id,
            'rating' => 5,
        ], $this->bearer($buyerToken))->assertStatus(422);

        // Owner self-review rejected with 422
        $this->postJson('/api/v1/reviews', [
            'reviewable_type' => 'marketplace',
            'reviewable_id' => $listing->id,
            'rating' => 5,
            'comment' => 'Review sendiri',
        ], $this->bearer($ownerToken))->assertStatus(422);

        // Buyer first review succeeds
        $this->postJson('/api/v1/reviews', [
            'reviewable_type' => 'marketplace',
            'reviewable_id' => $listing->id,
            'rating' => 5,
            'comment' => 'Barang bagus!',
        ], $this->bearer($buyerToken))->assertCreated();

        // Buyer duplicate review rejected with 422
        $this->postJson('/api/v1/reviews', [
            'reviewable_type' => 'marketplace',
            'reviewable_id' => $listing->id,
            'rating' => 4,
            'comment' => 'Spam kedua',
        ], $this->bearer($buyerToken))->assertStatus(422);
    }

    public function test_admin_event_poster_sync_and_category_lost_found_plus_delete_protection(): void
    {
        $adminToken = $this->createAdminToken();

        // Admin can create and list lost_found category
        $lfCat = $this->postJson('/api/v1/admin/categories', [
            'name' => 'Aksesoris Kampus',
            'type' => 'lost_found',
        ], $this->bearer($adminToken))
            ->assertCreated();
        $lfCatId = $lfCat->json('data.id');

        $this->getJson('/api/v1/admin/categories?type=lost_found', $this->bearer($adminToken))
            ->assertOk()
            ->assertJsonPath('data.data.0.id', $lfCatId);

        // Category in use cannot be deleted (422), preventing cascade delete of listings
        $mktCat = Category::create([
            'name' => 'Elektronik Terpakai',
            'slug' => 'elektronik-terpakai',
            'type' => 'marketplace',
            'is_active' => true,
        ]);
        $listing = MarketplaceListing::factory()->create(['category_id' => $mktCat->id]);

        $this->deleteJson("/api/v1/admin/categories/{$mktCat->id}", [], $this->bearer($adminToken))
            ->assertStatus(422);
        $this->assertNotNull(MarketplaceListing::find($listing->id));

        // Unused category can still be deleted cleanly
        $this->deleteJson("/api/v1/admin/categories/{$lfCatId}", [], $this->bearer($adminToken))
            ->assertOk();

        // Admin can attach & update poster image_paths on events
        $eventCat = Category::create([
            'name' => 'Kompetisi',
            'slug' => 'kompetisi-poster',
            'type' => 'event',
            'is_active' => true,
        ]);

        $createdEvent = $this->postJson('/api/v1/admin/events', [
            'title' => 'Lomba UI/UX UPN 2026',
            'category_id' => $eventCat->id,
            'organizer_name' => 'HIMATIFA',
            'event_date' => '2026-12-15',
            'location' => 'Gedung Fasilkom',
            'description' => 'Kompetisi desain antarmuka tingkat nasional.',
            'status' => 'published',
            'image_paths' => ['events/poster-1.png'],
        ], $this->bearer($adminToken))
            ->assertCreated();

        $eventId = $createdEvent->json('data.id');
        $this->assertSame('events/poster-1.png', $createdEvent->json('data.images.0.file_path'));

        $updatedEvent = $this->putJson("/api/v1/admin/events/{$eventId}", [
            'image_paths' => ['events/poster-2.png'],
        ], $this->bearer($adminToken))
            ->assertOk();

        $this->assertSame('events/poster-2.png', $updatedEvent->json('data.images.0.file_path'));
    }
}
