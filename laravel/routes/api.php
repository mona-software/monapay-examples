<?php

use App\Http\Controllers\MonaPayController;
use App\Http\Middleware\VerifyMonaPayWebhook;
use Illuminate\Support\Facades\Route;

Route::post('/orders/{order}/qr', [MonaPayController::class, 'createQr']);
Route::post('/webhooks/monapay', [MonaPayController::class, 'webhook'])
    ->middleware(VerifyMonaPayWebhook::class);
