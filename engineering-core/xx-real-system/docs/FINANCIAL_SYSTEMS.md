# Financial systems guide

## Authorization and hold

Authorization asks the issuer whether the payment may proceed. The lab increments `held_amount`, reducing `balance - held_amount`. This is a reservation, not a captured ledger movement. Expiry or reversal releases the reservation. Capture consumes it.

## Double-entry ledger

Every journal's debit sum must equal its credit sum. Switchyard rejects a journal before writing if it is unbalanced.

```text
Capture ₹100
  Debit  CUSTOMER_FUNDS      ₹100
  Credit MERCHANT_PAYABLE    ₹100

Refund ₹20
  Debit  MERCHANT_PAYABLE     ₹20
  Credit CUSTOMER_FUNDS       ₹20
```

Account-code labels are educational control accounts, not a full chart of accounts. The financial account table supplies intuitive synthetic balances; ledger entries supply the accounting audit trail.

## Clearing and settlement

Capture establishes an obligation. Clearing is the exchange/comparison of transaction information and net obligations; this lab represents it as the set of captured, unsettled records. Settlement groups those records:

```text
gross captured
− completed refunds
− 2% simulated platform fee
− 18% simulated tax on that fee
= merchant net
```

A settlement journal debits merchant payable and credits merchant bank, platform fee revenue, and tax payable. The rates are teaching constants, not tax or pricing advice.

## Refund, reversal, dispute, chargeback

- **Refund:** merchant-initiated return after capture; full or partial.
- **Authorization reversal:** release an unused hold before capture.
- **Payment reversal:** undo a transaction when processing failed after an issuer-side action.
- **Dispute:** a customer's contested-payment case; money need not move when opened.
- **Chargeback:** forced return after the dispute is decided against the merchant; it posts a separate journal.

Switchyard implements refunds and dispute win/loss journals. Hold expiry and reversal are represented in the schema/state model but do not yet have a background expiry endpoint.

## Reconciliation

Reconciliation is not the ledger. It independently compares payment status, captured/refunded totals, provider assertions, settlement eligibility, and journal balance. A mismatch becomes an operator report; it should not be silently “fixed” without establishing authoritative evidence.
