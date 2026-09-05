# Architecture guide

## Boundaries and responsibilities

The gateway accepts merchant intent but does not itself decide issuer truth. The orchestrator moves a payment through validation, risk, routing, and provider processing. PostgreSQL owns durable state. Redis makes asynchronous publication inspectable. Ledger, settlement, and reconciliation are deliberately separate because each answers a different question:

| Record | Question answered |
|---|---|
| Payment | What does the gateway currently believe happened? |
| Provider attempt | What request/response was observed on one route? |
| Hold | How much customer funding is reserved but not captured? |
| Journal | What financial movement was booked? |
| Outbox/event | What durable fact should downstream consumers learn? |
| Webhook | Has the merchant been notified? |
| Settlement | What net obligation was paid to the merchant? |
| Reconciliation | Do independent records agree? |

These records can temporarily disagree without corrupting one another. For example, payment `SUCCESS` with ledger `PENDING_SETTLEMENT` is expected. A delivered webhook is not proof of settlement.

## Data consistency

Payment state, account hold, journal, domain event, and outbox insertion share one PostgreSQL transaction. Row locks serialize mutation of a payment or funding account. Database uniqueness protects idempotency and duplicate holds. The asynchronous publisher locks pending rows with `FOR UPDATE SKIP LOCKED`, allowing multiple workers without double-claiming the same batch.

The current Redis transport is intentionally an educational list-per-topic rather than Kafka or RabbitMQ. PostgreSQL outbox state is authoritative; Redis loss can be recovered by republishing pending rows. Production consumers would add durable acknowledgements, consumer identities, retention, partitions, and inbox/deduplication tables.

## Security model

The API demonstrates authentication (`X-API-Key`), authorization boundary, Zod validation, rate limiting, request IDs, log redaction, synthetic credentials, HMAC webhook signatures, and audit logs. The lab key is intentionally public for local use. This is not a production identity system and should never face the public internet.

## Component purpose

Every deployed service has a reason:

- Node/Express runs orchestration, APIs, workers, dashboard, structured logs, and Prometheus exposition.
- PostgreSQL supplies transactions, constraints, row locks, JSON event payloads, and financial persistence.
- Redis visualizes fast asynchronous handoff and queue depth. It is not the financial system of record.

Adding Kafka, Grafana, Jaeger, MinIO, or Nginx would add local weight without improving this lab's core lesson, so they are not required. `/metrics` is ready for an optional Prometheus scraper.

## Source layout

```text
backend/src/
  api/             HTTP boundary
  database/        schema and transaction helpers
  payments/        orchestration and state machine
  risk/ routing/   deterministic decisions
  providers/       synthetic rail behavior
  ledger/          balanced journal invariant
  events/          domain events and outbox publisher
  refunds/         post-payment return of funds
  disputes/        chargeback lifecycle
  mandates/        recurring authorization
  settlement/      batching and reconciliation
  operations/      scenarios, metrics, workers, controls
frontend/          dependency-free operational dashboard
backend/tests/     unit and real-infrastructure tests
```
