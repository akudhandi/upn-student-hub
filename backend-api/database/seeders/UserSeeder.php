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
        $user = User::updateOrCreate(
            ['email' => 'student@upnjatim.ac.id'],
            [
                'name' => 'Student Test',
                'password' => Hash::make('password'),
                'status' => 'active',
                'email_verified_at' => now(),
            ]
        );

        StudentProfile::updateOrCreate(
            ['user_id' => $user->id],
            [
                'name' => 'Student Test',
                'nim' => '22081010001',
                'faculty' => 'Fakultas Ilmu Komputer',
                'bio' => 'Ini adalah akun mahasiswa uji coba untuk UPN Student Hub.',
            ]
        );
    }
}
