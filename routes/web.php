<?php

use Illuminate\Support\Facades\Route;

// Guest routes (accessible without authentication)
Route::get('/login', function () {
    return view('app');
})->name('login');

Route::get('/register', function () {
    return view('app');
})->name('register');

Route::get('/forgot-password', function () {
    return view('app');
})->name('password.request');

Route::get('/reset-password/{token}', function ($token) {
    return view('app', ['token' => $token]);
})->name('password.reset');

// Protected routes (require authentication)
Route::middleware(['auth'])->group(function () {
    Route::get('/', function () {
        return view('app');
    })->name('home');

    Route::get('/dashboard', function () {
        return view('app');
    })->name('dashboard');

    Route::get('/users', function () {
        return view('app');
    })->name('users');

    Route::get('/units', function () {
        return view('app');
    })->name('units');

    Route::get('/categories', function () {
        return view('app');
    })->name('units');

    Route::get('/settings', function () {
        return view('app');
    })->name('settings');

    Route::get('/analytics', function () {
        return view('app');
    })->name('analytics');

    Route::get('/reports', function () {
        return view('app');
    })->name('reports');
});

// Catch all routes for Vue Router (must be last)
Route::get('/{any}', function () {
    return view('app');
})->where('any', '.*')->name('spa');
