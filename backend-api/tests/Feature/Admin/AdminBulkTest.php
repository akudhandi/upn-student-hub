<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\KostListing;
use App\Models\LostFoundReport;
use App\Models\MarketplaceListing;
use App\Models\Report;
use App\Models\ServiceListing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminBulkTest extends TestCase
{
    use RefreshDatabase;

    public function test_marketplace_bulk_hide(): void
    {
        $a = MarketplaceListing::factory()->create(['status' => 'active']);
        $b = MarketplaceListing::factory()->create(['status' => 'active']);

        $response = $this->postJson('/api/v1/admin/marketplace/bulk-status', [
            'ids' => [$a->id, $b->id],
            'action' => 'hide',
        ]);

        $response->assertOk();
        $this->assertSame(2, $response->json('data.updated'));
        $this->assertSame('hidden', $a->fresh()->status);
        $this->assertSame('hidden', $b->fresh()->status);
    }

    public function test_marketplace_bulk_rejects_unknown_ids_without_changing_anything(): void
    {
        $listing = MarketplaceListing::factory()->create(['status' => 'active']);

        $response = $this->postJson('/api/v1/admin/marketplace/bulk-status', [
            'ids' => [$listing->id, 999999],
            'action' => 'hide',
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('data.missing_ids', [999999]);
        $this->assertSame('active', $listing->fresh()->status);
    }

    public function test_marketplace_bulk_restore_brings_back_deleted(): void
    {
        $listing = MarketplaceListing::factory()->create(['status' => 'active']);
        $listing->delete();

        $response = $this->postJson('/api/v1/admin/marketplace/bulk-status', [
            'ids' => [$listing->id],
            'action' => 'restore',
        ]);

        $response->assertOk();
        $this->assertFalse($listing->fresh()->trashed());
        $this->assertSame('active', $listing->fresh()->status);
    }

    public function test_services_bulk_hide(): void
    {
        $a = ServiceListing::factory()->create(['status' => 'active']);
        $b = ServiceListing::factory()->create(['status' => 'active']);

        $response = $this->postJson('/api/v1/admin/services/bulk-status', [
            'ids' => [$a->id, $b->id],
            'action' => 'hide',
        ]);

        $response->assertOk();
        $this->assertSame(2, $response->json('data.updated'));
        $this->assertSame('hidden', $a->fresh()->status);
        $this->assertSame('hidden', $b->fresh()->status);
    }

    public function test_kost_bulk_delete_soft_deletes(): void
    {
        $listing = KostListing::factory()->create(['status' => 'available']);

        $response = $this->postJson('/api/v1/admin/kost/bulk-status', [
            'ids' => [$listing->id],
            'action' => 'delete',
        ]);

        $response->assertOk();
        $this->assertTrue($listing->fresh()->trashed());
    }

    public function test_lost_found_bulk_mark_resolved(): void
    {
        $a = LostFoundReport::factory()->create(['status' => 'open']);
        $b = LostFoundReport::factory()->create(['status' => 'open']);

        $response = $this->postJson('/api/v1/admin/lost-found/bulk-status', [
            'ids' => [$a->id, $b->id],
            'action' => 'mark_resolved',
        ]);

        $response->assertOk();
        $this->assertSame(2, $response->json('data.updated'));
        $this->assertSame('resolved', $a->fresh()->status);
        $this->assertSame('resolved', $b->fresh()->status);
    }

    public function test_reports_bulk_resolve(): void
    {
        $reporter = User::factory()->create();
        $target = User::factory()->create();
        $a = Report::create([
            'reporter_id' => $reporter->id,
            'reportable_type' => User::class,
            'reportable_id' => $target->id,
            'reason' => 'Spam massal A',
            'status' => 'pending',
        ]);
        $b = Report::create([
            'reporter_id' => $reporter->id,
            'reportable_type' => User::class,
            'reportable_id' => $target->id,
            'reason' => 'Spam massal B',
            'status' => 'pending',
        ]);

        $response = $this->postJson('/api/v1/admin/reports/bulk-resolve', [
            'ids' => [$a->id, $b->id],
            'status' => 'resolved',
        ]);

        $response->assertOk();
        $this->assertSame(2, $response->json('data.updated'));
        $this->assertSame('resolved', $a->fresh()->status);
        $this->assertSame('resolved', $b->fresh()->status);
    }

    public function test_users_bulk_suspend_and_reject_unknown_ids(): void
    {
        $a = User::factory()->create(['status' => 'active']);
        $b = User::factory()->create(['status' => 'active']);

        $response = $this->postJson('/api/v1/admin/users/bulk-status', [
            'ids' => [$a->id, $b->id],
            'status' => 'suspended',
        ]);

        $response->assertOk();
        $this->assertSame(2, $response->json('data.updated'));
        $this->assertSame('suspended', $a->fresh()->status);
        $this->assertSame('suspended', $b->fresh()->status);

        $invalid = $this->postJson('/api/v1/admin/users/bulk-status', [
            'ids' => [$a->id, 999999],
            'status' => 'banned',
        ]);

        $invalid->assertStatus(422);
        $this->assertSame('suspended', $a->fresh()->status);
    }
}
