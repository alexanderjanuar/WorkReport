<?php

use App\Http\Controllers\CommentController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\MediaController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\TargetController;
use App\Http\Controllers\TeamCommentController;
use App\Http\Controllers\TeamReportController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return Auth::check()
        ? redirect()->route('dashboard')
        : redirect()->route('login');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    // Progress entries — every user logs progress against their own targets.
    Route::get('reports', [ReportController::class, 'index'])->name('reports.index');
    Route::get('reports/riwayat', [ReportController::class, 'history'])->name('reports.history');
    Route::post('reports', [ReportController::class, 'store'])->name('reports.store');
    Route::patch('reports/{report}', [ReportController::class, 'update'])->name('reports.update');
    Route::delete('reports/{report}', [ReportController::class, 'destroy'])->name('reports.destroy');

    // Comments — every member logs the comments they distributed to posts.
    Route::get('komentar', [CommentController::class, 'index'])->name('comments.index');
    Route::get('komentar/export', [CommentController::class, 'export'])->name('comments.export');
    Route::post('komentar', [CommentController::class, 'store'])->name('comments.store');
    Route::patch('komentar/{comment}', [CommentController::class, 'update'])->name('comments.update');
    Route::delete('komentar/{comment}', [CommentController::class, 'destroy'])->name('comments.destroy');

    // Any member can quick-add a media account (e.g. from the comment modal);
    // full media management stays admin/ketua only (below).
    Route::post('media', [MediaController::class, 'store'])->name('media.store');
    Route::post('media/scrape', [MediaController::class, 'scrape'])->name('media.scrape');

    // Target & user management — admin and ketua tim only.
    Route::middleware('role:admin,ketua_tim')->group(function () {
        Route::get('targets', [TargetController::class, 'index'])->name('targets.index');
        Route::post('targets', [TargetController::class, 'store'])->name('targets.store');
        Route::patch('targets/{target}', [TargetController::class, 'update'])->name('targets.update');
        Route::post('targets/{target}/close', [TargetController::class, 'close'])->name('targets.close');
        Route::delete('targets/{target}', [TargetController::class, 'destroy'])->name('targets.destroy');
        Route::patch('target-items/{targetItem}/toggle', [TargetController::class, 'toggleItem'])->name('target-items.toggle');

        // Oversight: all members' daily progress in a table.
        Route::get('laporan', [TeamReportController::class, 'index'])->name('reports.team');

        // Oversight: all members' distributed comments.
        Route::get('komentar-tim', [TeamCommentController::class, 'index'])->name('comments.team');
        Route::get('komentar-tim/export', [TeamCommentController::class, 'export'])->name('comments.team.export');

        // Media management (list/detail/edit/delete) — admin/ketua only. Creating
        // a media is allowed for any member (route registered above).
        Route::get('media', [MediaController::class, 'index'])->name('media.index');
        Route::get('media/{media}', [MediaController::class, 'show'])->name('media.show');
        Route::post('media/{media}/resync', [MediaController::class, 'resync'])->name('media.resync');
        Route::patch('media/{media}', [MediaController::class, 'update'])->name('media.update');
        Route::delete('media/{media}', [MediaController::class, 'destroy'])->name('media.destroy');

        Route::get('users', [UserController::class, 'index'])->name('users.index');
        Route::post('users', [UserController::class, 'store'])->name('users.store');
        Route::patch('users/{user}', [UserController::class, 'update'])->name('users.update');
        Route::put('users/{user}/password', [UserController::class, 'resetPassword'])->name('users.password');
        Route::delete('users/{user}', [UserController::class, 'destroy'])->name('users.destroy');
    });
});

require __DIR__.'/settings.php';
