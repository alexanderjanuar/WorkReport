<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            // Optional link from a daily progress entry to a specific target
            // checklist item, so that item's quota can be drawn down.
            $table->foreignId('target_item_id')
                ->nullable()
                ->after('target_id')
                ->constrained('target_items')
                ->nullOnDelete();

            // Free-text daily note attached to the day's progress.
            $table->text('note')->nullable()->after('post_url');
        });
    }

    public function down(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->dropConstrainedForeignId('target_item_id');
            $table->dropColumn('note');
        });
    }
};
