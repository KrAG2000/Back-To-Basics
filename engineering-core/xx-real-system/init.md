You're right. The previous prompt was still describing a **payment-processing demo**, not a serious **payment-infrastructure simulator**.

If your goal is to learn how systems such as Razorpay/UPI/NPCI-scale payment infrastructure work, the prompt needs to explicitly require **payment rails, merchant/acquirer/issuer roles, routing, authorization, clearing, settlement, reconciliation, risk, ledgers, webhooks, callbacks, disputes, refunds, mandates, idempotency, failure recovery, observability, and the distinction between transaction state and money movement**.

One important correction: we should **not ask the implementation to claim it is a literal replica of Razorpay, BHIM, or NPCI's proprietary internal systems**. Their exact implementations aren't public. Instead, ask for a **realistic, production-inspired simulation based on publicly known payment-system architecture and standards**, with UPI-style flows and payment-gateway concepts.

Here's the stronger prompt I'd use:

# Build a Production-Inspired Payment Infrastructure Simulator

## 1. Objective

In the current folder, build a **full-stack, production-inspired payment infrastructure simulation platform** using **JavaScript, Node.js, PostgreSQL, Redis, Docker, and other appropriate open-source/self-hosted components**.

This is an **educational simulation**, not a real payment processor.

The goal is to build something substantially closer to the architecture and behavior of a modern payment platform used at large scale by companies such as payment gateways, banks, UPI participants, and payment networks.

The system should help a junior backend developer understand:

* how a payment actually moves through a payment ecosystem
* the difference between a payment gateway, payment processor, bank, issuer, acquirer, and payment network
* authorization vs capture vs settlement
* payment state machines
* transaction processing
* double-entry ledger concepts
* payment routing
* risk and fraud checks
* idempotency
* retries
* asynchronous processing
* message queues
* callbacks and webhooks
* reconciliation
* clearing and settlement
* refunds
* reversals
* disputes and chargebacks
* mandates
* recurring payments
* UPI-style payment flows
* transaction timeouts
* ambiguous/unknown payment outcomes
* network failures
* duplicate requests
* duplicate messages
* out-of-order events
* eventual consistency
* distributed transactions
* database consistency
* operational failures
* observability
* financial correctness

The final application should function as an **interactive payment-systems laboratory**.

It should allow me to deliberately create normal and abnormal payment situations and observe exactly how the system behaves.

---

# 2. Important Scope Clarification

Do **not** attempt to reproduce the proprietary internal implementation of Razorpay, BHIM, NPCI, banks, or any other private payment company.

Instead, build a **realistic reference architecture inspired by publicly known payment-system concepts, UPI-style flows, payment-gateway architecture, banking systems, and industry-standard distributed-system patterns**.

The implementation should explicitly document which components are:

1. realistic industry concepts,
2. simplified simulations,
3. abstractions introduced for educational purposes.

Do not falsely claim that the simulator is an exact copy of any company's internal infrastructure.

---

# 3. Technology Requirements

Use **JavaScript, not TypeScript**.

### Backend

Use:

* Node.js
* JavaScript
* Express, Fastify, or another appropriate Node.js framework
* PostgreSQL
* Redis
* Docker
* Docker Compose

Use additional open-source infrastructure when it adds genuine educational value.

Potential components include:

* RabbitMQ
* Kafka/Redpanda
* PostgreSQL
* Redis
* Prometheus
* Grafana
* OpenTelemetry
* Jaeger
* Nginx
* MinIO

Do not add infrastructure simply for the sake of having more technologies.

Every component must have a documented purpose.

The system should remain easy to run locally.

---

# 4. High-Level Architecture

Build the simulation around a realistic payment ecosystem.

At a conceptual level:

```text
                         CLIENT
                           |
                           v
                    API / PAYMENT GATEWAY
                           |
                +----------+----------+
                |                     |
                v                     v
          Payment Service       Authentication
                |
                v
        Payment Orchestrator
                |
      +---------+---------+
      |         |         |
      v         v         v
   Risk      Router     Idempotency
   Engine      |          Store
               |
       +-------+-------+
       |       |       |
       v       v       v
    Bank A   Bank B   UPI Simulator
       |       |       |
       +-------+-------+
               |
               v
        Payment Network
          / Clearing
               |
               v
        Settlement System
               |
               v
          Reconciliation
               |
               v
            Ledger
```

The exact implementation may differ, but the conceptual separation should be maintained.

