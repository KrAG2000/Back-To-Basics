import crypto from 'node:crypto';

export const id = (prefix) => `${prefix}_${crypto.randomUUID().replaceAll('-', '').slice(0, 20)}`;
export const now = () => new Date().toISOString();
export const hash = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const hmac = (secret, value) => crypto.createHmac('sha256', secret).update(JSON.stringify(value)).digest('hex');
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class DomainError extends Error {
  constructor(message, code = 'DOMAIN_ERROR', status = 400, details = undefined) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function money(amount, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount / 100);
}
