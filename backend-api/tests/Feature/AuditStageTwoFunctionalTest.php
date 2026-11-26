<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\ChatParticipant;
use App\Models\ChatRoom;
use App\Models\Image;
use App\Models\LostFoundReport;
use App\Models\MarketplaceListing;
use App\Models\Report;
use App\Models\ServiceListing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuditStageTwoFunctionalTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, string>
     */
    private function bearer(string $token): array
    {
        $this->app['auth']->forgetGuards();

        return ['Authorization' => "Bearer {$token}"];
    }

    public function test_account_type_and_official_flag_are_serialized_across_catalogs_details_favorites_and_chat(): void
    {
        $official = User::factory()->create([
            'status' => 'active',
            'account_type' => 'hima',
            'name' => 'HIMA Informatika',
        ]);
        $student = User::factory()->create([
            'status' => 'active',
            'account_type' => 'student',
            'name' => 'Mahasiswa Pembeli',
        ]);

        $market = MarketplaceListing::factory()->create(['user_id' => $official->id, 'status' => 'active']);
        $service = ServiceListing::factory()->create(['user_id' => $official->id, 'status' => 'active']);
        $lostFound = LostFoundReport::factory()->create(['user_id' => $official->id, 'status' => 'open']);

        $studentToken = $student->createToken('student')->plainTextToken;

        $this->getJson('/api/v1/marketplace')
            ->assertOk()
            ->assertJsonPath('data.data.0.user.account_type', 'hima')
            ->assertJsonPath('data.data.0.user.is_official_account', true);

        $this->getJson("/api/v1/marketplace/{$market->id}")
            ->assertOk()
            ->assertJsonPath('data.user.account_type', 'hima')
            ->assertJsonPath('data.user.is_official_account', true);

        $this->getJson('/api/v1/services')
            ->assertOk()
            ->assertJsonPath('data.data.0.user.account_type', 'hima')
            ->assertJsonPath('data.data.0.user.is_official_account', true);

        $this->getJson("/api/v1/services/{$service->id}")
            ->assertOk()
            ->assertJsonPath('data.user.account_type', 'hima')
            ->assertJsonPath('data.user.is_official_account', true);

        $this->getJson('/api/v1/lost-found')
            ->assertOk()
            ->assertJsonPath('data.data.0.user.account_type', 'hima')
            ->assertJsonPath('data.data.0.user.is_official_account', true);

        $this->getJson("/api/v1/lost-found/{$lostFound->id}")
            ->assertOk()
            ->assertJsonPath('data.user.account_type', 'hima')
            ->assertJsonPath('data.user.is_official_account', true);

        $this->postJson('/api/v1/favorites/toggle', [
            'favoritable_type' => 'marketplace',
            'favoritable_id' => $market->id,
        ], $this->bearer($studentToken))->assertOk();

        $this->getJson('/api/v1/favorites', $this->bearer($studentToken))
            ->assertOk()
            ->assertJsonPath('data.0.item.user.account_type', 'hima')
            ->assertJsonPath('data.0.item.user.is_official_account', true);

        $convRes = $this->postJson('/api/v1/conversations', [
            'recipient_id' => $official->id,
            'listing_type' => 'marketplace',
            'listing_id' => $market->id,
        ], $this->bearer($studentToken))->assertCreated();

        $roomId = $convRes->json('data.id');

        $this->getJson('/api/v1/conversations', $this->bearer($studentToken))
            ->assertOk()
            ->assertJsonPath('data.0.recipient.account_type', 'hima')
            ->assertJsonPath('data.0.recipient.is_official_account', true);

        $this->getJson("/api/v1/conversations/{$roomId}", $this->bearer($studentToken))
            ->assertOk()
            ->assertJsonPath('data.recipient.account_type', 'hima')
            ->assertJsonPath('data.recipient.is_official_account', true);
    }

    public function test_chat_context_includes_first_image_and_survives_soft_delete(): void
    {
        $seller = User::factory()->create(['status' => 'active']);
        $buyer = User::factory()->create(['status' => 'active']);

        $listing = MarketplaceListing::factory()->create([
            'user_id' => $seller->id,
            'title' => 'Kalkulator Ilmiah Casio',
            'status' => 'active',
        ]);

        Image::create([
            'imageable_type' => MarketplaceListing::class,
            'imageable_id' => $listing->id,
            'file_path' => 'marketplace/calc-2.jpg',
            'sort_order' => 2,
        ]);
        $first = Image::create([
            'imageable_type' => MarketplaceListing::class,
            'imageable_id' => $listing->id,
            'file_path' => 'marketplace/calc-1.jpg',
            'sort_order' => 1,
        ]);

        $buyerToken = $buyer->createToken('buyer')->plainTextToken;

        $created = $this->postJson('/api/v1/conversations', [
            'recipient_id' => $seller->id,
            'listing_type' => 'marketplace',
            'listing_id' => $listing->id,
        ], $this->bearer($buyerToken))->assertCreated();

        $roomId = $created->json('data.id');

        // Soft-delete the contextable listing; conversation context and first image must still resolve
        $listing->delete();

        $this->getJson('/api/v1/conversations', $this->bearer($buyerToken))
            ->assertOk()
            ->assertJsonPath('data.0.context.title', 'Kalkulator Ilmiah Casio')
            ->assertJsonPath('data.0.context.images.0.id', $first->id)
            ->assertJsonPath('data.0.context.images.0.file_path', 'marketplace/calc-1.jpg');

        $this->getJson("/api/v1/conversations/{$roomId}", $this->bearer($buyerToken))
            ->assertOk()
            ->assertJsonPath('data.context.title', 'Kalkulator Ilmiah Casio')
            ->assertJsonPath('data.context.images.0.file_path', 'marketplace/calc-1.jpg');
    }

    public function test_user_and_chat_reports_are_supported_while_favorites_and_conversations_still_reject_them(): void
    {
        $reporter = User::factory()->create(['status' => 'active']);
        $targetUser = User::factory()->create(['status' => 'active']);
        $outsider = User::factory()->create(['status' => 'active']);

        $room = ChatRoom::create(['last_message_at' => now()]);
        ChatParticipant::create(['chat_room_id' => $room->id, 'user_id' => $reporter->id]);
        ChatParticipant::create(['chat_room_id' => $room->id, 'user_id' => $targetUser->id]);

        $reporterToken = $reporter->createToken('reporter')->plainTextToken;
        $outsiderToken = $outsider->createToken('outsider')->plainTextToken;

        // Self user report blocked with 422
        $this->postJson('/api/v1/reports', [
            'reportable_type' => 'user',
            'reportable_id' => $reporter->id,
            'reason' => 'spam',
        ], $this->bearer($reporterToken))->assertStatus(422);

        // Outsider chat report blocked with 403
        $this->postJson('/api/v1/reports', [
            'reportable_type' => 'chat',
            'reportable_id' => $room->id,
            'reason' => 'fraud',
        ], $this->bearer($outsiderToken))->assertStatus(403);

        // Valid user report -> 201
        $this->postJson('/api/v1/reports', [
            'reportable_type' => 'user',
            'reportable_id' => $targetUser->id,
            'reason' => 'inappropriate',
            'description' => 'Akun mengirim spam.',
        ], $this->bearer($reporterToken))->assertCreated();

        // Valid chat report -> 201
        $this->postJson('/api/v1/reports', [
            'reportable_type' => 'chat',
            'reportable_id' => $room->id,
            'reason' => 'fraud',
            'description' => 'Meminta transfer di luar kesepakatan.',
        ], $this->bearer($reporterToken))->assertCreated();

        // Favorites & Conversations must STILL reject 'user' and 'chat' with 422
        $this->postJson('/api/v1/favorites/toggle', [
            'favoritable_type' => 'user',
            'favoritable_id' => $targetUser->id,
        ], $this->bearer($reporterToken))->assertStatus(422);

        $this->postJson('/api/v1/favorites/toggle', [
            'favoritable_type' => 'chat',
            'favoritable_id' => $room->id,
        ], $this->bearer($reporterToken))->assertStatus(422);

        $this->postJson('/api/v1/conversations', [
            'recipient_id' => $targetUser->id,
            'listing_type' => 'user',
            'listing_id' => $targetUser->id,
        ], $this->bearer($reporterToken))->assertStatus(422);

        $this->postJson('/api/v1/conversations', [
            'recipient_id' => $targetUser->id,
            'listing_type' => 'chat',
            'listing_id' => $room->id,
        ], $this->bearer($reporterToken))->assertStatus(422);
    }

    public function test_admin_report_resolution_on_chat_rejects_content_actions_and_sanctions_counterpart_only(): void
    {
        $reporter = User::factory()->create(['status' => 'active']);
        $offender = User::factory()->create(['status' => 'active']);
        $offender->createToken('offender-device');

        $room = ChatRoom::create(['last_message_at' => now()]);
        ChatParticipant::create(['chat_room_id' => $room->id, 'user_id' => $reporter->id]);
        ChatParticipant::create(['chat_room_id' => $room->id, 'user_id' => $offender->id]);

        $report = Report::create([
            'reporter_id' => $reporter->id,
            'reportable_type' => ChatRoom::class,
            'reportable_id' => $room->id,
            'reason' => 'fraud',
            'description' => 'Indikasi penipuan di chat.',
            'status' => 'pending',
        ]);

        $admin = Admin::create([
            'email' => 'mod-stage2@upnjatim.ac.id',
            'password' => Hash::make('password123'),
            'role' => 'admin',
        ]);
        $adminToken = $admin->createToken('admin')->plainTextToken;

        $this->patchJson("/api/v1/admin/reports/{$report->id}/resolve", [
            'status' => 'resolved',
            'target_action' => 'hide_content',
        ], $this->bearer($adminToken))->assertStatus(422);

        $this->patchJson("/api/v1/admin/reports/{$report->id}/resolve", [
            'status' => 'resolved',
            'target_action' => 'delete_content',
        ], $this->bearer($adminToken))->assertStatus(422);

        $this->patchJson("/api/v1/admin/reports/{$report->id}/resolve", [
            'status' => 'resolved',
            'target_action' => 'suspend_user',
        ], $this->bearer($adminToken))->assertOk();

        $this->assertSame('active', $reporter->fresh()->status);
        $this->assertSame('suspended', $offender->fresh()->status);
        $this->assertSame(0, $offender->tokens()->count());
    }
}
