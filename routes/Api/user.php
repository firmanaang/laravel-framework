<?php

use App\Http\Controllers\Api\UnitController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    // Units API
    Route::get('users', [UnitController::class, 'index'])->middleware('permission:view users');
    Route::post('users', [UnitController::class, 'store'])->middleware('permission:create users');
    Route::put('users/{id}', [UnitController::class, 'update'])->middleware('permission:edit users');
    Route::delete('users/{id}', [UnitController::class, 'destroy'])->middleware('permission:delete users');
    Route::post('users/bulk-delete', [UnitController::class, 'bulkDestroy'])->middleware('permission:delete users');
});
