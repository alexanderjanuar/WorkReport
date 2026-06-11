<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Items become free-text checklist labels; clear the structured ones.
        DB::table('target_items')->delete();

        Schema::table('target_items', function (Blueprint $table) {
            $table->string('label')->after('target_id');
            $table->dropColumn(['platform', 'type', 'quantity']);
        });
    }

    public function down(): void
    {
        Schema::table('target_items', function (Blueprint $table) {
            $table->string('platform')->nullable();
            $table->string('type')->nullable();
            $table->unsignedInteger('quantity')->default(0);
            $table->dropColumn('label');
        });
    }
};
