import { MonaPay } from '@monapay/node';

export const monapay = MonaPay.fromEnv();

export function qrBody(order) {
  return {
    ownerNumber: process.env.MONAPAY_OWNER_NUMBER,
    ownerType: process.env.MONAPAY_OWNER_TYPE || 'ORG',
    merchantId: process.env.MONAPAY_MERCHANT_ID,
    terminalId: process.env.MONAPAY_TERMINAL_ID,
    orderId: order.id,
    virtualAccountPrefix: process.env.MONAPAY_VA_PREFIX,
    beneficiaryName: process.env.MONAPAY_BENEFICIARY_NAME,
    amount: order.amount,
    description: `Thanh toan ${order.id}`,
  };
}
