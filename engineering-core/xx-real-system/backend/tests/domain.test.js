import { describe, expect, it } from 'vitest';
import { assertTransition } from '../src/payments/stateMachine.js';
import { evaluateRisk } from '../src/risk/engine.js';
import { retryDelay, simulateProvider } from '../src/providers/simulator.js';
import { chooseProvider } from '../src/routing/router.js';
import { postJournal } from '../src/ledger/service.js';

describe('payment state machine', () => {
  it('accepts declared lifecycle transitions', () => {
    expect(() => assertTransition('PROCESSING', 'UNKNOWN')).not.toThrow();
    expect(() => assertTransition('UNKNOWN', 'AUTHORIZED')).not.toThrow();
    expect(() => assertTransition('SUCCESS', 'REFUND_PENDING')).not.toThrow();
  });

  it('rejects arbitrary terminal-state mutations', () => {
    expect(() => assertTransition('DECLINED', 'SUCCESS')).toThrowError(/Invalid payment transition/);
    expect(() => assertTransition('CREATED', 'SETTLED')).toThrowError(/Invalid payment transition/);
  });
});

describe('deterministic decisions', () => {
  it('explains risk blocks and medium-risk amounts', () => {
    const medium = evaluateRisk({ amount: 600000, method: 'UPI', customer: {}, scenario: {} });
    expect(medium.decision).toBe('MEDIUM_RISK');
    expect(medium.reasons).toContain('Elevated transaction amount');
    expect(evaluateRisk({ amount: 100, method: 'CARD', customer: {}, scenario: { risk: 'BLOCK' } }).decision).toBe('BLOCKED');
  });

  it('routes by eligibility, priority, success and latency', () => {
    const route = chooseProvider({ method: 'UPI', amount: 1000, providers: [
      { id: 'fallback', methods: ['UPI'], enabled: true, priority: 5, successRate: 100, latency: 1 },
      { id: 'primary', methods: ['UPI'], enabled: true, priority: 1, successRate: 95, latency: 40 }
    ] });
    expect(route.provider).toBe('primary');
    expect(route.candidates).toHaveLength(2);
  });

  it('classifies lost responses as unknown and makes jitter reproducible', () => {
    expect(simulateProvider({ behavior: 'LOST_RESPONSE', amount: 100, account: { balance: 1000, held_amount: 0 } })).toMatchObject({ outcome: 'UNKNOWN', providerProcessed: true });
    expect(retryDelay({ strategy: 'EXPONENTIAL_JITTER', baseDelayMs: 100 }, 3, 42)).toBe(retryDelay({ strategy: 'EXPONENTIAL_JITTER', baseDelayMs: 100 }, 3, 42));
  });
});

describe('ledger invariant', () => {
  it('rejects an unbalanced journal before any database write', async () => {
    const client = { query: async () => { throw new Error('should not write'); } };
    await expect(postJournal(client, { kind: 'BAD', description: 'bad', entries: [
      { accountCode: 'A', direction: 'DEBIT', amount: 100 },
      { accountCode: 'B', direction: 'CREDIT', amount: 99 }
    ] })).rejects.toMatchObject({ code: 'LEDGER_IMBALANCE' });
  });
});
