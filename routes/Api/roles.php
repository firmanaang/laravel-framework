<?php

use App\Http\Controllers\Api\UnitController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    // Units API
    Route::get('roles', [UnitController::class, 'index'])->middleware('permission:view roles');
    Route::post('roles', [UnitController::class, 'store'])->middleware('permission:create roles');
    Route::put('roles/{id}', [UnitController::class, 'update'])->middleware('permission:edit roles');
    Route::delete('roles/{id}', [UnitController::class, 'destroy'])->middleware('permission:delete roles');
    Route::post('roles/bulk-delete', [UnitController::class, 'bulkDestroy'])->middleware('permission:delete roles');
});
