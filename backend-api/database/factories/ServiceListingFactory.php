<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Category;
use App\Models\ServiceListing;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ServiceListing>
 */
class ServiceListingFactory extends Factory
{
    protected $model = ServiceListing::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $services = [
            'Jasa Format & Turnitin Skripsi UPN' => 'Bantu rapikan format skripsi sesuai panduan UPN (margin, daftar isi otomatis, sitasi Mendeley) plus cek Turnitin dan parafrase sampai lolos batas maksimal kampus. Revisi gratis 2x.',
            'Desain Poster & Feeds IG Event' => 'Terima jasa desain poster, banner, dan feeds Instagram untuk event UKM/hima. Revisi sampai ACC, file master + PNG HD. Pengerjaan 1-3 hari tergantung antrean.',
            'Les Privat Matdas & Coding' => 'Les privat Matematika Dasar, Fisika Dasar, dan pemrograman (Python/Java/C++) untuk mahasiswa TPB. Pertemuan 90 menit, bisa online atau offline sekitar Rungkut. Materi + latihan soal disediakan.',
            'Service Laptop & Install OS Rungkut' => 'Service laptop lemot, install ulang Windows/Linux, upgrade SSD/RAM, dan recovery data. Area Rungkut–Gunung Anyar bisa antar-jemput kos. Garansi servis 7 hari.',
            'Jasa Print & Jilid Antar Kampus' => 'Terima print tugas/makalah hitam-putih dan warna, jilid lakban/ring, dan cetak stiker. Bisa diantar ke area kampus UPN di hari yang sama untuk order sebelum jam 3 sore.',
        ];

        $title = $this->faker->randomElement(array_keys($services));
        $priceMin = $this->faker->randomElement([15000, 25000, 35000, 50000, 75000, 100000, 150000, 200000, 300000]);
        $priceMax = $this->faker->boolean(40)
            ? $priceMin + $this->faker->randomElement([25000, 50000, 100000, 150000])
            : null;

        return [
            'user_id' => User::factory(),
            'category_id' => Category::query()->where('type', 'service')->inRandomOrder()->value('id')
                ?? Category::query()->firstOrCreate(
                    ['slug' => 'jasa-lainnya'],
                    ['name' => 'Jasa Lainnya', 'type' => 'service']
                )->id,
            'title' => $title,
            'description' => $services[$title],
            'price_min' => $priceMin,
            'price_max' => $priceMax,
            'status' => 'active',
        ];
    }
}
