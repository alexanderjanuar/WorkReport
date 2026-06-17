<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('comments', function (Blueprint $table) {
            // Optional link to the media account this comment relates to.
            $table->foreignId('media_id')
                ->nullable()
                ->after('target_id')
                ->constrained('media')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('comments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('media_id');
        });
    }
};
