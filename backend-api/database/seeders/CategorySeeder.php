<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            // Marketplace Categories
            [
                'name' => 'Elektronik',
                'type' => 'marketplace',
            ],
            [
                'name' => 'Buku & Alat Tulis',
                'type' => 'marketplace',
            ],
            [
                'name' => 'Fashion & Pakaian',
                'type' => 'marketplace',
            ],
            [
                'name' => 'Perlengkapan Kost',
                'type' => 'marketplace',
            ],
            [
                'name' => 'Buku & Catatan',
                'type' => 'marketplace',
            ],
            [
                'name' => 'Elektronik & Gadget',
                'type' => 'marketplace',
            ],
            [
                'name' => 'Perlengkapan Kuliah',
                'type' => 'marketplace',
            ],
            [
                'name' => 'Pakaian & Aksesori',
                'type' => 'marketplace',
            ],
            [
                'name' => 'Hobi & Olahraga',
                'type' => 'marketplace',
            ],
            [
                'name' => 'Peralatan Kamar/Kost',
                'type' => 'marketplace',
            ],
            [
                'name' => 'Lainnya',
                'type' => 'marketplace',
            ],

            // Service Categories
            [
                'name' => 'Jasa Desain & Media',
                'type' => 'service',
            ],
            [
                'name' => 'Jasa Joki & Tugas',
                'type' => 'service',
            ],
            [
                'name' => 'Jasa Percetakan & Print',
                'type' => 'service',
            ],
            [
                'name' => 'Jasa Tutor & Privat',
                'type' => 'service',
            ],

            // Kost Categories
            [
                'name' => 'Kost Putra',
                'type' => 'kost',
            ],
            [
                'name' => 'Kost Putri',
                'type' => 'kost',
            ],
            [
                'name' => 'Kost Campur',
                'type' => 'kost',
            ],

            // Lost & Found Categories
            [
                'name' => 'Kehilangan',
                'type' => 'lost_found',
            ],
            [
                'name' => 'Ditemukan',
                'type' => 'lost_found',
            ],
        ];

        foreach ($categories as $category) {
            Category::updateOrCreate(
                [
                    'slug' => Str::slug($category['name']),
                ],
                [
                    'name' => $category['name'],
                    'type' => $category['type'],
                ]
            );
        }
    }
}
