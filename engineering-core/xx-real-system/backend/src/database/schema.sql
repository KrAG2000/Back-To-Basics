CREATE TABLE IF NOT EXISTS actors (
  id text PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('CUSTOMER','MERCHANT')),
  name text NOT NULL,
  email text,
  risk_level text NOT NULL DEFAULT 'LOW',
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS financial_accounts (
  id text PRIMARY KEY,
  actor_id text REFERENCES actors(id),
  account_type text NOT NULL,
  currency char(3) NOT NULL DEFAULT 'INR',
  balance bigint NOT NULL DEFAULT 0,
  held_amount bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ACTIVE',
  synthetic_identifier text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (balance >= 0),
  CHECK (held_amount >= 0),
  CHECK (held_amount <= balance)
);

CREATE TABLE IF NOT EXISTS payments (
  id text PRIMARY KEY,
  merchant_id text NOT NULL REFERENCES actors(id),
  customer_id text NOT NULL REFERENCES actors(id),
  source_account_id text NOT NULL REFERENCES financial_accounts(id),
  amount bigint NOT NULL CHECK (amount > 0),
  currency char(3) NOT NULL DEFAULT 'INR',
  method text NOT NULL,
  status text NOT NULL,
  ledger_state text NOT NULL DEFAULT 'NOT_STARTED',
  capture_method text NOT NULL DEFAULT 'AUTOMATIC',
  captured_amount bigint NOT NULL DEFAULT 0,
  refunded_amount bigint NOT NULL DEFAULT 0,
  provider text,
  provider_reference text,
  risk jsonb,
  routing jsonb,
  scenario jsonb NOT NULL DEFAULT '{}',
  correlation_id text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_status_idx ON payments(status);
CREATE INDEX IF NOT EXISTS payments_created_idx ON payments(created_at DESC);

CREATE TABLE IF NOT EXISTS payment_attempts (
  id text PRIMARY KEY,
  payment_id text NOT NULL REFERENCES payments(id),
  provider text NOT NULL,
  status text NOT NULL,
  error_class text,
  error_code text,
  latency_ms integer NOT NULL DEFAULT 0,
  request jsonb NOT NULL DEFAULT '{}',
  response jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS holds (
  id text PRIMARY KEY,
  payment_id text NOT NULL REFERENCES payments(id),
  account_id text NOT NULL REFERENCES financial_accounts(id),
  amount bigint NOT NULL,
  status text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(payment_id, account_id)
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id text PRIMARY KEY,
  payment_id text REFERENCES payments(id),
  kind text NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id text PRIMARY KEY,
  journal_id text NOT NULL REFERENCES journal_entries(id),
  account_code text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('DEBIT','CREDIT')),
  amount bigint NOT NULL CHECK (amount > 0),
  currency char(3) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS domain_events (
  id text PRIMARY KEY,
  aggregate_id text NOT NULL,
  event_type text NOT NULL,
  correlation_id text NOT NULL,
  causation_id text,
  version integer NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS outbox (
  id text PRIMARY KEY,
  event_id text NOT NULL UNIQUE REFERENCES domain_events(id),
  topic text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  attempts integer NOT NULL DEFAULT 0,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  scope text NOT NULL,
  idempotency_key text NOT NULL,
  request_hash text NOT NULL,
  response jsonb,
  resource_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(scope, idempotency_key)
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id text PRIMARY KEY,
  payment_id text REFERENCES payments(id),
  event_id text REFERENCES domain_events(id),
  url text NOT NULL,
  status text NOT NULL,
  response_code integer,
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz,
  signature text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refunds (
  id text PRIMARY KEY,
  payment_id text NOT NULL REFERENCES payments(id),
  amount bigint NOT NULL,
  status text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settlements (
  id text PRIMARY KEY,
  merchant_id text NOT NULL REFERENCES actors(id),
  status text NOT NULL,
  gross bigint NOT NULL,
  refunds bigint NOT NULL,
  fees bigint NOT NULL,
  taxes bigint NOT NULL,
  net bigint NOT NULL,
  payment_ids jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reconciliation_reports (
  id text PRIMARY KEY,
  status text NOT NULL,
  checked_count integer NOT NULL,
  mismatches jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mandates (
  id text PRIMARY KEY,
  customer_id text NOT NULL REFERENCES actors(id),
  merchant_id text NOT NULL REFERENCES actors(id),
  source_account_id text NOT NULL REFERENCES financial_accounts(id),
  amount bigint NOT NULL,
  frequency text NOT NULL,
  status text NOT NULL,
  next_run_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS disputes (
  id text PRIMARY KEY,
  payment_id text NOT NULL REFERENCES payments(id),
  amount bigint NOT NULL,
  reason text NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id bigserial PRIMARY KEY,
  action text NOT NULL,
  actor text NOT NULL,
  resource_id text,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
