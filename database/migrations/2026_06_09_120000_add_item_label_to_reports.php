<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            // Free-text label for the activity. When the entry is linked to a
            // target item, that item's label takes precedence for display.
            $table->string('item_label')->nullable()->after('target_item_id');
        });
    }

    public function down(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->dropColumn('item_label');
        });
    }
};
