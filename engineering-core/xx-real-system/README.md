# Switchyard — Payment Infrastructure Lab

Switchyard is a full-stack, deterministic payment-infrastructure simulator. It models the public architecture patterns behind gateways, processors, banks, UPI-style networks, ledgers, queues, webhooks, settlement, and reconciliation. It is an educational system: it does not connect to a real payment rail and is not a replica of any company's proprietary infrastructure.

## Quick start

Requirements: Docker Engine with Compose. From this directory:

```bash
docker compose up --build
```

Open <http://localhost:4000>. The dashboard uses the synthetic API key `lab_test_key`. PostgreSQL is exposed at `localhost:5432`; Redis stays on the private Compose network; Prometheus-format metrics are at <http://localhost:4000/metrics>.

To reset all simulated records:

```bash
docker compose down -v
```

For local Node development, start PostgreSQL and Redis, copy `.env.example` to `.env`, then run `npm install && npm run dev`.

## Architecture summary

```text
Browser / merchant
        │ X-API-Key + Idempotency-Key
        ▼
Express gateway ── validation / rate limit / audit
        │
        ▼
Payment orchestrator
   ├── deterministic risk engine
   ├── configurable provider router
   └── synthetic provider / bank
        │
        ▼ one PostgreSQL transaction
Payment + attempt + hold + journal + event + outbox
                                      │
                                      ▼
                               Redis queue topics
                                      │
                          webhook / settlement workers
                                      │
                      reconciliation compares all records
```

PostgreSQL is the system of record. Redis is an inspectable asynchronous handoff; if Redis is unavailable, committed outbox rows remain recoverable. The frontend is served by the Node process, which keeps the local environment to three purposeful services.

## What to try

The Simulation Lab contains deterministic presets:

| Category | Scenario | Expected behavior |
|---|---|---|
| Normal | UPI/card success | risk → route → authorization hold → capture journal → success |
| Normal | Manual capture | stays `AUTHORIZED` with held funds until the operator captures |
| Distributed | Lost response | becomes `UNKNOWN`; inquiry reads provider truth and resolves to success |
| Infrastructure | Network timeout | remains `UNKNOWN` when neither side can prove the result |
| Customer | Insufficient funds | issuer decline, classified non-retryable |
| Infrastructure | Provider 503 | failed attempt classified retryable |
| Risk | Forced risk block | declines before provider routing and money movement |
| Integration | Webhook 500 → 500 → 200 | payment remains successful while notification retries |
| Financial | Provider status mismatch | reconciliation emits a mismatch report |

You can also create synthetic customers, merchants, accounts, and VPAs in Operations; pause providers; inspect outbox and queue state; process webhooks; settle the demo merchant; and run reconciliation. The Payment Explorer exposes every persisted stage.

## Component guide

- **Gateway:** API-key authentication, request validation, per-process rate limiting, request IDs, masked structured logs.
- **Idempotency store:** operation-scoped key and payload hash in PostgreSQL. Matching replays return one resource; mismatched reuse returns `409`.
- **Payment state machine:** explicit allowed transitions in `backend/src/payments/stateMachine.js`. Terminal states cannot jump back to success.
- **Risk engine:** deterministic, explainable rules for amount, velocity, customer profile, device risk, and injected decisions.
- **Router:** filters enabled providers by method and amount, then orders by priority, success rate, and latency.
- **Provider simulator:** separates declines, retryable infrastructure failures, pending responses, and ambiguous outcomes.
- **Authorization holds:** reduce available balance without posting a capture journal. Capture consumes the hold; failed authorization does neither.
- **Ledger:** balanced journals are checked before insertion. Capture, refund, chargeback, and settlement have their own entries.
- **Outbox:** domain event and outbox row commit with payment state. Publication later marks the row and pushes to Redis.
- **Webhooks:** HMAC-signed synthetic deliveries use independent retry/DLQ state. Notification failure never changes payment truth.
- **Settlement:** batches merchant obligations and calculates gross, refunds, 2% simulated fees, 18% tax on fees, and net.
- **Reconciliation:** checks journal balance, capture/refund invariants, and deliberately injected provider mismatches.
- **Mandates:** authorization, frequency, expiration, cancellation, and controlled recurring execution.
- **Disputes:** opens a dispute, simulates merchant win/loss, and posts a chargeback journal on loss.
- **Observability:** request-correlated Pino logs, audit records, dashboard metrics, and `/metrics` process metrics.

## API examples

Amounts are integer minor units (paise for INR). All identifiers and credentials are synthetic.

```bash
curl -X POST http://localhost:4000/api/payments \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: lab_test_key' \
  -H 'Idempotency-Key: tutorial-payment-1' \
  -d '{
    "merchantId":"mer_demo",
    "customerId":"cus_demo",
    "sourceAccountId":"acc_customer",
    "amount":500000,
    "currency":"INR",
    "method":"UPI",
    "scenario":{"providerBehavior":"LOST_RESPONSE"}
  }'
```

Use `POST /api/payments/:id/inquire` to resolve provider truth, `POST /api/payments/:id/capture`, `/refunds`, or `/disputes` for later lifecycle operations. API shapes are also easy to inspect in [the route module](backend/src/api/app.js).

## Tests

```bash
npm test
docker compose up -d postgres redis
npm run test:integration
```

Unit tests cover state transitions, risk, routing, provider outcome classification, deterministic retry delay, and ledger rejection. Integration tests exercise PostgreSQL transactions, Redis publication, concurrent idempotency, unknown resolution, capture journals, refunds, webhooks, settlement, and reconciliation.

## Documentation

- [Architecture guide](docs/ARCHITECTURE.md)
- [Payment lifecycle](docs/PAYMENT_LIFECYCLE.md)
- [Failure catalogue](docs/FAILURE_CATALOGUE.md)
- [Distributed systems guide](docs/DISTRIBUTED_SYSTEMS.md)
- [Financial systems guide](docs/FINANCIAL_SYSTEMS.md)
- [UPI-inspired flow](docs/UPI_INSPIRED_FLOW.md)

## Troubleshooting

- **App waits on startup:** run `docker compose ps`; both database health checks must pass.
- **Port already allocated:** change the host side of the relevant `ports` mapping.
- **No Redis queues:** create a payment, then click Publish outbox; committed database events remain safe if Redis is down.
- **No settlement candidates:** only captured payments whose ledger state is `PENDING_SETTLEMENT` qualify.
- **Payment is still unknown:** the chosen scenario deliberately supplied no provider truth. Run reconciliation or choose an inquiry outcome.
- **Old provider configuration:** seed values use `ON CONFLICT DO NOTHING`; use Operations or reset the Docker volumes.

## Known simplifications

Real systems use regulated participants, secure credential vaults/HSMs, PCI controls, network-specific message formats, clearing files, prefunded/nodal accounts, multi-region replication, stronger tenant isolation, durable high-throughput brokers, provider polling protocols, complex fee/GST rules, holiday calendars, FX, sanctions checks, manual case management, regulatory reporting, and disaster-recovery procedures. Switchyard intentionally does not implement those. Its provider network, bank core, webhook recipient, queue consumer, clearing obligations, and scheduler are local deterministic abstractions. IDs may vary across runs; scenario decisions and event paths do not.

Never enter a real PAN, VPA, bank account, secret, or personal financial credential into this lab.
