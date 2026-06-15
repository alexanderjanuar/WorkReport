<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // A comment a member distributed to a post on some platform. Optionally
        // tied to a target. One row = one comment placement (no quantity).
        Schema::create('comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('target_id')->nullable()->constrained()->nullOnDelete();
            $table->date('commented_on');
            $table->string('platform');
            $table->string('post_url', 2048);          // the post the comment went to
            $table->string('proof_url', 2048)->nullable(); // bukti (screenshot/link)
            $table->timestamps();

            $table->index(['user_id', 'commented_on']);
            $table->index('target_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('comments');
    }
};
