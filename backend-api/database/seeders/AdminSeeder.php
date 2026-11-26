<?php

namespace Database\Seeders;

use App\Models\Admin;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $email = (string) env('ADMIN_SEED_EMAIL', 'admin@upnjatim.ac.id');
        $password = env('ADMIN_SEED_PASSWORD');

        if (app()->environment('production')) {
            if (! is_string($password) || trim($password) === '' || trim($password) === 'password') {
                $this->command?->warn('Skipping AdminSeeder in production because ADMIN_SEED_PASSWORD is missing or uses the default weak password.');

                return;
            }
        }

        Admin::updateOrCreate(
            ['email' => $email],
            [
                'password' => Hash::make(is_string($password) && trim($password) !== '' ? $password : 'password'),
                'role' => 'superadmin',
            ]
        );
    }
}
