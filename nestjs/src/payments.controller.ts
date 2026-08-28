import { Body, Controller, HttpException, Param, Post, RawBodyRequest, Req } from '@nestjs/common';
import { Request } from 'express';
import { MonaPay, verifyWebhook } from '@monapay/node';

import { OrdersService } from './orders.service';

@Controller()
export class PaymentsController {
  private readonly monapay = new MonaPay({
    username: process.env.MONAPAY_USERNAME!,
    password: process.env.MONAPAY_PASSWORD!,
    clientSecret: process.env.MONAPAY_CLIENT_SECRET,
  });

  constructor(private readonly orders: OrdersService) {}

  @Post('webhooks/monapay')
  webhook(@Req() request: RawBodyRequest<Request>, @Body() payload: Record<string, unknown>) {
    if (!request.rawBody) throw new HttpException('raw_body_required', 400);
    const verified = verifyWebhook({
      rawBody: request.rawBody,
      headers: request.headers,
      secret: process.env.MONAPAY_WEBHOOK_SECRET!,
    });
    if (!verified.ok) throw new HttpException(verified.reason, 401);
    const body = verified.payload as { amount: number; description?: string; order_id?: string; transaction_code: string };
    const orderId = body.order_id || body.description?.match(/\bDH\d+\b/i)?.[0];
    const result = this.orders.markPaidOnce(orderId || '', body.amount, body.transaction_code);
    if (!result.ok) throw new HttpException(result.reason, result.reason === 'order_not_found' ? 404 : 409);
    return result;
  }

  @Post('orders/:id/qr')
  async createQr(@Param('id') id: string) {
    const order = this.orders.find(id);
    if (!order) throw new HttpException('Không tìm thấy đơn', 404);
    const qr = await this.monapay.qr.generate({
      ownerNumber: process.env.MONAPAY_OWNER_NUMBER,
      ownerType: process.env.MONAPAY_OWNER_TYPE || 'ORG',
      merchantId: process.env.MONAPAY_MERCHANT_ID,
      terminalId: process.env.MONAPAY_TERMINAL_ID,
      orderId: order.id,
      virtualAccountPrefix: process.env.MONAPAY_VA_PREFIX,
      beneficiaryName: process.env.MONAPAY_BENEFICIARY_NAME,
      amount: order.amount,
      description: `Thanh toan ${order.id}`,
    });
    return { order, qr };
  }
}
