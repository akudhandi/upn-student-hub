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

            // Lost & Found Categories (jenis barang, bukan jenis laporan)
            // NOTE: slugs must stay globally unique (slug column is unique),
            // so L&F names that overlap other modules get an -lf suffix.
            [
                'name' => 'Dokumen',
                'slug' => 'dokumen',
                'type' => 'lost_found',
            ],
            [
                'name' => 'Kartu & KTM',
                'slug' => 'kartu-ktm',
                'type' => 'lost_found',
            ],
            [
                'name' => 'Kunci',
                'slug' => 'kunci',
                'type' => 'lost_found',
            ],
            [
                'name' => 'Karcis Parkir',
                'slug' => 'karcis-parkir',
                'type' => 'lost_found',
            ],
            [
                'name' => 'Elektronik',
                'slug' => 'elektronik-lf',
                'type' => 'lost_found',
            ],
            [
                'name' => 'Pakaian & Jaket',
                'slug' => 'pakaian-jaket',
                'type' => 'lost_found',
            ],
            [
                'name' => 'Tumbler & Botol Minum',
                'slug' => 'tumbler-botol-minum',
                'type' => 'lost_found',
            ],
            [
                'name' => 'Payung',
                'slug' => 'payung',
                'type' => 'lost_found',
            ],
            [
                'name' => 'Helm',
                'slug' => 'helm',
                'type' => 'lost_found',
            ],
            [
                'name' => 'Tas & Dompet',
                'slug' => 'tas-dompet',
                'type' => 'lost_found',
            ],
            [
                'name' => 'Lainnya',
                'slug' => 'lainnya-lf',
                'type' => 'lost_found',
            ],

            // Event & Informasi Kampus Categories
            [
                'name' => 'Akademik',
                'type' => 'event',
            ],
            [
                'name' => 'Seminar',
                'type' => 'event',
            ],
            [
                'name' => 'UKM',
                'type' => 'event',
            ],
            [
                'name' => 'Kompetisi',
                'type' => 'event',
            ],
            [
                'name' => 'Festival',
                'type' => 'event',
            ],
        ];

        foreach ($categories as $category) {
            Category::updateOrCreate(
                [
                    'slug' => $category['slug'] ?? Str::slug($category['name']),
                ],
                [
                    'name' => $category['name'],
                    'type' => $category['type'],
                ]
            );
        }
    }
}
