export const errorClasses = Object.freeze({
  INSUFFICIENT_FUNDS: 'NON_RETRYABLE', INVALID_INSTRUMENT: 'NON_RETRYABLE', ACCOUNT_BLOCKED: 'NON_RETRYABLE',
  PROVIDER_503: 'RETRYABLE', BANK_UNAVAILABLE: 'RETRYABLE', CONNECTION_RESET: 'RETRYABLE',
  PROVIDER_TIMEOUT: 'UNKNOWN', LOST_RESPONSE: 'UNKNOWN', NETWORK_TIMEOUT: 'UNKNOWN'
});

export function simulateProvider({ behavior = 'SUCCESS', amount, account }) {
  if (behavior === 'SUCCESS') return { outcome: 'AUTHORIZED', providerProcessed: true, code: '00', message: 'Approved' };
  if (behavior === 'PENDING') return { outcome: 'PENDING', providerProcessed: false, code: 'P01', message: 'Bank processing asynchronously' };
  if (behavior === 'PROVIDER_TIMEOUT' || behavior === 'LOST_RESPONSE' || behavior === 'NETWORK_TIMEOUT') {
    return { outcome: 'UNKNOWN', providerProcessed: behavior === 'LOST_RESPONSE', code: behavior, message: 'Final outcome is not known to the gateway', errorClass: 'UNKNOWN' };
  }
  if (behavior === 'DECLINE' || behavior === 'INSUFFICIENT_FUNDS' || account.balance - account.held_amount < amount) {
    return { outcome: 'DECLINED', providerProcessed: false, code: 'INSUFFICIENT_FUNDS', message: 'Issuer declined: insufficient available funds', errorClass: 'NON_RETRYABLE' };
  }
  if (['PROVIDER_503', 'BANK_UNAVAILABLE', 'CONNECTION_RESET'].includes(behavior)) {
    return { outcome: 'FAILED', providerProcessed: false, code: behavior, message: 'Temporary infrastructure failure', errorClass: 'RETRYABLE' };
  }
  return { outcome: 'FAILED', providerProcessed: false, code: 'MALFORMED_RESPONSE', message: 'Provider returned an invalid response', errorClass: 'NON_RETRYABLE' };
}

export function retryDelay({ strategy = 'EXPONENTIAL_JITTER', baseDelayMs = 250 }, attempt, seed = 1) {
  if (strategy === 'NONE') return null;
  if (strategy === 'IMMEDIATE') return 0;
  if (strategy === 'FIXED') return baseDelayMs;
  const exponential = baseDelayMs * 2 ** Math.max(0, attempt - 1);
  if (strategy === 'EXPONENTIAL') return exponential;
  const deterministicJitter = ((seed * 9301 + attempt * 49297) % 233280) / 233280;
  return Math.round(exponential * (0.5 + deterministicJitter * 0.5));
}
