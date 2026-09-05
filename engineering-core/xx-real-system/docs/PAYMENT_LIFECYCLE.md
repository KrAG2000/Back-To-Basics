# Payment lifecycle

## Successful automatic capture

1. `CREATED` records merchant intent and a correlation ID.
2. `INITIATED` and `VALIDATING` confirm actors, amount, method, and source account.
3. `RISK_CHECK` stores an explainable score and reasons.
4. `ROUTING` stores the selected provider and all eligible candidates.
5. `PROCESSING` creates a provider attempt with request, response, latency, and error class.
6. `AUTHORIZED` creates a temporary hold. The account balance is unchanged, but available balance falls.
7. `CAPTURED` consumes the hold, reduces customer balance, and posts a balanced journal.
8. `SUCCESS` means the gateway has confirmed capture. The ledger remains `PENDING_SETTLEMENT`.
9. A domain event and signed webhook row are created through the outbox pipeline.
10. Settlement later calculates the merchant net and changes ledger state to `SETTLED`.

Manual capture stops at step 6. A separate idempotent capture request completes steps 7–8.

## Exceptional paths

- A deterministic risk block moves from `RISK_CHECK` to `DECLINED` without a provider attempt or hold.
- Insufficient funds moves `PROCESSING` to `DECLINED`; it is non-retryable.
- Provider 503 moves to `FAILED`; the attempt is classified retryable.
- A lost response moves to `UNKNOWN`, not failed. Status inquiry can confirm success and safely create the hold/capture path once.
- A genuinely unknowable timeout remains `UNKNOWN` for reconciliation.
- Webhook failures alter only webhook state.

## Event envelope

Each event contains event ID, aggregate ID, type, timestamp, correlation ID, causation ID, aggregate version, and JSON payload. Causation links make the persisted timeline understandable; correlation links all work for one payment.

## Retry classification

| Example | Class | Handling |
|---|---|---|
| Insufficient funds, blocked account, invalid input | non-retryable | stop; a retry cannot change deterministic issuer truth |
| Provider 503, connection reset, bank unavailable | retryable | bounded retry with configured delay |
| Lost response, network timeout | unknown | inquire first; blindly replaying could duplicate money movement |

Supported delay calculations are none, immediate, fixed, exponential, and exponential with deterministic seeded jitter. The simulator exposes the classification and calculation; it does not run an unbounded automatic retry storm.
