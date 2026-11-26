<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Mail\OtpCodeMail;
use App\Models\Admin;
use App\Models\Category;
use App\Models\MarketplaceListing;
use App\Models\Report;
use App\Models\ServiceListing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StageOneSecurityHardeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_csv_export_escapes_formula_injection_payloads(): void
    {
        Sanctum::actingAs(Admin::create([
            'email' => 'admin-csv@upnjatim.ac.id',
            'password' => Hash::make('password'),
            'role' => 'admin',
        ]));

        $cat = Category::create([
            'name' => '@SUM(1,1)',
            'slug' => 'sum-formula',
            'type' => 'marketplace',
            'is_active' => true,
        ]);

        MarketplaceListing::factory()->create([
            'category_id' => $cat->id,
            'title' => "=CMD|'/C calc'!A0",
            'status' => 'active',
        ]);
        MarketplaceListing::factory()->create([
            'category_id' => $cat->id,
            'title' => '+1+1',
            'status' => 'active',
        ]);
        MarketplaceListing::factory()->create([
            'category_id' => $cat->id,
            'title' => '-2+3',
            'status' => 'active',
        ]);
        MarketplaceListing::factory()->create([
            'category_id' => $cat->id,
            'title' => 'Kalkulator Ilmiah Normal',
            'status' => 'active',
        ]);

        $response = $this->get('/api/v1/admin/marketplace/export');
        $response->assertOk();

        $csv = ltrim($response->streamedContent(), "\xEF\xBB\xBF");

        $this->assertStringContainsString("\"'=CMD|'/C calc'!A0\"", $csv);
        $this->assertStringContainsString("'+1+1", $csv);
        $this->assertStringContainsString("'-2+3", $csv);
        $this->assertStringContainsString("'@SUM(1,1)", $csv);
        $this->assertStringContainsString('Kalkulator Ilmiah Normal', $csv);
    }

    public function test_event_registration_link_restricts_to_http_or_https(): void
    {
        $eventCat = Category::create([
            'name' => 'Seminar',
            'slug' => 'seminar-http',
            'type' => 'event',
            'is_active' => true,
        ]);

        $official = User::factory()->create([
            'account_type' => 'hima',
            'status' => 'active',
        ]);

        Sanctum::actingAs($official);

        $basePayload = [
            'title' => 'Tech Talk UPN',
            'category_id' => $eventCat->id,
            'organizer_name' => 'HIMATIFA',
            'event_date' => '2026-12-01',
            'location' => 'Auditorium',
            'description' => 'Acara tahunan',
        ];

        $this->postJson('/api/v1/events', [
            ...$basePayload,
            'registration_link' => 'javascript:alert(1)',
        ])->assertStatus(422)->assertJsonValidationErrors(['registration_link']);

        $this->postJson('/api/v1/events', [
            ...$basePayload,
            'registration_link' => 'https://upnjatim.ac.id/daftar',
        ])->assertStatus(201);

        Sanctum::actingAs(Admin::create([
            'email' => 'admin-ev@upnjatim.ac.id',
            'password' => Hash::make('password'),
            'role' => 'admin',
        ]));

        $this->postJson('/api/v1/admin/events', [
            ...$basePayload,
            'registration_link' => 'ftp://files.example.test/form',
        ])->assertStatus(422)->assertJsonValidationErrors(['registration_link']);

        $this->postJson('/api/v1/admin/events', [
            ...$basePayload,
            'registration_link' => 'https://upnjatim.ac.id/admin-daftar',
        ])->assertStatus(201);
    }

    public function test_category_type_and_is_active_are_enforced_across_endpoints(): void
    {
        $mktActive = Category::create(['name' => 'Buku', 'slug' => 'buku-mkt', 'type' => 'marketplace', 'is_active' => true]);
        $mktInactive = Category::create(['name' => 'Arsip', 'slug' => 'arsip-mkt', 'type' => 'marketplace', 'is_active' => false]);
        $eventCat = Category::create(['name' => 'Workshop', 'slug' => 'workshop-evt', 'type' => 'event', 'is_active' => true]);

        $student = User::factory()->create(['status' => 'active']);
        Sanctum::actingAs($student);

        $this->postJson('/api/v1/marketplace', [
            'title' => 'Kamera Kampus',
            'description' => 'Bekas mulus',
            'price' => 500000,
            'condition' => 'good',
            'category_id' => $eventCat->id,
        ])->assertStatus(422)->assertJsonValidationErrors(['category_id']);

        $this->postJson('/api/v1/marketplace', [
            'title' => 'Kamera Kampus',
            'description' => 'Bekas mulus',
            'price' => 500000,
            'condition' => 'good',
            'category_id' => $mktInactive->id,
        ])->assertStatus(422)->assertJsonValidationErrors(['category_id']);

        $created = $this->postJson('/api/v1/marketplace', [
            'title' => 'Kamera Kampus',
            'description' => 'Bekas mulus',
            'price' => 500000,
            'condition' => 'good',
            'category_id' => $mktActive->id,
        ])->assertStatus(201);

        $listingId = $created->json('data.id');

        // Deactivate category later: owner can still update the listing keeping unchanged category_id
        $mktActive->update(['is_active' => false]);

        $this->putJson("/api/v1/marketplace/{$listingId}", [
            'title' => 'Kamera Kampus Edited',
            'category_id' => $mktActive->id,
        ])->assertOk();

        // Admin cannot change category type while used by listing
        Sanctum::actingAs(Admin::create([
            'email' => 'admin-cat@upnjatim.ac.id',
            'password' => Hash::make('password'),
            'role' => 'admin',
        ]));

        $this->putJson("/api/v1/admin/categories/{$mktActive->id}", [
            'type' => 'service',
        ])->assertStatus(422);
    }

    public function test_admin_report_blocks_delete_action_on_user_target(): void
    {
        $admin = Admin::create([
            'email' => 'admin-rep@upnjatim.ac.id',
            'password' => Hash::make('password'),
            'role' => 'admin',
        ]);
        Sanctum::actingAs($admin);

        $reporter = User::factory()->create();
        $targetUser = User::factory()->create();

        $report = Report::create([
            'reporter_id' => $reporter->id,
            'reportable_type' => User::class,
            'reportable_id' => $targetUser->id,
            'reason' => 'spam',
            'status' => 'pending',
        ]);

        $this->patchJson("/api/v1/admin/reports/{$report->id}/resolve", [
            'status' => 'resolved',
            'target_action' => 'delete',
        ])->assertStatus(422);

        $this->postJson('/api/v1/admin/reports/bulk-resolve', [
            'ids' => [$report->id],
            'status' => 'resolved',
            'target_action' => 'delete_content',
        ])->assertStatus(422);

        $this->assertDatabaseHas('users', ['id' => $targetUser->id]);
    }

    public function test_profile_avatar_rejects_external_and_traversal_paths(): void
    {
        $student = User::factory()->create(['status' => 'active']);
        Sanctum::actingAs($student);

        foreach ([
            'https://evil.test/a.png',
            '../secret.jpg',
            'marketplace/img.jpg',
        ] as $invalidAvatar) {
            $this->putJson('/api/v1/users/profile', [
                'name' => 'Budi Santoso',
                'avatar' => $invalidAvatar,
            ])->assertStatus(422);
        }

        $this->putJson('/api/v1/users/profile', [
            'name' => 'Budi Santoso',
            'avatar' => '/storage/avatars/valid.jpg',
        ])->assertOk()->assertJsonPath('data.profile.avatar', 'avatars/valid.jpg');

        $this->putJson('/api/v1/users/profile', [
            'name' => 'Budi Santoso',
            'avatar' => null,
        ])->assertOk()->assertJsonPath('data.profile.avatar', null);
    }

    public function test_service_update_rejects_price_min_above_existing_price_max(): void
    {
        $serviceCat = Category::create(['name' => 'Desain', 'slug' => 'desain-svc', 'type' => 'service', 'is_active' => true]);
        $student = User::factory()->create(['status' => 'active']);
        $service = ServiceListing::factory()->create([
            'user_id' => $student->id,
            'category_id' => $serviceCat->id,
            'price_min' => 50000,
            'price_max' => 100000,
        ]);

        Sanctum::actingAs($student);

        $this->putJson("/api/v1/services/{$service->id}", [
            'price_min' => 150000,
        ])->assertStatus(422)->assertJsonValidationErrors(['price_max']);
    }

    public function test_admin_password_change_revokes_other_tokens_only(): void
    {
        $admin = Admin::create([
            'email' => 'admin-pass@upnjatim.ac.id',
            'password' => Hash::make('oldpassword'),
            'role' => 'admin',
        ]);

        $currentToken = $admin->createToken('session-current')->plainTextToken;
        $otherToken = $admin->createToken('session-other')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$currentToken)
            ->patchJson('/api/v1/admin/profile/password', [
                'current_password' => 'oldpassword',
                'password' => 'newpassword123',
                'password_confirmation' => 'newpassword123',
            ])->assertOk();

        $this->assertNotNull(PersonalAccessToken::findToken($currentToken));
        $this->assertNull(PersonalAccessToken::findToken($otherToken));

        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', 'Bearer '.$otherToken)
            ->getJson('/api/v1/admin/profile')
            ->assertStatus(401);
    }

    public function test_auth_register_and_login_normalize_email(): void
    {
        Mail::fake();

        $register = $this->postJson('/api/v1/auth/register', [
            'name' => 'Mahasiswa UPN',
            'email' => '  Mahasiswa.Test@Student.UpnJatim.ac.id  ',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $register->assertStatus(201);
        $this->assertDatabaseHas('users', [
            'email' => 'mahasiswa.test@student.upnjatim.ac.id',
        ]);

        $sentMail = null;
        Mail::assertSent(OtpCodeMail::class, function (OtpCodeMail $mail) use (&$sentMail): bool {
            $sentMail = $mail;

            return $mail->hasTo('mahasiswa.test@student.upnjatim.ac.id');
        });

        $this->assertNotNull($sentMail);

        $this->postJson('/api/v1/auth/verify-otp', [
            'email' => '  MAHASISWA.TEST@STUDENT.UPNJATIM.AC.ID ',
            'code' => $sentMail->code,
        ])->assertOk()->assertJsonStructure(['token', 'user']);

        $this->postJson('/api/v1/auth/login', [
            'email' => '  MAHASISWA.TEST@STUDENT.UPNJATIM.AC.ID ',
            'password' => 'password123',
        ])->assertOk();
    }

    public function test_chat_rejects_suspended_recipient(): void
    {
        $sender = User::factory()->create(['status' => 'active']);
        $suspended = User::factory()->create(['status' => 'suspended']);

        Sanctum::actingAs($sender);

        $this->postJson('/api/v1/conversations', [
            'recipient_id' => $suspended->id,
            'message' => 'Halo',
        ])->assertStatus(422)->assertJsonValidationErrors(['recipient_id']);
    }

    public function test_report_blocks_self_report_and_duplicate_pending_report(): void
    {
        $owner = User::factory()->create(['status' => 'active']);
        $other = User::factory()->create(['status' => 'active']);
        $listing = MarketplaceListing::factory()->create(['user_id' => $owner->id]);

        Sanctum::actingAs($owner);
        $this->postJson('/api/v1/reports', [
            'reportable_type' => 'marketplace',
            'reportable_id' => $listing->id,
            'reason' => 'spam',
        ])->assertStatus(422);

        Sanctum::actingAs($other);
        $this->postJson('/api/v1/reports', [
            'reportable_type' => 'marketplace',
            'reportable_id' => $listing->id,
            'reason' => 'spam',
        ])->assertStatus(201);

        $this->postJson('/api/v1/reports', [
            'reportable_type' => 'marketplace',
            'reportable_id' => $listing->id,
            'reason' => 'fraud',
        ])->assertStatus(422);
    }

    public function test_admin_event_store_reuses_existing_kemahasiswaan_email_without_collision(): void
    {
        User::factory()->create([
            'email' => 'kemahasiswaan@upnjatim.ac.id',
            'account_type' => 'student',
            'status' => 'active',
        ]);

        Sanctum::actingAs(Admin::create([
            'email' => 'admin-col@upnjatim.ac.id',
            'password' => Hash::make('password'),
            'role' => 'admin',
        ]));

        $this->postJson('/api/v1/admin/events', [
            'title' => 'Orientasi Kampus',
            'organizer_name' => 'Kemahasiswaan',
            'event_date' => '2026-12-05',
            'location' => 'GSG',
            'description' => 'Acara resmi kampus',
        ])->assertStatus(201);
    }
}
