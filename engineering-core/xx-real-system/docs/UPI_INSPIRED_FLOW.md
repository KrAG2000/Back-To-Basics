# UPI-inspired flow

This is a local UPI-inspired teaching model, not UPI, NPCI, BHIM, or a bank connection.

```text
Payer (synthetic VPA)
  → merchant application
  → gateway / payer PSP abstraction
  → UPI-style provider route
  → network abstraction
  → payer-bank authorization
  → payee obligation
  → merchant notification
```

The payment ID is gateway identity. `provider_reference` is the synthetic rail reference. Customer and merchant financial accounts represent payer/payee relationships; `atlas_upi` and fallback routes represent PSP/network connectivity. No real VPA resolution or NPCI message format is used.

Supported educational cases include approval, insufficient funds, bank/provider unavailability, pending bank response, lost response after provider processing, unresolved network timeout, duplicate API requests, status inquiry, refund, settlement, and injected reconciliation mismatch.

The lost-response case is especially important:

1. the network/provider processes the payment;
2. the response never reaches the gateway;
3. the gateway records `UNKNOWN`, not `FAILED`;
4. a status inquiry uses provider truth and returns success;
5. the gateway posts capture exactly once and emits the later success event.

Real UPI includes participant certification, device binding, authentication/MPIN controls, signed/encrypted messages, transaction and reference-number rules, network timeouts/reversals, bank CBS integration, dispute workflows, risk controls, circulars, and regulatory obligations. None of those should be inferred from this simplified flow.