---

# 5. Payment Ecosystem Actors

The simulator must model the major actors involved in modern payment systems.

At minimum:

### Customer / Payer

The person initiating the payment.

### Merchant / Payee

The entity receiving the payment.

### Merchant Application

The application requesting payment processing.

### Payment Gateway

The system accepting and orchestrating payment requests.

### Payment Processor

The system communicating with payment rails/providers.

### Acquirer

The institution/service responsible for acquiring transactions for the merchant.

### Issuer

The institution responsible for the customer's account/payment instrument.

### Payment Network

A simulated network connecting participating financial institutions.

### Bank

Simulated banks that maintain customer accounts and process transactions.

### UPI-style ecosystem

Model concepts such as:

* payer
* payee
* PSP
* bank
* network
* VPA/UPI ID
* transaction ID
* reference ID
* request/response flow

The implementation should clearly explain the difference between these actors.

---

# 6. Payment Instruments

Support multiple simulated payment methods.

At minimum:

* card
* bank account
* UPI-style payment
* wallet
* net banking
* recurring/mandate-based payment

Do not store real financial credentials.

All payment credentials must be synthetic.

For cards, use generated test identities rather than real PANs.

For UPI, use synthetic VPAs.

---

# 7. Payment Lifecycle

Implement a proper payment state machine.

Possible states include:

```text
CREATED
INITIATED
VALIDATING
RISK_CHECK
ROUTING
PROCESSING
PENDING
AUTHORIZED
CAPTURED
SUCCESS
FAILED
DECLINED
TIMEOUT
UNKNOWN
CANCELLED
EXPIRED
REVERSED
REFUND_PENDING
PARTIALLY_REFUNDED
REFUNDED
DISPUTED
CHARGEBACK
SETTLED
RECONCILIATION_PENDING
RECONCILIATION_FAILED
```

Do not allow arbitrary state transitions.

Define valid transitions explicitly.

For example:

```text
CREATED
   ↓
INITIATED
   ↓
VALIDATING
   ↓
RISK_CHECK
   ↓
ROUTING
   ↓
PROCESSING
   ↓
AUTHORIZED
   ↓
CAPTURED
   ↓
SUCCESS
   ↓
SETTLEMENT
   ↓
SETTLED
```

The simulator should also model exceptional paths.

---

# 8. Authorization, Capture, Clearing and Settlement

Do not treat payment success as one operation.

Explicitly model:

### Authorization

The issuer confirms that the transaction can proceed.

### Capture

The merchant/payment processor requests the actual capture of the authorized amount.

### Clearing

Transaction information is exchanged and financial obligations are calculated.

### Settlement

Actual simulated financial balances are moved between participants.

### Reconciliation

Independent records are compared to detect mismatches.

The UI must make these stages visible.

---

# 9. Double-Entry Ledger

This is a critical component.

Build a simplified but correct **double-entry ledger**.

Every financial movement must have balanced entries.

For example:

```text
Merchant Receivable      +100
Customer Account        -100
```

The ledger should enforce:

```text
Total Debits = Total Credits
```

Support:

* accounts
* balances
* ledger entries
* transaction IDs
* journal entries
* debit
* credit
* holds
* releases
* settlement entries
* refund entries
* reversal entries

The payment status and ledger state must be treated as separate concepts.

For example:

```text
Payment = SUCCESS
Ledger  = PENDING_SETTLEMENT
```

should be possible.

---

# 10. Authorization Holds

Simulate temporary holds.

Example:

```text
Customer Balance: 10,000
Payment:          2,000

Available Balance:
8,000

Held Amount:
2,000
```

If authorization fails:

```text
Hold → Released
```

If captured:

```text
Hold → Captured
```

Simulate:

* hold expiration
* duplicate holds
* failed capture
* partial capture
* reversal of hold

---

# 11. Payment Routing

Create a payment-routing engine.

Given a payment request, the router should determine which simulated route to use.

Routing factors can include:

* payment method
* bank
* currency
* amount
* country
* provider availability
* provider success rate
* latency
* transaction limits
* merchant configuration
* risk score

Example:

```text
Payment
   |
   v
Router
   |
   +---- Provider A
   |
   +---- Provider B
   |
   +---- Provider C
```

Allow routing rules to be changed from the dashboard.

---

# 12. Risk and Fraud Engine

Build a deterministic risk simulator.

It should evaluate signals such as:

