<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('target_items', function (Blueprint $table) {
            $table->boolean('is_done')->default(false)->after('quantity');
            $table->timestamp('done_at')->nullable()->after('is_done');
        });
    }

    public function down(): void
    {
        Schema::table('target_items', function (Blueprint $table) {
            $table->dropColumn(['is_done', 'done_at']);
        });
    }
};
