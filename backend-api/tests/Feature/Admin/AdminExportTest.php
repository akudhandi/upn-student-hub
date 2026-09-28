<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\KostListing;
use App\Models\MarketplaceListing;
use App\Models\Report;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminExportTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return list<string>
     */
    private function csvLines(string $content): array
    {
        $content = ltrim($content, "\xEF\xBB\xBF");

        return array_values(array_filter(
            array_map('trim', explode("\n", trim($content))),
            fn (string $line) => $line !== ''
        ));
    }

    public function test_marketplace_export_returns_csv_respecting_filters(): void
    {
        MarketplaceListing::factory()->create(['status' => 'active', 'title' => 'Kalkulator Ekspor']);
        MarketplaceListing::factory()->create(['status' => 'hidden']);

        $response = $this->get('/api/v1/admin/marketplace/export?status=active');

        $response->assertOk();
        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        $this->assertStringStartsWith(
            'attachment; filename=marketplace-',
            $response->headers->get('Content-Disposition')
        );

        $lines = $this->csvLines($response->streamedContent());
        $this->assertCount(2, $lines);
        $this->assertStringContainsString('Judul', $lines[0]);
        $this->assertStringContainsString('Kalkulator Ekspor', $lines[1]);
    }

    public function test_kost_export_respects_gender_filter(): void
    {
        KostListing::factory()->create(['gender_type' => 'putra', 'title' => 'Kost Putra Ekspor']);
        KostListing::factory()->create(['gender_type' => 'putri']);

        $response = $this->get('/api/v1/admin/kost/export?gender_type=putra');

        $response->assertOk();
        $lines = $this->csvLines($response->streamedContent());
        $this->assertCount(2, $lines);
        $this->assertStringContainsString('Kost Putra Ekspor', $lines[1]);
    }

    public function test_users_export_includes_profile_columns(): void
    {
        User::factory()->create(['name' => 'Mahasiswa Ekspor', 'email' => 'ekspor@upnyk.ac.id']);
        User::factory()->create();

        $response = $this->get('/api/v1/admin/users/export');

        $response->assertOk();
        $lines = $this->csvLines($response->streamedContent());
        $this->assertCount(3, $lines);
        $this->assertStringContainsString('NIM', $lines[0]);
        $this->assertStringContainsString('ekspor@upnyk.ac.id', $lines[1].$lines[2]);
    }

    public function test_reports_export_respects_status_filter(): void
    {
        $reporter = User::factory()->create();
        $target = User::factory()->create();
        Report::create([
            'reporter_id' => $reporter->id,
            'reportable_type' => User::class,
            'reportable_id' => $target->id,
            'reason' => 'Laporan pending ekspor',
            'status' => 'pending',
        ]);
        Report::create([
            'reporter_id' => $reporter->id,
            'reportable_type' => User::class,
            'reportable_id' => $target->id,
            'reason' => 'Laporan resolved ekspor',
            'status' => 'resolved',
        ]);

        $response = $this->get('/api/v1/admin/reports/export?status=pending');

        $response->assertOk();
        $lines = $this->csvLines($response->streamedContent());
        $this->assertCount(2, $lines);
        $this->assertStringContainsString('Laporan pending ekspor', $lines[1]);
    }
}
