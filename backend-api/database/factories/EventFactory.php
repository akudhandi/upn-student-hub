<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Category;
use App\Models\Event;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Event>
 */
class EventFactory extends Factory
{
    protected $model = Event::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $events = [
            'Seminar Nasional TechTrend FIK UPN 2026' => [
                'organizer' => 'BEM FIK UPN',
                'location' => 'Auditorium GSG UPN',
                'description' => 'Seminar nasional tahunan membahas tren AI, keamanan siber, dan karir teknologi bersama praktisi industri dan alumni. Terbuka untuk seluruh mahasiswa UPN, peserta mendapat e-sertifikat dan seminar kit.',
            ],
            'Expo & Open Recruitment UKM UPN Veteran Jawa Timur' => [
                'organizer' => 'BEM UPN Veteran Jawa Timur',
                'location' => 'Lapangan Parkir GSG UPN',
                'description' => 'Pameran dan open recruitment seluruh UKM kampus dalam satu tempat. Kenali 20+ UKM, daftar langsung di stand, dan ikuti talkshow pengenalan organisasi kemahasiswaan.',
            ],
            'Hackathon Mahasiswa Surabaya #3 at GSG UPN' => [
                'organizer' => 'HIMATI UPN',
                'location' => 'GSG UPN',
                'description' => 'Kompetisi hackathon 24 jam antar mahasiswa Surabaya. Bangun solusi digital untuk tema smart campus, menangkan total hadiah jutaan rupiah plus kesempatan inkubasi. Tim 2-4 orang.',
            ],
            'Workshop Penulisan Program Kreativitas Mahasiswa (PKM)' => [
                'organizer' => 'BEM FTI UPN',
                'location' => 'Perpus Lt. 3 UPN',
                'description' => 'Workshop intensif penyusunan proposal PKM dari nol: menemukan ide, menulis latar belakang, hingga budgeting. Dibimbing dosen reviewer internal dan tim PKM lolos PIMNAS.',
            ],
            'Konser Musik Kampus Dies Natalis UPN' => [
                'organizer' => 'UKM Music UPN',
                'location' => 'Online via Zoom',
                'description' => 'Perayaan Dies Natalis UPN dimeriahkan penampilan band mahasiswa, guest star, dan bazar kuliner. Disiarkan hybrid dari panggung utama kampus Condongcatur.',
            ],
        ];

        $title = $this->faker->randomElement(array_keys($events));
        $meta = $events[$title];

        return [
            'user_id' => User::factory(),
            'title' => $title,
            'slug' => Str::slug($title).'-'.$this->faker->unique()->numberBetween(100, 999),
            'category_id' => Category::query()->where('type', 'event')->inRandomOrder()->value('id')
                ?? Category::query()->firstOrCreate(
                    ['slug' => 'seminar'],
                    ['name' => 'Seminar', 'type' => 'event']
                )->id,
            'organizer_name' => $meta['organizer'],
            'event_date' => $this->faker->dateTimeBetween('now', '+30 days')->format('Y-m-d H:i:s'),
            'location' => $meta['location'],
            'registration_link' => $this->faker->boolean(60) ? $this->faker->url() : null,
            'description' => $meta['description'],
            'status' => 'published',
        ];
    }
}
