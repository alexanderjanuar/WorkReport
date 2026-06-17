<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // A social media account/property the team works with (e.g. an
        // Instagram account). Comments are tied to one of these.
        Schema::create('media', function (Blueprint $table) {
            $table->id();
            $table->string('name');                 // account name / handle
            $table->string('platform');
            $table->string('url', 2048)->nullable(); // link to the account
            $table->text('note')->nullable();
            $table->timestamps();

            $table->index('platform');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('media');
    }
};
