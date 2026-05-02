PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  registration_number TEXT,
  phone TEXT,
  email TEXT,
  address_json TEXT NOT NULL DEFAULT '{}',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kuala_Lumpur',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  external_ref TEXT,
  full_name TEXT NOT NULL,
  preferred_name TEXT,
  national_id_last4 TEXT,
  date_of_birth TEXT,
  sex TEXT CHECK (sex IN ('female', 'male', 'other', 'unknown') OR sex IS NULL),
  phone_e164 TEXT,
  email TEXT,
  address_json TEXT NOT NULL DEFAULT '{}',
  emergency_contact_json TEXT NOT NULL DEFAULT '{}',
  consent_pdpa_at TEXT,
  consent_marketing_at TEXT,
  privacy_notice_version TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deceased', 'merged')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (branch_id, external_ref)
);

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  booked_by_type TEXT NOT NULL DEFAULT 'patient' CHECK (booked_by_type IN ('patient', 'staff', 'admin', 'owner')),
  source TEXT NOT NULL DEFAULT 'web' CHECK (source IN ('web', 'counter', 'phone', 'whatsapp', 'import')),
  service_code TEXT NOT NULL,
  service_label TEXT NOT NULL,
  scheduled_start TEXT NOT NULL,
  scheduled_end TEXT,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'confirmed', 'checked_in', 'cancelled', 'completed', 'no_show')),
  cancellation_reason_code TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS queue_tickets (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  appointment_id TEXT REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,
  ticket_code TEXT NOT NULL,
  queue_name TEXT NOT NULL DEFAULT 'general',
  priority INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'called', 'in_service', 'completed', 'cancelled')),
  issued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  called_at TEXT,
  completed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (branch_id, ticket_code)
);

