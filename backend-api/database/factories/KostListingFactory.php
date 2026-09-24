<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\KostListing;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\KostListing>
 */
class KostListingFactory extends Factory
{
    protected $model = KostListing::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $titles = [
            'Kost Griya UPN Putri',
            'Kost Exclusive Rungkut',
            'Kost Barokah Gunung Anyar',
            'Kost Griya Asri Rungkut Kidul',
            'Kost Pondok UPN Putra',
            'Kost Harmoni Medokan Ayu',
            'Kost Sejahtera Kedung Cowek',
            'Kost Exclusive Gunung Anyar Tambak',
            'Kost Pondok Rungkut Asri',
            'Kost Griya Tenggilis Putri',
            'Kost Amanah UPN Campur',
            'Kost Mawar Rungkut Putra',
        ];

        $streets = [
            'Jl. Raya Rungkut Madya',
            'Jl. Gunung Anyar Lor',
            'Jl. Medokan Ayu',
            'Jl. Rungkut Kidul',
            'Jl. Tenggilis Mejoyo',
            'Jl. Kedung Baruk',
            'Jl. Pandugo',
        ];

        $title = $this->faker->randomElement($titles);
        $genderType = $this->faker->randomElement(['putra', 'putri', 'campur']);

        $facilityPool = [
            'WiFi',
            'AC',
            'Kamar Mandi Dalam',
            'Kasur',
            'Lemari',
            'Meja Belajar',
            'Dapur Bersama',
            'Parkir Motor',
            'CCTV',
            'Air Panas',
        ];

        return [
            'user_id' => User::factory(),
            'title' => $title,
            'slug' => Str::slug($title).'-'.$this->faker->unique()->numberBetween(100, 999),
            'description' => $this->faker->paragraph(3),
            'address' => $this->faker->randomElement($streets).' No. '.$this->faker->numberBetween(1, 120).', Rungkut, Surabaya',
            'latitude' => number_format($this->faker->randomFloat(8, -7.345, -7.320), 8, '.', ''),
            'longitude' => number_format($this->faker->randomFloat(8, 112.775, 112.800), 8, '.', ''),
            'price' => $this->faker->numberBetween(10, 30) * 50000,
            'facilities' => $this->faker->randomElements($facilityPool, $this->faker->numberBetween(3, 6)),
            'gender_type' => $genderType,
            'status' => 'available',
        ];
    }
}
