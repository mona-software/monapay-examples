<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use MonaPay\Client;

class MonaPayController extends Controller
{
    public function createQr(Order $order): JsonResponse
    {
        $client = Client::fromEnv();
        $qr = $client->qr->generate([
            'ownerNumber' => env('MONAPAY_OWNER_NUMBER'),
            'ownerType' => env('MONAPAY_OWNER_TYPE', 'ORG'),
            'merchantId' => env('MONAPAY_MERCHANT_ID'),
            'terminalId' => env('MONAPAY_TERMINAL_ID'),
            'orderId' => (string) $order->id,
            'virtualAccountPrefix' => env('MONAPAY_VA_PREFIX'),
            'beneficiaryName' => env('MONAPAY_BENEFICIARY_NAME'),
            'amount' => (int) $order->amount,
            'description' => 'Thanh toan DH' . $order->id,
        ]);
        return response()->json(['order' => $order, 'qr' => $qr]);
    }

    public function webhook(Request $request): JsonResponse
    {
        $payload = $request->attributes->get('monapay_payload');
        $orderId = $payload['order_id'] ?? null;
        if (!$orderId && preg_match('/\bDH(\d+)\b/i', (string) ($payload['description'] ?? ''), $matches)) {
            $orderId = $matches[1];
        }

        return DB::transaction(function () use ($orderId, $payload): JsonResponse {
            $order = Order::query()->lockForUpdate()->find($orderId);
            if (!$order) return response()->json(['ok' => false, 'reason' => 'order_not_found'], 404);
            if ((int) $order->amount !== (int) $payload['amount']) {
                return response()->json(['ok' => false, 'reason' => 'amount_mismatch'], 409);
            }
            if ($order->payment_transaction_code === $payload['transaction_code']) {
                return response()->json(['ok' => true, 'duplicate' => true]);
            }
            if ($order->status === 'paid') {
                return response()->json(['ok' => false, 'reason' => 'order_already_paid'], 409);
            }
            $order->update(['status' => 'paid', 'payment_transaction_code' => $payload['transaction_code']]);
            return response()->json(['ok' => true, 'duplicate' => false]);
        });
    }
}
