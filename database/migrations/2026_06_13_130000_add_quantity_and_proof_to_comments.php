<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('comments', function (Blueprint $table) {
            // How many comments were distributed in this entry.
            $table->unsignedInteger('quantity')->default(1)->after('platform');
            // Uploaded proof screenshot (public disk). The legacy `proof_url`
            // column is kept for any older URL-based proofs.
            $table->string('proof_path')->nullable()->after('proof_url');
        });
    }

    public function down(): void
    {
        Schema::table('comments', function (Blueprint $table) {
            $table->dropColumn(['quantity', 'proof_path']);
        });
    }
};
