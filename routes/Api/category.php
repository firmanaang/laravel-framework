<?php

use App\Http\Controllers\Api\CategoryController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    // Categorys API
    Route::get('categories', [CategoryController::class, 'index'])->middleware('permission:view categories');
    Route::post('categories', [CategoryController::class, 'store'])->middleware('permission:create categories');
    Route::put('categories/{id}', [CategoryController::class, 'update'])->middleware('permission:edit categories');
    Route::delete('categories/{id}', [CategoryController::class, 'destroy'])->middleware('permission:delete categories');
    Route::post('categories/bulk-delete', [CategoryController::class, 'bulkDestroy'])->middleware('permission:delete categories');
});
