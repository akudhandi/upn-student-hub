<?php

namespace Database\Seeders;

use App\Models\StudentProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        if (app()->environment('production') && ! filter_var(env('ALLOW_DEMO_SEEDING', false), FILTER_VALIDATE_BOOLEAN)) {
            $this->command?->warn('Skipping demo UserSeeder in production.');

            return;
        }

        $student = User::updateOrCreate(
            ['email' => 'student@upnjatim.ac.id'],
            [
                'name' => 'Student Test',
                'password' => Hash::make('password'),
                'status' => 'active',
                'account_type' => 'student',
            ]
        );
        $student->forceFill(['email_verified_at' => now()])->save();

        StudentProfile::updateOrCreate(
            ['user_id' => $student->id],
            [
                'name' => 'Student Test',
                'nim' => '22081010001',
                'faculty' => 'Fakultas Ilmu Komputer',
                'bio' => 'Ini adalah akun mahasiswa uji coba untuk UPN Student Hub.',
            ]
        );

        // Akun resmi siap pakai yang dikelola Admin untuk Ormawa, HIMA, dan Fakultas.
        $officialAccounts = [
            [
                'email' => 'bem@upnjatim.ac.id',
                'name' => 'BEM UPN Veteran Jawa Timur',
                'account_type' => 'ormawa',
                'faculty' => 'Tingkat Universitas',
                'bio' => 'Akun resmi Badan Eksekutif Mahasiswa UPN Veteran Jawa Timur.',
            ],
            [
                'email' => 'himatif@upnjatim.ac.id',
                'name' => 'HIMA Informatika UPN',
                'account_type' => 'hima',
                'faculty' => 'Fakultas Ilmu Komputer',
                'bio' => 'Akun resmi Himpunan Mahasiswa Teknik Informatika UPN Veteran Jawa Timur.',
            ],
            [
                'email' => 'fik@upnjatim.ac.id',
                'name' => 'Fakultas Ilmu Komputer UPN',
                'account_type' => 'faculty',
                'faculty' => 'Fakultas Ilmu Komputer',
                'bio' => 'Akun resmi informasi kemahasiswaan Fakultas Ilmu Komputer UPN Veteran Jawa Timur.',
            ],
        ];

        foreach ($officialAccounts as $account) {
            $orgUser = User::updateOrCreate(
                ['email' => $account['email']],
                [
                    'name' => $account['name'],
                    'password' => Hash::make('password123'),
                    'status' => 'active',
                    'account_type' => $account['account_type'],
                ]
            );
            $orgUser->forceFill(['email_verified_at' => now()])->save();

            StudentProfile::updateOrCreate(
                ['user_id' => $orgUser->id],
                [
                    'name' => $account['name'],
                    'nim' => null,
                    'faculty' => $account['faculty'],
                    'bio' => $account['bio'],
                ]
            );
        }
    }
}
