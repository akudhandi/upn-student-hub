<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Announcement;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnnouncementTest extends TestCase
{
    use RefreshDatabase;

    public function test_students_can_read_latest_announcements(): void
    {
        $old = Announcement::create([
            'title' => 'Pengumuman Lama',
            'message' => 'Isi lama',
            'target_role' => 'all',
        ]);
        $old->created_at = '2026-01-05 10:00:00';
        $old->save();

        Announcement::create([
            'title' => 'Pengumuman Baru',
            'message' => 'Isi baru',
            'target_role' => 'student',
        ]);

        $response = $this->getJson('/api/v1/announcements');

        $response->assertOk();
        $data = $response->json('data');
        $this->assertCount(2, $data);
        $this->assertSame('Pengumuman Baru', $data[0]['title']);
        $this->assertArrayNotHasKey('admin_id', $data[0]);
    }

    public function test_announcements_limit_is_respected(): void
    {
        Announcement::factory()->count(5)->create(['target_role' => 'all']);

        $response = $this->getJson('/api/v1/announcements?limit=3');

        $response->assertOk();
        $this->assertCount(3, $response->json('data'));
    }
}
