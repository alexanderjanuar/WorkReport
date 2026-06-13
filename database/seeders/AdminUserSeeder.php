<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /**
     * Akun admin awal (bootstrap). UBAH tiga nilai ini sebelum dijalankan,
     * lalu ganti password lewat menu profil setelah login pertama.
     */
    private const NAME = 'Administrator';

    private const EMAIL = 'admin@superdigital.id';

    private const PASSWORD = 'WorkReport!2026';

    /**
     * Buat HANYA akun admin (tanpa data demo). Aman dijalankan di produksi
     * dan idempoten — menjalankan ulang tidak menggandakan akun.
     */
    public function run(): void
    {
        $admin = User::updateOrCreate(
            ['email' => self::EMAIL],
            [
                'name' => self::NAME,
                'password' => Hash::make(self::PASSWORD),
                'role' => UserRole::Admin,
                'email_verified_at' => now(),
            ],
        );

        $this->command->info("Admin siap: {$admin->email}");
    }
}
