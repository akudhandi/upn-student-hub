<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Category;
use App\Models\MarketplaceListing;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\MarketplaceListing>
 */
class MarketplaceListingFactory extends Factory
{
    protected $model = MarketplaceListing::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $titles = [
            'Buku Kalkulus Edisi 7',
            'Kalkulator Casio fx-991ID Plus',
            'Laptop Lenovo Bekas Mulus',
            'Sepeda Lipat Bekas',
            'Meja Belajar Lipat',
            'Kipas Angin Cosmos Bekas',
            'Helm KYT Bekas',
            'Jaket Almamater UPN',
            'Printer Canon Bekas Normal',
            'Sepatu Sneakers Bekas Size 42',
            'Buku Fisika Dasar II',
            'Mouse Logitech Wireless Bekas',
            'Tas Ransel Eiger Bekas',
            'Kompor Listrik Mini Kos',
            'Rice Cooker Miyako Bekas',
        ];

        return [
            'user_id' => User::factory(),
            'category_id' => Category::query()->where('type', 'marketplace')->inRandomOrder()->value('id')
                ?? Category::query()->firstOrCreate(
                    ['slug' => 'elektronik'],
                    ['name' => 'Elektronik', 'type' => 'marketplace']
                )->id,
            'title' => $this->faker->randomElement($titles),
            'description' => $this->faker->paragraph(3),
            'price' => $this->faker->randomElement([15000, 25000, 50000, 75000, 100000, 150000, 250000, 500000, 850000, 1500000, 2500000, 4500000]),
            'condition' => $this->faker->randomElement(['new', 'like-new', 'good', 'fair']),
            'status' => 'active',
        ];
    }
}
