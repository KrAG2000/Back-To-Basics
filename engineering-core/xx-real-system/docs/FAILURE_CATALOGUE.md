# Failure catalogue

Failures are inputs to a scenario, so the same input produces the same path.

| Injection | Location | Observable result | Recovery lesson |
|---|---|---|---|
| `risk: BLOCK` | risk engine | `DECLINED`, no route or journal | reject before touching funds |
| high amount/device/velocity | risk engine | explained score and review/block decision | deterministic signals are auditable |
| `INSUFFICIENT_FUNDS` | issuer | decline attempt, no hold | do not retry a deterministic decline |
| `PROVIDER_503` | provider | retryable failed attempt | use bounded backoff |
| `MALFORMED_RESPONSE` | integration | non-retryable failure | quarantine/break faulty integration |
| `PENDING` | bank/network | pending payment | poll or accept later callback |
| `LOST_RESPONSE` | return network | `UNKNOWN`, provider truth says processed | inquire before replay |
| `NETWORK_TIMEOUT` | network | unresolved `UNKNOWN` | reconcile when truth remains unavailable |
| webhook `[500,500,200]` | merchant endpoint | independent retries then delivery | notification does not define payment success |
| five webhook failures | worker | `DEAD_LETTER` | operator inspection and controlled replay |
| provider paused | router | provider excluded; fallback or `NO_ROUTE` | route by live eligibility |
| Redis unavailable | publisher | outbox persists; queue is unavailable | database transaction must not depend on broker availability |
| worker paused | operations config | backlog grows | scaling/restart drains durable work |
| reconciliation mismatch | provider record | mismatch report | compare independent systems rather than trusting one database |
| duplicate request | gateway/idempotency | one payment and journal | keys and request hashes make retries safe |
| different request, same key | gateway/idempotency | `409 IDEMPOTENCY_CONFLICT` | a key identifies one exact intent |
| concurrent duplicate | PostgreSQL uniqueness | one operation, one replay | serialize at the durable boundary |

The prompt's database deadlock, DNS, packet loss, stale cache, poison message, worker crash, and retry-storm cases are represented conceptually in Operations/documentation but not all are physically induced against Docker. Physically killing PostgreSQL or Redis is possible with Compose; payment safety relies on transaction rollback and the durable outbox. See the known simplifications in the README.
