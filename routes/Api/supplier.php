<?php

use App\Http\Controllers\Api\UnitController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    // Units API
    Route::get('suppliers', [UnitController::class, 'index'])->middleware('permission:view suppliers');
    Route::post('suppliers', [UnitController::class, 'store'])->middleware('permission:create suppliers');
    Route::put('suppliers/{id}', [UnitController::class, 'update'])->middleware('permission:edit suppliers');
    Route::delete('suppliers/{id}', [UnitController::class, 'destroy'])->middleware('permission:delete suppliers');
    Route::post('suppliers/bulk-delete', [UnitController::class, 'bulkDestroy'])->middleware('permission:delete suppliers');
});
