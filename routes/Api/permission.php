<?php

use App\Http\Controllers\Api\UnitController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    // Units API
    Route::get('permissions', [UnitController::class, 'index'])->middleware('permission:view permissions');
    Route::post('permissions', [UnitController::class, 'store'])->middleware('permission:create permissions');
    Route::put('permissions/{id}', [UnitController::class, 'update'])->middleware('permission:edit permissions');
    Route::delete('permissions/{id}', [UnitController::class, 'destroy'])->middleware('permission:delete permissions');
    Route::post('permissions/bulk-delete', [UnitController::class, 'bulkDestroy'])->middleware('permission:delete permissions');
});
