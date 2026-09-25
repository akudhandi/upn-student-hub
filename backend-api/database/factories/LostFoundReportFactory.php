<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Category;
use App\Models\LostFoundReport;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\LostFoundReport>
 */
class LostFoundReportFactory extends Factory
{
    protected $model = LostFoundReport::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $reports = [
            [
                'title' => 'Kunci Motor Honda Vario dengan Gantungan UPN',
                'description' => 'Kunci motor Honda Vario hilang beserta STNK dalam dompet hitam kecil dan gantungan kunci logo UPN. Terakhir dipakai saat parkir pagi hari. Bagi yang menemukan akan ada imbalan sepantasnya.',
                'location' => 'Parkiran FIK',
            ],
            [
                'title' => 'KTM / Kartu Mahasiswa An. Rizky (FIK)',
                'description' => 'Menemukan KTM atas nama Rizky jurusan Sistem Informasi FIK tergeletak di lantai koridor. Sudah diamankan, bisa diambil dengan menunjukkan KTP/KTM asli atau hubungi nomor di bawah.',
                'location' => 'Gedung Girilaya',
            ],
            [
                'title' => 'Tumbler Hydroflask Hitam Tertinggal di Perpustakaan',
                'description' => 'Tumbler Hydroflask hitam ukuran 750ml tertinggal di meja baca lantai 2 dekat jendela. Ada stiker nama dan lecet kecil di bagian bawah. Penting karena hadiah dari orang tua.',
                'location' => 'Perpustakaan Pusat UPN',
            ],
            [
                'title' => 'Jaket Himpunan Warna Merah Marun',
                'description' => 'Menemukan jaket himpunan warna merah marun ukuran L tertinggal di tribun GSG setelah acara seminar. Kondisi masih bagus, sudah dicuci. Silakan hubungi untuk verifikasi ciri tambahan.',
                'location' => 'GSG (Gedung Serba Guna)',
            ],
            [
                'title' => 'Muka Helm Cargloss Cokelat di Parkiran',
                'description' => 'Kaca/muka helm Cargloss warna cokelat lepas dan hilang di area parkiran. Mungkin terlepas saat helm digantung di spion. Kalau ada yang melihat mohon kabari.',
                'location' => 'Parkiran Fakultas Teknik',
            ],
        ];

        $report = $this->faker->randomElement($reports);

        return [
            'user_id' => User::factory(),
            'type' => $this->faker->randomElement(['lost', 'found']),
            'title' => $report['title'],
            'category_id' => Category::query()->where('type', 'lost_found')->inRandomOrder()->value('id')
                ?? Category::query()->firstOrCreate(
                    ['slug' => 'kehilangan'],
                    ['name' => 'Kehilangan', 'type' => 'lost_found']
                )->id,
            'description' => $report['description'],
            'location' => $report['location'],
            'date_event' => $this->faker->dateTimeBetween('-14 days', 'now')->format('Y-m-d H:i:s'),
            'contact_info' => '08'.$this->faker->numerify('##########'),
            'reward' => $this->faker->boolean(30) ? 'Rp '.$this->faker->randomElement(['25.000', '50.000', '100.000']) : null,
            'status' => 'active',
        ];
    }
}
