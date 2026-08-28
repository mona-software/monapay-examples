import { Injectable } from '@nestjs/common';

type Order = { id: string; amount: number; status: 'pending' | 'paid'; transactionCode?: string };

@Injectable()
export class OrdersService {
  private readonly orders = new Map<string, Order>([
    ['DH10234', { id: 'DH10234', amount: 2500000, status: 'pending' }],
  ]);

  find(id: string): Order | undefined {
    return this.orders.get(id);
  }

  markPaidOnce(id: string, amount: number, transactionCode: string) {
    const order = this.orders.get(id);
    if (!order) return { ok: false, reason: 'order_not_found' } as const;
    if (order.amount !== amount) return { ok: false, reason: 'amount_mismatch' } as const;
    if (order.transactionCode === transactionCode) return { ok: true, duplicate: true } as const;
    if (order.status === 'paid') return { ok: false, reason: 'order_already_paid' } as const;
    order.status = 'paid';
    order.transactionCode = transactionCode;
    return { ok: true, duplicate: false } as const;
  }
}
