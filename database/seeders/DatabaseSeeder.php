<?php

namespace Database\Seeders;

use App\Enums\Platform;
use App\Enums\TargetStatus;
use App\Enums\UserRole;
use App\Models\Target;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $admin = User::updateOrCreate(
            ['email' => 'admin@workreport.test'],
            [
                'name' => 'Admin WorkReport',
                'password' => Hash::make('password'),
                'role' => UserRole::Admin,
                'email_verified_at' => now(),
            ],
        );

        $ketua = User::updateOrCreate(
            ['email' => 'ketua@workreport.test'],
            [
                'name' => 'Ketua Tim Contoh',
                'password' => Hash::make('password'),
                'role' => UserRole::KetuaTim,
                'email_verified_at' => now(),
            ],
        );

        $anggota = User::updateOrCreate(
            ['email' => 'anggota@workreport.test'],
            [
                'name' => 'Anggota Contoh',
                'password' => Hash::make('password'),
                'role' => UserRole::User,
                'email_verified_at' => now(),
            ],
        );

        if ($anggota->targets()->exists()) {
            return;
        }

        // Open target (a week) with two goal items + a few days of progress.
        $open = Target::create([
            'user_id' => $anggota->id,
            'assigned_by' => $admin->id,
            'start_date' => now()->subDays(2)->toDateString(),
            'end_date' => now()->addDays(4)->toDateString(),
            'status' => TargetStatus::Open,
            'note' => 'Fokus akun aktif dan engagement awal.',
        ]);
        $open->items()->createMany([
            ['label' => 'Buat akun Instagram baru', 'quantity' => 100, 'is_done' => true, 'done_at' => now()],
            ['label' => 'Komentar di postingan TikTok', 'quantity' => 50],
            ['label' => 'Repost konten campaign', 'quantity' => 20],
        ]);
        $open->reports()->createMany([
            ['user_id' => $anggota->id, 'reported_on' => now()->subDays(2)->toDateString(), 'platform' => Platform::Instagram, 'quantity' => 2, 'post_url' => 'https://www.instagram.com/akun.baru.01/'],
            ['user_id' => $anggota->id, 'reported_on' => now()->subDay()->toDateString(), 'platform' => Platform::Instagram, 'quantity' => 10, 'post_url' => null],
            ['user_id' => $anggota->id, 'reported_on' => now()->subDay()->toDateString(), 'platform' => Platform::TikTok, 'quantity' => 5, 'post_url' => null],
        ]);

        // Closed target from last week that fell short, with a reason.
        $closed = Target::create([
            'user_id' => $anggota->id,
            'assigned_by' => $ketua->id,
            'start_date' => now()->subDays(9)->toDateString(),
            'end_date' => now()->subDays(3)->toDateString(),
            'status' => TargetStatus::Closed,
            'closed_at' => now()->subDays(3),
            'close_reason' => 'Beberapa akun kena limit, hanya tercapai sebagian.',
        ]);
        $closed->items()->create([
            'label' => 'Komentar di postingan TikTok',
            'quantity' => 50,
        ]);
        $closed->reports()->createMany([
            ['user_id' => $anggota->id, 'reported_on' => now()->subDays(8)->toDateString(), 'platform' => Platform::TikTok, 'quantity' => 20, 'post_url' => null],
            ['user_id' => $anggota->id, 'reported_on' => now()->subDays(5)->toDateString(), 'platform' => Platform::TikTok, 'quantity' => 15, 'post_url' => null],
        ]);
    }
}
