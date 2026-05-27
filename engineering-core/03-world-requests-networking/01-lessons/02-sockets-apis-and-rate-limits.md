# Sockets, APIs, and Rate Limits

Protocols are agreements.

Sockets give you a communication primitive.
HTTP gives you a structured request-response contract on top.
Rate limiting protects shared capacity.

## What to Know

- blocking vs non-blocking I/O
- request parsing and framing
- idempotent vs non-idempotent actions
- why retries can be helpful and dangerous
- common rate-limiting shapes: fixed window, sliding window, token bucket
