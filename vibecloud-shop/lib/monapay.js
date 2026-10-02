import { MonaPay } from '@monapay/node';

let client;

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Thiếu biến môi trường ${name}`);
  return value;
}

export function getMonaPay() {
  if (!client) {
    required('MONAPAY_CLIENT_ID');
    required('MONAPAY_CLIENT_SECRET');
    client = MonaPay.fromEnv();
  }
  return client;
}

export function qrRequest(order) {
  return {
    ownerNumber: required('MONAPAY_OWNER_NUMBER'),
    ownerType: process.env.MONAPAY_OWNER_TYPE || 'ORG',
    merchantId: required('MONAPAY_MERCHANT_ID'),
    terminalId: required('MONAPAY_TERMINAL_ID'),
    orderId: order.id,
    virtualAccountPrefix: required('MONAPAY_VA_PREFIX'),
    beneficiaryName: required('MONAPAY_BENEFICIARY_NAME'),
    amount: order.amount,
    description: `Thanh toan ${order.id}`,
    traceNumber: order.id,
  };
}

export async function createPaymentQr(order) {
  const result = await getMonaPay().qr.generate(qrRequest(order));
  if (!result?.id || !result?.qr_data_url) {
    throw new Error('MONA Pay không trả về đủ id và qr_data_url');
  }
  return {
    id: result.id,
    data: result.qr_data_url,
    virtualAccountNumber: result.virtual_account_number || null,
    beneficiaryName: result.beneficiary_name || process.env.MONAPAY_BENEFICIARY_NAME,
  };
}
