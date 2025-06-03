<?php

use App\Http\Controllers\Api\UnitController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    // Units API
    Route::get('customers', [UnitController::class, 'index'])->middleware('permission:view units');
    Route::post('units', [UnitController::class, 'store'])->middleware('permission:create units');
    Route::put('units/{id}', [UnitController::class, 'update'])->middleware('permission:edit units');
    Route::delete('units/{id}', [UnitController::class, 'destroy'])->middleware('permission:delete units');
    Route::post('units/bulk-delete', [UnitController::class, 'bulkDestroy'])->middleware('permission:delete units');
});
