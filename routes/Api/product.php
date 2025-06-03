<?php

use App\Http\Controllers\Api\ProductController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    // Units API
    Route::get('products', [ProductController::class, 'index'])->middleware('permission:view products');
    Route::get('products/{id}', [ProductController::class, 'show'])->middleware('permission:view products');
    Route::post('products', [ProductController::class, 'store'])->middleware('permission:create products');
    Route::put('products/{id}', [ProductController::class, 'update'])->middleware('permission:edit products');
    Route::delete('products/{id}', [ProductController::class, 'destroy'])->middleware('permission:delete products');
    Route::post('products/bulk-delete', [ProductController::class, 'bulkDestroy'])->middleware('permission:delete products');
});