* transaction amount
* transaction frequency
* account age
* merchant risk
* velocity
* repeated failures
* suspicious patterns
* geographic mismatch
* unusual payment method
* simulated device risk

Return:

```text
LOW_RISK
MEDIUM_RISK
HIGH_RISK
BLOCKED
REVIEW_REQUIRED
```

The risk engine should explain why a decision was made.

Do not build a real fraud model.

This is a deterministic educational simulation.

---

# 13. UPI-Style Simulation

Build a simplified UPI-inspired flow.

The simulator should model concepts such as:

```text
Payer
  ↓
PSP
  ↓
UPI-style Network
  ↓
Payer Bank
  ↓
UPI-style Network
  ↓
Payee Bank
  ↓
Payee
```

Include synthetic:

* UPI ID/VPA
* transaction ID
* reference ID
* payer account
* payee account
* bank response
* network response

Support scenarios such as:

* successful transaction
* payer bank failure
* payee bank failure
* network timeout
* timeout with unknown outcome
* duplicate transaction
* retry
* reversal
* pending transaction
* delayed response
* reconciliation mismatch

Document that this is a **UPI-inspired simulation**, not a connection to the real UPI/NPCI network.

---

# 14. Queue and Worker Architecture

Implement a realistic asynchronous processing system.

```text
Publisher
    ↓
Message Broker
    ↓
Queue
    ↓
Worker Pool
    ↓
Processing
```

Workers should handle:

* payment processing
* webhook delivery
* notifications
* reconciliation
* settlement
* fraud analysis
* retries
* cleanup

Simulate:

* worker crash
* worker restart
* duplicate message
* poison message
* queue backlog
* consumer lag
* retry storm
* dead-letter queue
* worker scaling

---

# 15. Event-Driven Architecture

Introduce domain events.

Examples:

```text
PaymentCreated
PaymentValidated
RiskCheckCompleted
PaymentRouted
AuthorizationRequested
AuthorizationSucceeded
AuthorizationFailed
CaptureRequested
CaptureSucceeded
PaymentSucceeded
PaymentFailed
RefundRequested
RefundCompleted
SettlementStarted
SettlementCompleted
WebhookCreated
WebhookDelivered
ReconciliationStarted
ReconciliationMismatchDetected
```

Every event should contain:

* event ID
* aggregate/payment ID
* event type
* timestamp
* correlation ID
* causation ID
* version
* payload

---

# 16. Outbox Pattern

Implement an educational version of the outbox pattern.

Demonstrate the problem:

```text
Database transaction succeeds
        +
Message publishing fails
```

Then show how the outbox pattern prevents event loss.

The UI should allow me to inspect:

* database transaction
* outbox entry
* publisher
* message broker
* consumer
* final event

---

# 17. Idempotency

Implement idempotency throughout the system.

Support:

* idempotent payment creation
* idempotent capture
* idempotent refund
* idempotent webhook processing
* idempotent workers

Demonstrate:

```text
Request A
Request A retry
Request A retry
Request A retry

        ↓

ONE financial operation
```

Also simulate:

* same key + same request
* same key + different request
* concurrent duplicate requests
* missing key

---

# 18. Unknown Payment Outcomes

This must be a first-class concept.

Simulate:

```text
Merchant → Provider
Provider → Successfully processes payment
Provider → Merchant response
        X
Network failure
```

The merchant does not know whether the payment succeeded.

The system must represent:

```text
UNKNOWN
```

instead of incorrectly marking the payment as failed.

Then implement:

```text
Status Inquiry
        ↓
Provider
        ↓
Confirmed SUCCESS
```

or:

```text
Status Inquiry
        ↓
Provider
        ↓
Still UNKNOWN
        ↓
Reconciliation
```

This is one of the most important concepts in payment systems.

---

# 19. Retry Strategy

Implement configurable retry strategies:

* no retry
* immediate retry
* fixed delay
* exponential backoff
* exponential backoff + jitter

Classify errors as:

```text
RETRYABLE
NON_RETRYABLE
UNKNOWN
```

Examples:

```text
Insufficient funds → NON_RETRYABLE

Provider timeout → RETRYABLE

Network timeout → UNKNOWN / potentially retryable

Invalid request → NON_RETRYABLE

Provider 503 → RETRYABLE
```

Do not blindly retry every failure.

---

# 20. Webhook System

Implement merchant webhooks.

Support:

