<?php

use App\Http\Controllers\Api\BrandController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    // Brands API
    Route::get('brands', [BrandController::class, 'index'])->middleware('permission:view brands');
    Route::post('brands', [BrandController::class, 'store'])->middleware('permission:create brands');
    Route::put('brands/{id}', [BrandController::class, 'update'])->middleware('permission:edit brands');
    Route::delete('brands/{id}', [BrandController::class, 'destroy'])->middleware('permission:delete brands');
    Route::post('brands/bulk-delete', [BrandController::class, 'bulkDestroy'])->middleware('permission:delete brands');
});
