import os
import re

from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from monapay import MonaPay, verify_webhook

from .models import Order


def client():
    return MonaPay(
        os.environ["MONAPAY_USERNAME"],
        os.environ["MONAPAY_PASSWORD"],
        client_secret=os.getenv("MONAPAY_CLIENT_SECRET"),
    )


@csrf_exempt
def create_qr(request, order_id):
    if request.method != "POST":
        return JsonResponse({"error": "method_not_allowed"}, status=405)
    try:
        order = Order.objects.get(pk=order_id)
    except Order.DoesNotExist:
        return JsonResponse({"error": "order_not_found"}, status=404)
    qr = client().qr.generate(
        {
            "ownerNumber": os.environ["MONAPAY_OWNER_NUMBER"],
            "ownerType": os.getenv("MONAPAY_OWNER_TYPE", "ORG"),
            "merchantId": os.environ["MONAPAY_MERCHANT_ID"],
            "terminalId": os.environ["MONAPAY_TERMINAL_ID"],
            "orderId": order.id,
            "virtualAccountPrefix": os.environ["MONAPAY_VA_PREFIX"],
            "beneficiaryName": os.environ["MONAPAY_BENEFICIARY_NAME"],
            "amount": order.amount,
            "description": "Thanh toan {}".format(order.id),
        }
    )
    return JsonResponse({"order": order.id, "qr": qr})


@csrf_exempt
def monapay_webhook(request):
    if request.method != "POST":
        return JsonResponse({"error": "method_not_allowed"}, status=405)
    verified = verify_webhook(
        request.body,
        request.headers,
        os.environ["MONAPAY_WEBHOOK_SECRET"],
    )
    if not verified.ok:
        return JsonResponse({"ok": False, "reason": verified.reason}, status=401)

    payload = verified.payload
    match = re.search(r"\bDH\d+\b", str(payload.get("description", "")), re.I)
    order_id = payload.get("order_id") or (match.group(0) if match else None)
    with transaction.atomic():
        try:
            order = Order.objects.select_for_update().get(pk=order_id)
        except Order.DoesNotExist:
            return JsonResponse({"ok": False, "reason": "order_not_found"}, status=404)
        if order.amount != payload.get("amount"):
            return JsonResponse({"ok": False, "reason": "amount_mismatch"}, status=409)
        if order.payment_transaction_code == payload.get("transaction_code"):
            return JsonResponse({"ok": True, "duplicate": True})
        if order.status == "paid":
            return JsonResponse({"ok": False, "reason": "order_already_paid"}, status=409)
        order.status = "paid"
        order.payment_transaction_code = payload["transaction_code"]
        order.save(update_fields=["status", "payment_transaction_code"])
    return JsonResponse({"ok": True, "duplicate": False})
