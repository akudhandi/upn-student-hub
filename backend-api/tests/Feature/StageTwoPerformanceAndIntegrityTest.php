<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\ChatMessage;
use App\Models\ChatParticipant;
use App\Models\ChatRoom;
use App\Models\Event;
use App\Models\LostFoundReport;
use App\Models\MarketplaceListing;
use App\Models\Rating;
use App\Models\Report;
use App\Models\ServiceListing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StageTwoPerformanceAndIntegrityTest extends TestCase
{
    use RefreshDatabase;

    public function test_chat_index_avoids_n_plus_one_and_computes_accurate_unread_counts(): void
    {
        $me = User::factory()->create(['status' => 'active']);

        for ($i = 1; $i <= 5; $i++) {
            $peer = User::factory()->create(['status' => 'active', 'name' => "Peer {$i}"]);
            $room = ChatRoom::create(['last_message_at' => now()]);

            ChatParticipant::create([
                'chat_room_id' => $room->id,
                'user_id' => $me->id,
                'last_read_at' => $i === 1 ? now()->subMinutes(5) : null,
            ]);
            ChatParticipant::create([
                'chat_room_id' => $room->id,
                'user_id' => $peer->id,
                'last_read_at' => null,
            ]);

            if ($i === 1) {
                $oldMsg = ChatMessage::create([
                    'chat_room_id' => $room->id,
                    'user_id' => $peer->id,
                    'message' => 'Old read message',
                ]);
                ChatMessage::where('id', $oldMsg->id)->update(['created_at' => now()->subMinutes(10)]);
            }

            ChatMessage::create([
                'chat_room_id' => $room->id,
                'user_id' => $peer->id,
                'message' => "Latest from peer {$i}",
            ]);
        }

        Sanctum::actingAs($me);

        DB::enableQueryLog();
        DB::flushQueryLog();

        $response = $this->getJson('/api/v1/conversations');
        $queries = DB::getQueryLog();
        DB::disableQueryLog();

        $response->assertOk();
        $data = $response->json('data');
        $this->assertCount(5, $data);

        // O(1) eager-loaded queries (rooms + participants + users + latestMessage) instead of 3N + 2 = 17 queries
        $this->assertLessThanOrEqual(6, count($queries));

        foreach ($data as $conversation) {
            $this->assertSame(1, $conversation['unread_count']);
            $this->assertNotNull($conversation['last_message']);
        }
    }

    public function test_chat_update_and_destroy_message_preserve_sender_name(): void
    {
        $sender = User::factory()->create(['name' => 'Rina Pengirim', 'status' => 'active']);
        $peer = User::factory()->create(['status' => 'active']);

        $room = ChatRoom::create();
        ChatParticipant::create(['chat_room_id' => $room->id, 'user_id' => $sender->id]);
        ChatParticipant::create(['chat_room_id' => $room->id, 'user_id' => $peer->id]);

        $msg = ChatMessage::create([
            'chat_room_id' => $room->id,
            'user_id' => $sender->id,
            'message' => 'Pesan awal',
        ]);

        Sanctum::actingAs($sender);

        $updated = $this->putJson("/api/v1/conversations/{$room->id}/messages/{$msg->id}", [
            'body' => 'Pesan diedit',
        ]);
        $updated->assertOk()
            ->assertJsonPath('data.body', 'Pesan diedit')
            ->assertJsonPath('data.is_edited', true)
            ->assertJsonPath('data.sender_name', 'Rina Pengirim');

        $deleted = $this->deleteJson("/api/v1/conversations/{$room->id}/messages/{$msg->id}");
        $deleted->assertOk()
            ->assertJsonPath('data.is_deleted', true)
            ->assertJsonPath('data.sender_name', 'Rina Pengirim');
    }

    public function test_admin_csv_export_does_not_eager_load_images(): void
    {
        Sanctum::actingAs(Admin::create([
            'email' => 'admin-perf@upnjatim.ac.id',
            'password' => Hash::make('password'),
            'role' => 'admin',
        ]));

        MarketplaceListing::factory()->count(3)->create(['status' => 'active']);

        DB::enableQueryLog();
        DB::flushQueryLog();

        $response = $this->get('/api/v1/admin/marketplace/export');
        $response->assertOk();
        $content = $response->streamedContent();

        $queries = DB::getQueryLog();
        DB::disableQueryLog();

        $this->assertNotEmpty($content);
        foreach ($queries as $q) {
            $this->assertStringNotContainsString('from "images"', strtolower($q['query']));
            $this->assertStringNotContainsString('from `images`', strtolower($q['query']));
        }
    }

    public function test_admin_dashboard_stats_returns_consolidated_counts(): void
    {
        Sanctum::actingAs(Admin::create([
            'email' => 'admin-stats@upnjatim.ac.id',
            'password' => Hash::make('password'),
            'role' => 'admin',
        ]));

        $reporter = User::factory()->create();
        $targetUser = User::factory()->create();
        $activeMkt = MarketplaceListing::factory()->create(['status' => 'active']);
        MarketplaceListing::factory()->create(['status' => 'sold']);
        ServiceListing::factory()->create(['status' => 'active']);
        LostFoundReport::factory()->create(['status' => 'open']);
        Event::factory()->create(['status' => 'pending']);

        Report::create([
            'reporter_id' => $reporter->id,
            'reportable_type' => MarketplaceListing::class,
            'reportable_id' => $activeMkt->id,
            'reason' => 'spam',
            'status' => 'pending',
        ]);
        Report::create([
            'reporter_id' => $reporter->id,
            'reportable_type' => User::class,
            'reportable_id' => $targetUser->id,
            'reason' => 'fraud',
            'status' => 'pending',
        ]);

        $res = $this->getJson('/api/v1/admin/stats');
        $res->assertOk()
            ->assertJsonPath('data.counts.marketplace', 2)
            ->assertJsonPath('data.counts.services', 1)
            ->assertJsonPath('data.counts.lost_found', 1)
            ->assertJsonPath('data.counts.events', 1)
            ->assertJsonPath('data.active_listings', 3)
            ->assertJsonPath('data.needs_attention.pending_reports', 2)
            ->assertJsonPath('data.needs_attention.reported_listings', 1)
            ->assertJsonPath('data.needs_attention.reported_users', 1)
            ->assertJsonPath('data.needs_attention.pending_events', 1);
    }

    public function test_user_profile_me_skips_rating_queries_when_no_listings_and_aggregates_when_present(): void
    {
        $emptyUser = User::factory()->create(['status' => 'active']);
        Sanctum::actingAs($emptyUser);

        DB::enableQueryLog();
        DB::flushQueryLog();

        $resEmpty = $this->getJson('/api/v1/users/me');
        $emptyQueries = DB::getQueryLog();
        DB::disableQueryLog();

        $resEmpty->assertOk()
            ->assertJsonPath('data.stats.rating_count', 0)
            ->assertJsonPath('data.stats.rating_average', 0);

        foreach ($emptyQueries as $q) {
            $this->assertStringNotContainsString('ratings', strtolower($q['query']));
        }

        $seller = User::factory()->create(['status' => 'active']);
        $reviewer = User::factory()->create(['status' => 'active']);
        $listing = MarketplaceListing::factory()->create(['user_id' => $seller->id, 'status' => 'active']);

        Rating::create([
            'user_id' => $reviewer->id,
            'rateable_type' => MarketplaceListing::class,
            'rateable_id' => $listing->id,
            'rating' => 5,
            'review' => 'Mantap',
        ]);

        Sanctum::actingAs($seller);
        $resSeller = $this->getJson('/api/v1/users/me');
        $resSeller->assertOk()
            ->assertJsonPath('data.stats.rating_count', 1)
            ->assertJsonPath('data.stats.rating_average', 5);
    }
}
