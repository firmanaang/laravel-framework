<?php

use App\Http\Controllers\Api\UnitController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    // Units API
    Route::get('price-types', [UnitController::class, 'index'])->middleware('permission:view price-types');
    Route::post('price-types', [UnitController::class, 'store'])->middleware('permission:create price-types');
    Route::put('price-types/{id}', [UnitController::class, 'update'])->middleware('permission:edit price-types');
    Route::delete('price-types/{id}', [UnitController::class, 'destroy'])->middleware('permission:delete price-types');
    Route::post('price-types/bulk-delete', [UnitController::class, 'bulkDestroy'])->middleware('permission:delete price-types');
});
