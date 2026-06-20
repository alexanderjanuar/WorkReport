<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('comments', function (Blueprint $table) {
            // extra actions done on the same post, besides the comment itself
            $table->unsignedInteger('replies')->default(0)->after('quantity');
            $table->unsignedInteger('likes')->default(0)->after('replies');
            $table->unsignedInteger('boosters')->default(0)->after('likes');
        });
    }

    public function down(): void
    {
        Schema::table('comments', function (Blueprint $table) {
            $table->dropColumn(['replies', 'likes', 'boosters']);
        });
    }
};