* successful delivery
* timeout
* 4xx
* 5xx
* connection failure
* duplicate webhook
* delayed webhook
* out-of-order webhook
* retry
* dead-letter webhook

Include webhook signatures and verification concepts.

---

# 21. Refunds, Reversals and Chargebacks

Implement:

### Full refund

### Partial refund

### Refund failure

### Refund retry

### Payment reversal

### Authorization reversal

### Dispute

### Chargeback

### Chargeback reversal/win/loss simulation

Clearly explain the difference between these concepts.

---

# 22. Recurring Payments and Mandates

Build a simplified mandate system.

Support:

* mandate creation
* mandate authorization
* scheduled payment
* recurring payment
* mandate cancellation
* mandate expiration
* payment failure
* retry
* insufficient funds
* mandate violation

The scheduler should be simulated and controllable from the dashboard.

---

# 23. Settlement System

Build a simulated settlement engine.

It should calculate:

* gross transaction value
* refunds
* reversals
* fees
* taxes
* net settlement
* settlement amount

Example:

```text
Gross Payments       100,000
Refunds                5,000
Fees                   1,000
Taxes                    180
--------------------------------
Net Settlement         93,820
```

Support settlement batches.

Example:

```text
Settlement Batch #1024

Transactions: 1,245
Gross:        ₹10,00,000
Refunds:      ₹20,000
Fees:         ₹8,000
Net:          ₹9,72,000
```

Use simulated currency values only.

---

# 24. Reconciliation Engine

Implement reconciliation between:

```text
Internal Payment DB
        ↕
Ledger
        ↕
Provider Records
        ↕
Bank/Network Records
        ↕
Settlement Records
```

Detect:

* missing transactions
* duplicate transactions
* amount mismatch
* status mismatch
* settlement mismatch
* refund mismatch
* ledger imbalance

The system should generate reconciliation reports.

---

# 25. Failure Injection Framework

Create a centralized failure-injection engine.

Failures should be configurable by component.

### API

* validation failure
* authentication failure
* rate limiting

### Network

* timeout
* latency
* connection reset
* DNS failure
* packet loss

### Database

* connection failure
* timeout
* deadlock
* transaction rollback
* constraint violation

### Redis

* unavailable
* timeout
* stale data

### Queue

* broker unavailable
* delayed message
* duplicate message
* lost message simulation
* consumer failure
* backlog

### Payment Provider

* decline
* timeout
* 4xx
* 5xx
* malformed response
* slow response
* unavailable

### Bank

* insufficient funds
* account blocked
* bank unavailable
* delayed response

### Webhook

* timeout
* 4xx
* 5xx
* duplicate
* out-of-order

---

# 26. Frontend

Build a serious operational dashboard rather than a simple CRUD interface.

## Overview Dashboard

Display:

* total transactions
* success rate
* failure rate
* decline rate
* pending transactions
* unknown transactions
* refund rate
* chargeback rate
* average latency
* p50 latency
* p95 latency
* p99 latency
* provider success rate
* queue depth
* worker throughput
* reconciliation mismatches
* settlement amount

---

# 27. Payment Explorer

Allow the user to search for a payment and inspect:

```text
Payment
 ↓
Attempt
 ↓
Risk
 ↓
Routing
 ↓
Authorization
 ↓
Capture
 ↓
Ledger
 ↓
Events
 ↓
Webhooks
 ↓
Settlement
 ↓
Reconciliation
```

Every stage should be inspectable.

---

# 28. Transaction Timeline

Display a complete timeline:

```text
12:00:01 Payment Created
12:00:01 Validation Passed
12:00:01 Risk Check Started
12:00:02 Risk Check Passed
12:00:02 Provider Selected
12:00:02 Authorization Requested
12:00:07 Provider Timeout
12:00:07 Transaction Marked UNKNOWN
12:00:09 Status Inquiry Started
12:00:10 Provider Confirmed SUCCESS
12:00:10 Payment Captured
12:00:11 Ledger Updated
12:00:11 Webhook Queued
12:00:12 Webhook Delivered
```

---

# 29. Simulation Control Center

Create an interface where I can construct scenarios.

For example:

```text
Payment Amount: ₹5,000

Payment Method:
[ UPI ]

Provider:
[ Automatic Routing ]

Risk:
[ Normal ]

Network:
[ Provider Timeout ]

Retry:
[ Exponential Backoff ]

Worker:
[ Normal ]

Webhook:
[ 500 → 500 → 200 ]

Run Simulation
```

