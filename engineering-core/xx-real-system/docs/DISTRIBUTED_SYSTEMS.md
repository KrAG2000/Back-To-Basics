# Distributed systems guide

## Queue vocabulary

A producer publishes a durable fact. A broker stores or forwards it. A consumer receives it, and a worker performs application work. Acknowledgement tells the broker that the work completed. Retry reschedules recoverable work; a dead-letter queue isolates work that repeatedly fails.

Switchyard commits an outbox row with the payment, then publishes it to a Redis list topic. This demonstrates the database/broker dual-write problem:

```text
Without outbox: DB commit ✓  broker publish ✗  → event silently lost
With outbox:    DB + outbox commit ✓          → publisher retries later
```

Production Redis Streams, RabbitMQ, or Kafka would provide stronger delivery/retention semantics. Financial consumers must still be idempotent because at-least-once delivery always permits duplicates.

## Idempotency and concurrency

The operation and key form a unique database key. The first transaction stores a SHA-256 request hash. A concurrent insert conflicts and waits for the first transaction; it then replays the stored response. Reusing the key with a changed payload is rejected. Capture and refund have separate scopes so the same textual key cannot confuse operation types.

## Ordering and eventual consistency

Aggregate versions and causation IDs expose event order. Downstream webhooks can be late or duplicated, so merchants should use event IDs for deduplication and query current payment state rather than assuming arrival order equals business order. Payment, queue, webhook, and settlement views become consistent at different times by design.

## Unknown outcomes

Timeout is transport information, not business truth. If the provider committed and the response vanished, retrying the financial instruction may duplicate it. Switchyard stores provider truth on the attempt and uses an inquiry endpoint. If truth is still absent, reconciliation is safer than guessing.

## Cache note

Redis is not used as payment truth or an idempotency authority. This avoids stale cache decisions on money. A production cache can accelerate reference/config reads, but invalidation, TTL, and fail-open/fail-closed behavior must be designed per datum.

## Retry strategy

Exponential backoff prevents a damaged provider from receiving an immediate retry storm. Jitter prevents synchronized clients from retrying at identical times. Maximum attempts and error classification are mandatory; retries are not a substitute for inquiry or reconciliation.
