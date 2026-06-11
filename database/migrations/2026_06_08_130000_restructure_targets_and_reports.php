<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Drop the previous (global daily target) schema.
        Schema::dropIfExists('reports');
        Schema::dropIfExists('targets');

        // Targets are now assigned to a member for a date range, with a status.
        Schema::create('targets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();        // assignee (member)
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->date('start_date');
            $table->date('end_date');
            $table->string('status')->default('open');                             // open | closed
            $table->timestamp('closed_at')->nullable();
            $table->text('close_reason')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
        });

        // Each target holds one or more goal items (platform + activity + amount).
        Schema::create('target_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('target_id')->constrained()->cascadeOnDelete();
            $table->string('platform');
            $table->string('type');
            $table->unsignedInteger('quantity');
            $table->timestamps();
        });

        // Reports are daily progress entries logged against a target.
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('target_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('reported_on');
            $table->string('platform');
            $table->unsignedInteger('quantity');
            $table->string('post_url', 2048)->nullable();
            $table->timestamps();

            $table->index('target_id');
            $table->index(['user_id', 'reported_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reports');
        Schema::dropIfExists('target_items');
        Schema::dropIfExists('targets');
    }
};