Also provide predefined scenarios.

---

# 30. Architecture Visualization

Create a visual representation of the system.

During a transaction, components should visibly activate:

```text
Client
  ↓
Gateway
  ↓
Payment Service
  ↓
Risk
  ↓
Router
  ↓
Provider
  ↓
Bank
  ↓
Ledger
  ↓
Queue
  ↓
Worker
  ↓
Webhook
  ↓
Settlement
```

Failures should be visually obvious.

For example:

```text
Provider
   |
   X TIMEOUT
   |
   ↓
Retry Worker
```

---

# 31. Logs and Observability

Implement structured logs.

Each log should include:

* timestamp
* service
* component
* payment ID
* transaction ID
* event ID
* request ID
* correlation ID
* severity
* error code
* retry count
* message

Provide log filtering and search.

---

# 32. Metrics

Track at minimum:

### Business metrics

* TPV / simulated transaction volume
* number of payments
* success rate
* decline rate
* failure rate
* refund rate
* chargeback rate
* settlement value

### Technical metrics

* request latency
* provider latency
* queue latency
* worker throughput
* consumer lag
* retry rate
* error rate
* database latency
* cache hit ratio

### Reliability metrics

* availability
* timeout rate
* unknown outcome rate
* reconciliation mismatch rate
* webhook delivery success
* duplicate event rate

---

# 33. Security Simulation

Demonstrate:

* authentication
* authorization
* API keys
* rate limiting
* request validation
* secret management
* webhook signatures
* sensitive-data masking
* audit logs

Never expose simulated credentials unnecessarily.

Never use real financial credentials.

---

# 34. Admin / Operations Console

Create an operational console allowing me to:

* pause a provider
* disable a bank
* increase provider latency
* force failures
* change retry policies
* stop workers
* restart workers
* pause queues
* create queue backlogs
* enable/disable Redis
* trigger reconciliation
* trigger settlement
* inspect dead-letter queues
* inspect failed webhooks
* inspect unknown transactions

This should make the system useful as a learning environment.

---

# 35. Scenario Library

Create a comprehensive scenario library categorized into:

### Normal flows

* successful card payment
* successful UPI-style payment
* successful bank transfer
* successful wallet payment
* successful refund
* successful recurring payment

### Customer failures

* insufficient funds
* expired payment method
* invalid payment method
* transaction limit exceeded
* blocked account

### Infrastructure failures

* API timeout
* database timeout
* Redis failure
* queue failure
* worker crash
* provider timeout
* provider unavailable

### Distributed-system failures

* duplicate message
* duplicate request
* lost response
* out-of-order events
* stale cache
* race condition
* retry storm
* consumer lag

### Financial failures

* ledger mismatch
* settlement mismatch
* reconciliation mismatch
* duplicate debit
* missing credit
* refund mismatch

### Integration failures

* webhook timeout
* webhook 500
* webhook duplicate
* provider malformed response
* provider status mismatch

### Risk failures

* fraud block
* velocity violation
* suspicious transaction
* manual review

---

# 36. Educational Explanations

Every major component must have an educational explanation.

For example:

## What is an LRU cache?

Explain:

* definition
* why it exists
* implementation
* complexity
* real-world usage
* limitations
* distributed-system implications

## What is a queue?

Explain:

* producer
* consumer
* worker
* acknowledgement
* retry
* DLQ
* scaling
* failure modes

Apply this principle to all major concepts.

---

# 37. Testing Requirements

Write automated tests for:

* payment state transitions
* idempotency
* duplicate requests
* concurrent requests
* authorization
* capture
* refunds
* ledger balancing
* retries
* queue behavior
* worker failure
* webhook retries
* reconciliation
* settlement
* failure injection

Include integration tests involving PostgreSQL and Redis.

---

# 38. Docker Environment

Provide a Docker Compose environment containing appropriate infrastructure.

Potential services:

```text
frontend
backend
postgres
redis
rabbitmq
prometheus
grafana
jaeger
minio
```

Only include services actually used by the application.

The entire simulation should be runnable locally without any external cloud dependency.

---

# 39. Documentation

Create detailed documentation:

### README

* architecture
* setup
* running
* testing
* troubleshooting

### Architecture Guide

Explain every component and why it exists.

### Payment Lifecycle Guide

Explain the complete payment flow.

### Failure Catalogue

