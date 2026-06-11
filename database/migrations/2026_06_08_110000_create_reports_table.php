<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('reported_on');
            $table->string('platform');
            $table->string('type');
            $table->unsignedInteger('quantity');
            $table->string('post_url', 2048);
            $table->text('note')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'reported_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reports');
    }
};
