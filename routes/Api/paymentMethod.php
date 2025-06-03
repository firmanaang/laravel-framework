<?php

use App\Http\Controllers\Api\UnitController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    // Units API
    Route::get('payment-methods', [UnitController::class, 'index'])->middleware('permission:view payment-methods');
    Route::post('payment-methods', [UnitController::class, 'store'])->middleware('permission:create payment-methods');
    Route::put('payment-methods/{id}', [UnitController::class, 'update'])->middleware('permission:edit payment-methods');
    Route::delete('payment-methods/{id}', [UnitController::class, 'destroy'])->middleware('permission:delete payment-methods');
    Route::post('payment-methods/bulk-delete', [UnitController::class, 'bulkDestroy'])->middleware('permission:delete payment-methods');
});