Document every implemented failure scenario.

### Distributed Systems Guide

Explain:

* queues
* workers
* retries
* idempotency
* eventual consistency
* outbox
* reconciliation

### Financial Systems Guide

Explain:

* ledger
* authorization
* capture
* clearing
* settlement
* refunds
* reversals
* chargebacks

### UPI-Inspired Flow Guide

Explain the simulated participants and message flow.

---

# 40. Code Organization

Keep the backend modular and understandable.

A possible structure:

```text
backend/
├── src/
│   ├── api/
│   ├── payments/
│   ├── ledger/
│   ├── routing/
│   ├── risk/
│   ├── providers/
│   ├── banks/
│   ├── network/
│   ├── settlement/
│   ├── reconciliation/
│   ├── refunds/
│   ├── disputes/
│   ├── mandates/
│   ├── webhooks/
│   ├── events/
│   ├── queues/
│   ├── workers/
│   ├── idempotency/
│   ├── simulation/
│   ├── observability/
│   └── database/
│
├── tests/
└── package.json
```

Adapt the structure if a better architecture emerges.

---

# 41. Important Engineering Principle

Do not build a collection of fake screens.

The simulation must have **real interactions between components**.

For example, if a provider timeout is selected:

```text
Frontend
   ↓
Backend
   ↓
Payment Orchestrator
   ↓
Provider Simulator
   ↓
Timeout
   ↓
Payment becomes UNKNOWN
   ↓
Retry/Status Inquiry
   ↓
Provider Simulator
   ↓
Result
   ↓
Ledger
   ↓
Event
   ↓
Queue
   ↓
Worker
   ↓
Webhook
   ↓
Reconciliation
```

The dashboard must show what actually happened in the backend.

---

# 42. Determinism

The simulator must be deterministic.

Every scenario should explicitly define:

```text
initial state
failure injection
provider behavior
network behavior
retry policy
worker behavior
expected events
expected final state
```

If randomness is introduced, it must be optional and seedable.

The same seed and scenario must produce the same result.

---

# 43. Realism Over Feature Count

Do not add meaningless components just to make the architecture look complicated.

Every component must answer:

> “What real payment-system problem does this component solve?”

If a component cannot answer that question, do not add it.

The purpose is to learn **why payment systems are architected this way**, not to collect technologies.

---

# 44. Final Acceptance Criteria

The project is complete only when I can:

1. Start the entire system locally with Docker.
2. Open the frontend dashboard.
3. Create a synthetic customer.
4. Create a synthetic merchant.
5. Create synthetic bank accounts/payment methods.
6. Initiate a payment.
7. Watch the entire payment lifecycle.
8. See routing decisions.
9. See risk decisions.
10. See authorization.
11. See capture.
12. See ledger entries.
13. See events.
14. See queue activity.
15. See worker activity.
16. See webhook delivery.
17. See settlement.
18. Run reconciliation.
19. Trigger failures deliberately.
20. Observe retries.
21. Observe unknown outcomes.
22. Observe duplicate requests.
23. Observe race conditions.
24. Observe webhook failures.
25. Observe provider failures.
26. Observe database/queue/worker failures.
27. Inspect logs.
28. Inspect metrics.
29. Inspect transaction history.
30. Inspect reconciliation mismatches.
31. Execute refunds.
32. Execute reversals.
33. Simulate disputes/chargebacks.
34. Simulate recurring payments/mandates.
35. Understand exactly why each scenario produced its final state.

---

# 45. Final Deliverable

The final result should feel like a **miniature payment infrastructure platform**, not a checkout demo.

It should combine:

```text
Payment Gateway
        +
Payment Processor
        +
UPI-inspired Network
        +
Banks
        +
Risk Engine
        +
Payment Router
        +
Ledger
        +
Queue
        +
Workers
        +
Webhooks
        +
Settlement
        +
Reconciliation
        +
Refunds
        +
Disputes
        +
Mandates
        +
Observability
        +
Failure Injection
        +
Interactive Dashboard
```

The primary objective is educational:

> **I should be able to use this application to learn how a large-scale payment system works, deliberately break individual components, observe the resulting behavior, understand how production systems handle those failures, and gradually build an intuition for backend architecture, distributed systems, reliability, and financial consistency.**

Add a readme file that provides a concise architecture summary, setup instructions, a component-by-component explanation, a complete scenario catalogue, and a list of known simplifications compared with real-world systems.
