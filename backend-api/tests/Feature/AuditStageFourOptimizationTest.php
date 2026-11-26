<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Category;
use App\Models\ChatMessage;
use App\Models\ChatParticipant;
use App\Models\ChatRoom;
use App\Models\Favorite;
use App\Models\MarketplaceListing;
use App\Models\Rating;
use App\Models\ServiceListing;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class AuditStageFourOptimizationTest extends TestCase
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

    public function test_deleting_category_nullifies_listing_category_id_instead_of_cascading_delete(): void
    {
        $seller = User::factory()->create(['status' => 'active']);
        $mktCat = Category::create([
            'name' => 'Elektronik Uji',
            'slug' => 'elektronik-uji',
            'type' => 'marketplace',
            'is_active' => true,
        ]);
        $svcCat = Category::create([
            'name' => 'Desain Uji',
            'slug' => 'desain-uji',
            'type' => 'service',
            'is_active' => true,
        ]);

        $market = MarketplaceListing::factory()->create([
            'user_id' => $seller->id,
            'category_id' => $mktCat->id,
            'status' => 'active',
        ]);
        $service = ServiceListing::factory()->create([
            'user_id' => $seller->id,
            'category_id' => $svcCat->id,
            'status' => 'active',
        ]);

        $mktCat->delete();
        $svcCat->delete();

        $this->assertDatabaseHas('marketplace_listings', [
            'id' => $market->id,
            'category_id' => null,
            'deleted_at' => null,
        ]);
        $this->assertDatabaseHas('service_listings', [
            'id' => $service->id,
            'category_id' => null,
            'deleted_at' => null,
        ]);
    }

    public function test_nim_uniqueness_is_enforced_while_blank_or_same_user_nim_is_allowed(): void
    {
        Mail::fake();

        $this->postJson('/api/v1/auth/register', [
            'name' => 'Mahasiswa Pertama',
            'email' => 'nim1@student.upnjatim.ac.id',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'nim' => '22081010555',
            'faculty' => 'Fakultas Ilmu Komputer',
        ])->assertCreated();

        // Duplicate NIM rejected on register (422)
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Mahasiswa Duplikat',
            'email' => 'nim2@student.upnjatim.ac.id',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'nim' => '22081010555',
            'faculty' => 'Fakultas Ilmu Komputer',
        ])->assertStatus(422)->assertJsonValidationErrors(['nim']);

        // Multiple accounts with empty/null NIM are allowed without colliding on unique index
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Tanpa NIM Satu',
            'email' => 'nonim1@student.upnjatim.ac.id',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'nim' => '',
        ])->assertCreated();

        $this->postJson('/api/v1/auth/register', [
            'name' => 'Tanpa NIM Dua',
            'email' => 'nonim2@student.upnjatim.ac.id',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'nim' => '',
        ])->assertCreated();

        $existingUser = User::where('email', 'nim1@student.upnjatim.ac.id')->firstOrFail();
        $otherUser = User::where('email', 'nonim1@student.upnjatim.ac.id')->firstOrFail();

        $existingToken = $existingUser->createToken('existing')->plainTextToken;
        $otherToken = $otherUser->createToken('other')->plainTextToken;

        // Updating another user to claim an already-registered NIM fails 422
        $this->putJson('/api/v1/users/profile', [
            'name' => 'Tanpa NIM Satu',
            'nim' => '22081010555',
        ], $this->bearer($otherToken))->assertStatus(422)->assertJsonValidationErrors(['nim']);

        // Existing owner keeping their own NIM on profile update succeeds
        $this->putJson('/api/v1/users/profile', [
            'name' => 'Mahasiswa Pertama Update',
            'nim' => '22081010555',
        ], $this->bearer($existingToken))->assertOk();
    }

    public function test_ratings_table_enforces_composite_unique_constraint_at_db_level(): void
    {
        $seller = User::factory()->create(['status' => 'active']);
        $reviewer = User::factory()->create(['status' => 'active']);
        $listing = MarketplaceListing::factory()->create(['user_id' => $seller->id, 'status' => 'active']);

        Rating::create([
            'user_id' => $reviewer->id,
            'rateable_type' => MarketplaceListing::class,
            'rateable_id' => $listing->id,
            'rating' => 5,
            'review' => 'Pertama',
        ]);

        $this->expectException(QueryException::class);

        Rating::create([
            'user_id' => $reviewer->id,
            'rateable_type' => MarketplaceListing::class,
            'rateable_id' => $listing->id,
            'rating' => 4,
            'review' => 'Duplikat',
        ]);
    }

    public function test_reviews_index_computes_sql_summary_across_all_rows_while_paginating_results(): void
    {
        $seller = User::factory()->create(['status' => 'active']);
        $listing = MarketplaceListing::factory()->create(['user_id' => $seller->id, 'status' => 'active']);

        foreach ([5, 5, 4, 2] as $score) {
            $reviewer = User::factory()->create(['status' => 'active']);
            Rating::create([
                'user_id' => $reviewer->id,
                'rateable_type' => MarketplaceListing::class,
                'rateable_id' => $listing->id,
                'rating' => $score,
                'review' => "Ulasan bintang {$score}",
            ]);
        }

        $page1 = $this->getJson("/api/v1/reviews?type=marketplace&id={$listing->id}&limit=2&page=1")
            ->assertOk();

        $page1
            ->assertJsonPath('data.summary.count', 4)
            ->assertJsonPath('data.summary.average', 4)
            ->assertJsonPath('data.summary.distribution.5', 2)
            ->assertJsonPath('data.summary.distribution.4', 1)
            ->assertJsonPath('data.summary.distribution.2', 1)
            ->assertJsonCount(2, 'data.reviews')
            ->assertJsonPath('data.meta.total', 4)
            ->assertJsonPath('data.meta.limit', 2)
            ->assertJsonPath('data.meta.page', 1)
            ->assertJsonPath('data.meta.has_more', true);

        $page2 = $this->getJson("/api/v1/reviews?type=marketplace&id={$listing->id}&limit=2&page=2")
            ->assertOk();

        $page2
            ->assertJsonCount(2, 'data.reviews')
            ->assertJsonPath('data.meta.has_more', false);
    }

    public function test_chat_index_show_and_favorites_respect_limits_and_cursor_pagination(): void
    {
        $me = User::factory()->create(['status' => 'active']);
        $meToken = $me->createToken('me')->plainTextToken;

        $rooms = [];
        for ($i = 1; $i <= 3; $i++) {
            $peer = User::factory()->create(['status' => 'active']);
            $room = ChatRoom::create(['last_message_at' => now()]);
            ChatParticipant::create(['chat_room_id' => $room->id, 'user_id' => $me->id]);
            ChatParticipant::create(['chat_room_id' => $room->id, 'user_id' => $peer->id]);
            $rooms[] = $room;

            $listing = MarketplaceListing::factory()->create(['user_id' => $peer->id, 'status' => 'active']);
            Favorite::create([
                'user_id' => $me->id,
                'favoritable_type' => MarketplaceListing::class,
                'favoritable_id' => $listing->id,
            ]);
        }

        // Chat index capped by ?limit=2
        $convList = $this->getJson('/api/v1/conversations?limit=2', $this->bearer($meToken))
            ->assertOk();
        $convList
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.limit', 2)
            ->assertJsonPath('meta.has_more', true);

        // Favorites index capped by ?limit=2
        $favList = $this->getJson('/api/v1/favorites?limit=2', $this->bearer($meToken))
            ->assertOk();
        $favList
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.limit', 2)
            ->assertJsonPath('meta.has_more', true);

        // Chat show returns latest 3 messages chronologically + cursor before_id for older ones
        $targetRoom = $rooms[0];
        $createdMessages = [];
        for ($m = 1; $m <= 5; $m++) {
            $createdMessages[] = ChatMessage::create([
                'chat_room_id' => $targetRoom->id,
                'user_id' => $me->id,
                'message' => "Pesan {$m}",
            ]);
        }

        $latestRes = $this->getJson("/api/v1/conversations/{$targetRoom->id}?limit=3", $this->bearer($meToken))
            ->assertOk();

        $latestRes
            ->assertJsonCount(3, 'data.messages')
            ->assertJsonPath('data.messages.0.body', 'Pesan 3')
            ->assertJsonPath('data.messages.1.body', 'Pesan 4')
            ->assertJsonPath('data.messages.2.body', 'Pesan 5')
            ->assertJsonPath('data.messages_meta.limit', 3)
            ->assertJsonPath('data.messages_meta.has_more', true);

        $oldestReturnedId = $latestRes->json('data.messages.0.id');

        $olderRes = $this->getJson(
            "/api/v1/conversations/{$targetRoom->id}?limit=3&before_id={$oldestReturnedId}",
            $this->bearer($meToken)
        )->assertOk();

        $olderRes
            ->assertJsonCount(2, 'data.messages')
            ->assertJsonPath('data.messages.0.body', 'Pesan 1')
            ->assertJsonPath('data.messages.1.body', 'Pesan 2')
            ->assertJsonPath('data.messages_meta.has_more', false);
    }
}