CREATE TABLE IF NOT EXISTS stock_items (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  sku TEXT NOT NULL,
  barcode TEXT,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'medicine',
  unit TEXT NOT NULL DEFAULT 'unit',
  requires_batch_tracking INTEGER NOT NULL DEFAULT 1 CHECK (requires_batch_tracking IN (0, 1)),
  is_controlled_item INTEGER NOT NULL DEFAULT 0 CHECK (is_controlled_item IN (0, 1)),
  reorder_level REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'recalled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (branch_id, sku)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_items_branch_barcode
  ON stock_items(branch_id, barcode)
  WHERE barcode IS NOT NULL;

CREATE TABLE IF NOT EXISTS stock_lots (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  stock_item_id TEXT NOT NULL REFERENCES stock_items(id) ON DELETE RESTRICT,
  lot_number TEXT NOT NULL,
  supplier_name TEXT,
  received_at TEXT NOT NULL,
  expires_on TEXT,
  quantity_on_hand REAL NOT NULL DEFAULT 0,
  unit_cost_cents INTEGER,
  currency TEXT NOT NULL DEFAULT 'MYR',
  storage_location TEXT,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'quarantined', 'recalled', 'depleted', 'disposed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (branch_id, stock_item_id, lot_number)
);

CREATE TABLE IF NOT EXISTS compliance_evidence (
  id TEXT PRIMARY KEY,
  branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
  requirement_code TEXT NOT NULL,
  evidence_type TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'collected', 'reviewed', 'expired', 'rejected')),
  source_system TEXT NOT NULL DEFAULT 'usrahmedic',
  evidence_uri TEXT,
  evidence_hash TEXT,
  captured_at TEXT,
  expires_at TEXT,
  reviewed_by_hash TEXT,
  reviewed_at TEXT,
  review_notes_redacted TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  stock_item_id TEXT NOT NULL REFERENCES stock_items(id) ON DELETE RESTRICT,
  stock_lot_id TEXT REFERENCES stock_lots(id) ON DELETE SET NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('receive', 'dispense', 'adjust', 'return', 'dispose', 'transfer', 'scan')),
  quantity_delta REAL NOT NULL,
  unit TEXT NOT NULL DEFAULT 'unit',
  reference_type TEXT,
  reference_id TEXT,
  reason_code TEXT,
  performed_by_hash TEXT,
  evidence_id TEXT REFERENCES compliance_evidence(id) ON DELETE SET NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_scan_events (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  stock_item_id TEXT REFERENCES stock_items(id) ON DELETE SET NULL,
  stock_lot_id TEXT REFERENCES stock_lots(id) ON DELETE SET NULL,
  scanned_code TEXT NOT NULL,
  scan_purpose TEXT NOT NULL DEFAULT 'verify' CHECK (scan_purpose IN ('verify', 'stocktake', 'dispense', 'dispose', 'receive')),
  patient_id_hash TEXT,
  result TEXT NOT NULL CHECK (result IN ('matched', 'not_found', 'expired', 'recalled')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
  actor_type TEXT NOT NULL DEFAULT 'anonymous',
  actor_id_hash TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id_hash TEXT,
  outcome TEXT NOT NULL DEFAULT 'success' CHECK (outcome IN ('success', 'failure', 'denied')),
  phi_scope TEXT NOT NULL DEFAULT 'none' CHECK (phi_scope IN ('none', 'referenced', 'changed', 'exported')),
  ip_hash TEXT,
  user_agent_hash TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patients_branch_status ON patients(branch_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_branch_start ON appointments(branch_id, scheduled_start);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id, scheduled_start);
CREATE INDEX IF NOT EXISTS idx_queue_branch_status ON queue_tickets(branch_id, status, priority, issued_at);
CREATE INDEX IF NOT EXISTS idx_stock_lots_item_status ON stock_lots(stock_item_id, status, expires_on);
CREATE INDEX IF NOT EXISTS idx_stock_movements_branch_created ON stock_movements(branch_id, created_at);
CREATE INDEX IF NOT EXISTS idx_stock_scan_branch_created ON stock_scan_events(branch_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_branch_created ON audit_events(branch_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_action_created ON audit_events(action, created_at);
CREATE INDEX IF NOT EXISTS idx_compliance_branch_requirement ON compliance_evidence(branch_id, requirement_code, status);

CREATE TRIGGER IF NOT EXISTS branches_set_updated_at
AFTER UPDATE ON branches
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE branches SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS patients_set_updated_at
AFTER UPDATE ON patients
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE patients SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS appointments_set_updated_at
AFTER UPDATE ON appointments
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE appointments SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS queue_tickets_set_updated_at
AFTER UPDATE ON queue_tickets
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE queue_tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS stock_items_set_updated_at
AFTER UPDATE ON stock_items
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE stock_items SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS stock_lots_set_updated_at
AFTER UPDATE ON stock_lots
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE stock_lots SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS compliance_evidence_set_updated_at
AFTER UPDATE ON compliance_evidence
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE compliance_evidence SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

INSERT OR IGNORE INTO branches (
  id, code, name, phone, address_json, timezone, status
) VALUES
  ('puncak-alam', 'PA', 'UsrahMedic Puncak Alam', '011-35664998', '{"area":"Puncak Alam","hours":"24 hours"}', 'Asia/Kuala_Lumpur', 'active'),
  ('bukit-jelutong', 'BJ', 'UsrahMedic Bukit Jelutong', '012-4454998', '{"area":"Bukit Jelutong","hours":"8:00 AM - 12:00 AM"}', 'Asia/Kuala_Lumpur', 'active'),
  ('seremban-2', 'S2', 'UsrahMedic Seremban 2', '011-11304998', '{"area":"Seremban 2","hours":"24 hours"}', 'Asia/Kuala_Lumpur', 'active');

INSERT OR IGNORE INTO stock_items (
  id, branch_id, sku, barcode, name, category, unit, requires_batch_tracking, is_controlled_item, reorder_level, status
) VALUES
  ('item-para-pa', 'puncak-alam', 'PA-2401', 'PA-2401', 'Paracetamol 500 mg', 'medicine', 'tablet', 1, 0, 100, 'active');

INSERT OR IGNORE INTO stock_lots (
  id, branch_id, stock_item_id, lot_number, supplier_name, received_at, expires_on, quantity_on_hand, currency, storage_location, status
) VALUES
  ('lot-para-pa-2401', 'puncak-alam', 'item-para-pa', 'PA-2401', 'Opening balance', '2026-05-01T00:00:00.000Z', '2027-02-28', 820, 'MYR', 'Dispensary shelf A', 'available');

INSERT OR IGNORE INTO compliance_evidence (
  id, branch_id, requirement_code, evidence_type, title, status, metadata_json
) VALUES
  ('evidence-pa-pdpa', 'puncak-alam', 'PDPA.PRIVACY_NOTICE', 'policy', 'Published privacy notice', 'planned', '{"seededBy":"migration","ownerActionRequired":true}'),
  ('evidence-pa-mmc', 'puncak-alam', 'MMC.EMR_AUDIT', 'control', 'Medical record correction and audit control', 'planned', '{"seededBy":"migration","ownerActionRequired":true}'),
  ('evidence-pa-pharmacy', 'puncak-alam', 'PHARMACY.STOCK_CONTROL', 'procedure', 'Medicine stock receiving, storage, and disposal control', 'planned', '{"seededBy":"migration","ownerActionRequired":true}');
