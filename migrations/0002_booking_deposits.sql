CREATE TABLE IF NOT EXISTS appointment_deposits (
  id TEXT PRIMARY KEY,
  appointment_id TEXT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'MYR',
  status TEXT NOT NULL CHECK (status IN ('required', 'pending', 'paid', 'waived', 'refunded', 'failed')) DEFAULT 'pending',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('fpx', 'card', 'ewallet', 'counter')) DEFAULT 'fpx',
  provider_reference TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_appointment_deposits_appointment ON appointment_deposits(appointment_id, status);
CREATE INDEX IF NOT EXISTS idx_appointment_deposits_branch_status ON appointment_deposits(branch_id, status, created_at);

CREATE TRIGGER IF NOT EXISTS appointment_deposits_set_updated_at
AFTER UPDATE ON appointment_deposits
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE appointment_deposits SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;
