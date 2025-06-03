<?php
// routes/api.php

use App\Http\Controllers\Api\BrandController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\PostController;
use App\Http\Controllers\Api\SyncController;
use App\Http\Controllers\Api\UnitController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// Posts API routes
Route::apiResource('posts', PostController::class);

Route::post('/login', [\App\Http\Controllers\Api\AuthController::class, 'login'])->name('api.login');

require __DIR__ . '/Api/unit.php';
require __DIR__ . '/Api/category.php';
require __DIR__ . '/Api/brand.php';
require __DIR__ . '/Api/product.php';
require __DIR__ . '/Api/priceType.php';
require __DIR__ . '/Api/user.php';
require __DIR__ . '/Api/roles.php';
require __DIR__ . '/Api/permission.php';
require __DIR__ . '/Api/paymentMethod.php';
require __DIR__ . '/Api/supplier.php';
require __DIR__ . '/Api/customer.php';

Route::middleware('auth:sanctum')->group(function () {
    // Sync route for offline data
    Route::post('sync', [SyncController::class, 'sync'])->middleware('permission:synchronize data');
});

// Test route untuk debugging
Route::get('/test', function () {
    return response()->json([
        'message' => 'API is working!',
        'timestamp' => now()
    ]);
});
