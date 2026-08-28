<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use MonaPay\Webhook;
use Symfony\Component\HttpFoundation\Response;

class VerifyMonaPayWebhook
{
    public function handle(Request $request, Closure $next): Response
    {
        $result = Webhook::verify(
            $request->getContent(),
            $request->headers->all(),
            (string) env('MONAPAY_WEBHOOK_SECRET')
        );
        if (!$result['ok']) {
            return response()->json(['ok' => false, 'reason' => $result['reason']], 401);
        }
        $request->attributes->set('monapay_payload', $result['payload']);
        return $next($request);
    }
}
