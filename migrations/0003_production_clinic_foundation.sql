PRAGMA foreign_keys = ON;

ALTER TABLE patients ADD COLUMN registered_source TEXT NOT NULL DEFAULT 'counter';
ALTER TABLE patients ADD COLUMN primary_panel_provider_id TEXT;
ALTER TABLE patients ADD COLUMN medical_alerts_json TEXT NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS staff_accounts (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT,
  phone_e164 TEXT,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'doctor', 'nurse', 'pharmacist', 'front_desk', 'billing', 'support', 'staff')),
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'suspended', 'offboarded')),
  mfa_required INTEGER NOT NULL DEFAULT 1 CHECK (mfa_required IN (0, 1)),
  external_idp_subject TEXT,
  last_login_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_accounts_email
  ON staff_accounts(email)
  WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS staff_branch_assignments (
  id TEXT PRIMARY KEY,
  staff_account_id TEXT NOT NULL REFERENCES staff_accounts(id) ON DELETE RESTRICT,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  role_at_branch TEXT NOT NULL CHECK (role_at_branch IN ('owner', 'admin', 'doctor', 'nurse', 'pharmacist', 'front_desk', 'billing', 'support', 'staff')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  starts_at TEXT,
  ends_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (staff_account_id, branch_id, role_at_branch)
);

CREATE INDEX IF NOT EXISTS idx_staff_branch_assignments_branch
  ON staff_branch_assignments(branch_id, status, role_at_branch);

CREATE TABLE IF NOT EXISTS staff_mfa_factors (
  id TEXT PRIMARY KEY,
  staff_account_id TEXT NOT NULL REFERENCES staff_accounts(id) ON DELETE CASCADE,
  factor_type TEXT NOT NULL CHECK (factor_type IN ('totp', 'webauthn', 'sms', 'email')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'disabled')),
  display_label TEXT,
  secret_ref TEXT,
  verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staff_sessions (
  id TEXT PRIMARY KEY,
  staff_account_id TEXT NOT NULL REFERENCES staff_accounts(id) ON DELETE CASCADE,
  branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
  session_token_hash TEXT NOT NULL,
  mfa_verified_at TEXT,
  issued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  ip_hash TEXT,
  user_agent_hash TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_staff_sessions_account
  ON staff_sessions(staff_account_id, expires_at, revoked_at);

CREATE TABLE IF NOT EXISTS patient_medical_history (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('condition', 'allergy', 'medication', 'surgery', 'family_history', 'social_history', 'immunisation', 'alert')),
  title TEXT NOT NULL,
  details_text TEXT,
  severity TEXT,
  onset_on TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'resolved', 'entered_in_error')),
  recorded_by_hash TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patient_medical_history_patient
  ON patient_medical_history(patient_id, entry_type, status);

CREATE TABLE IF NOT EXISTS patient_visit_records (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  appointment_id TEXT REFERENCES appointments(id) ON DELETE SET NULL,
  queue_ticket_id TEXT REFERENCES queue_tickets(id) ON DELETE SET NULL,
  visit_type TEXT NOT NULL DEFAULT 'consultation',
  chief_complaint TEXT,
  triage_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_consult', 'billing', 'completed', 'cancelled')),
  opened_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at TEXT,
  created_by_hash TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patient_visit_records_branch_status
  ON patient_visit_records(branch_id, status, opened_at);
CREATE INDEX IF NOT EXISTS idx_patient_visit_records_patient
  ON patient_visit_records(patient_id, opened_at);

CREATE TABLE IF NOT EXISTS consultations (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  visit_id TEXT NOT NULL REFERENCES patient_visit_records(id) ON DELETE RESTRICT,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  doctor_staff_id TEXT REFERENCES staff_accounts(id) ON DELETE SET NULL,
  clinical_summary TEXT,
  diagnosis_text TEXT,
  plan_text TEXT,
  rich_text_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'signed', 'amended', 'voided')),
  signed_at TEXT,
  amended_from_id TEXT REFERENCES consultations(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_consultations_patient
  ON consultations(patient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_consultations_visit
  ON consultations(visit_id, status);

CREATE TABLE IF NOT EXISTS clinical_documents (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  patient_id TEXT REFERENCES patients(id) ON DELETE RESTRICT,
  visit_id TEXT REFERENCES patient_visit_records(id) ON DELETE SET NULL,
  consultation_id TEXT REFERENCES consultations(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('clinical_note', 'referral', 'consent', 'lab_request', 'imaging_request', 'template', 'other')),
  title TEXT NOT NULL,
  rich_text_json TEXT NOT NULL DEFAULT '{}',
  plain_text TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'amended', 'voided')),
  storage_uri TEXT,
  content_hash TEXT,
  created_by_hash TEXT,
  finalized_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clinical_documents_patient
  ON clinical_documents(patient_id, document_type, created_at);

CREATE TABLE IF NOT EXISTS medical_certificates (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  visit_id TEXT REFERENCES patient_visit_records(id) ON DELETE SET NULL,
  consultation_id TEXT REFERENCES consultations(id) ON DELETE SET NULL,
  issued_by_staff_id TEXT REFERENCES staff_accounts(id) ON DELETE SET NULL,
  start_on TEXT NOT NULL,
  end_on TEXT NOT NULL,
  reason_text TEXT,
  restrictions_text TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'voided')),
  issued_at TEXT,
  document_id TEXT REFERENCES clinical_documents(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_medical_certificates_patient
  ON medical_certificates(patient_id, created_at);

CREATE TABLE IF NOT EXISTS service_catalog (
  id TEXT PRIMARY KEY,
  branch_id TEXT REFERENCES branches(id) ON DELETE RESTRICT,
  service_code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'consultation',
  default_price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'MYR',
  taxable INTEGER NOT NULL DEFAULT 0 CHECK (taxable IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (branch_id, service_code)
);

CREATE TABLE IF NOT EXISTS panel_providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider_type TEXT NOT NULL DEFAULT 'panel' CHECK (provider_type IN ('panel', 'insurance', 'tpa', 'corporate')),
  payer_code TEXT,
  contact_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patient_panel_memberships (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  panel_provider_id TEXT NOT NULL REFERENCES panel_providers(id) ON DELETE RESTRICT,
  member_number TEXT,
  coverage_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  starts_on TEXT,
  ends_on TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (patient_id, panel_provider_id, member_number)
);

CREATE TABLE IF NOT EXISTS panel_price_rules (
  id TEXT PRIMARY KEY,
  branch_id TEXT REFERENCES branches(id) ON DELETE RESTRICT,
  panel_provider_id TEXT NOT NULL REFERENCES panel_providers(id) ON DELETE RESTRICT,
  service_code TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MYR',
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_panel_price_rules_lookup
  ON panel_price_rules(panel_provider_id, branch_id, service_code, status);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,
  visit_id TEXT REFERENCES patient_visit_records(id) ON DELETE SET NULL,
  panel_provider_id TEXT REFERENCES panel_providers(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'part_paid', 'paid', 'voided', 'refunded')),
  currency TEXT NOT NULL DEFAULT 'MYR',
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  balance_cents INTEGER NOT NULL DEFAULT 0,
  editable_until TEXT,
  issued_at TEXT,
  due_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (branch_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_branch_status
  ON invoices(branch_id, status, created_at);

CREATE TABLE IF NOT EXISTS invoice_lines (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  service_code TEXT,
  description TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit_price_cents INTEGER NOT NULL DEFAULT 0,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL,
  appointment_deposit_id TEXT REFERENCES appointment_deposits(id) ON DELETE SET NULL,
  patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'MYR',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'fpx', 'ewallet', 'bank_transfer', 'panel')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'authorized', 'paid', 'failed', 'refunded', 'voided')),
  provider_name TEXT,
  provider_reference TEXT,
  received_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice
  ON payments(invoice_id, status, created_at);

CREATE TABLE IF NOT EXISTS myinvois_submissions (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  submission_type TEXT NOT NULL DEFAULT 'invoice' CHECK (submission_type IN ('invoice', 'credit_note', 'debit_note', 'refund_note')),
  status TEXT NOT NULL DEFAULT 'not_submitted' CHECK (status IN ('not_submitted', 'queued', 'submitted', 'accepted', 'rejected', 'cancelled')),
  lhdn_uuid TEXT,
  lhdn_long_id TEXT,
  validation_errors_json TEXT NOT NULL DEFAULT '[]',
  submitted_at TEXT,
  accepted_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_myinvois_invoice
  ON myinvois_submissions(invoice_id, status);

CREATE TABLE IF NOT EXISTS inventory_import_jobs (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  source_filename TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'applied', 'failed')),
  row_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  created_by_hash TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_import_rows (
  id TEXT PRIMARY KEY,
  import_job_id TEXT NOT NULL REFERENCES inventory_import_jobs(id) ON DELETE CASCADE,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  row_number INTEGER NOT NULL,
  sku TEXT,
  item_name TEXT,
  lot_number TEXT,
  quantity REAL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'valid', 'invalid', 'applied')),
  error_message TEXT,
  raw_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_adjustments (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  stock_item_id TEXT NOT NULL REFERENCES stock_items(id) ON DELETE RESTRICT,
  stock_lot_id TEXT REFERENCES stock_lots(id) ON DELETE SET NULL,
  quantity_delta REAL NOT NULL,
  reason_code TEXT NOT NULL,
  approved_by_hash TEXT,
  evidence_json TEXT NOT NULL DEFAULT '{}',
  stock_movement_id TEXT REFERENCES stock_movements(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_dispenses (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,
  visit_id TEXT REFERENCES patient_visit_records(id) ON DELETE SET NULL,
  consultation_id TEXT REFERENCES consultations(id) ON DELETE SET NULL,
  invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'dispensed', 'cancelled', 'returned')),
  dispensed_by_hash TEXT,
  dispensed_at TEXT,
  instructions_text TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_dispense_lines (
  id TEXT PRIMARY KEY,
  dispense_id TEXT NOT NULL REFERENCES stock_dispenses(id) ON DELETE CASCADE,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  stock_item_id TEXT NOT NULL REFERENCES stock_items(id) ON DELETE RESTRICT,
  stock_lot_id TEXT REFERENCES stock_lots(id) ON DELETE SET NULL,
  quantity REAL NOT NULL,
  dose_text TEXT,
  frequency_text TEXT,
  duration_text TEXT,
  label_text TEXT,
  stock_movement_id TEXT REFERENCES stock_movements(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS medicine_label_jobs (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  dispense_id TEXT REFERENCES stock_dispenses(id) ON DELETE CASCADE,
  patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'printed', 'cancelled', 'failed')),
  label_payload_json TEXT NOT NULL DEFAULT '{}',
  printer_name TEXT,
  printed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS report_snapshots (
  id TEXT PRIMARY KEY,
  branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('clinic_daily', 'revenue', 'billing_aging', 'inventory', 'queue', 'compliance')),
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  generated_by_hash TEXT,
  summary_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'exported', 'voided')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_report_snapshots_lookup
  ON report_snapshots(branch_id, report_type, period_start);

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
  requester_staff_id TEXT REFERENCES staff_accounts(id) ON DELETE SET NULL,
  support_plan TEXT NOT NULL DEFAULT 'standard' CHECK (support_plan IN ('standard', 'priority')),
  subject TEXT NOT NULL,
  description_text TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'resolved', 'closed')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS onboarding_tasks (
  id TEXT PRIMARY KEY,
  branch_id TEXT REFERENCES branches(id) ON DELETE CASCADE,
  task_key TEXT NOT NULL,
  title TEXT NOT NULL,
  owner_role TEXT NOT NULL DEFAULT 'admin',
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'blocked', 'skipped')),
  due_on TEXT,
  completed_at TEXT,
  evidence_uri TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (branch_id, task_key)
);

CREATE TABLE IF NOT EXISTS platform_update_notes (
  id TEXT PRIMARY KEY,
  version_label TEXT NOT NULL,
  release_channel TEXT NOT NULL DEFAULT 'stable' CHECK (release_channel IN ('stable', 'pilot', 'internal')),
  summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'released', 'rolled_back')),
  released_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS staff_accounts_set_updated_at
AFTER UPDATE ON staff_accounts
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE staff_accounts SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS staff_branch_assignments_set_updated_at
AFTER UPDATE ON staff_branch_assignments
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE staff_branch_assignments SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS invoices_set_updated_at
AFTER UPDATE ON invoices
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE invoices SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

INSERT OR IGNORE INTO service_catalog (
  id, branch_id, service_code, name, category, default_price_cents, currency, taxable, status
) VALUES
  ('svc-general-consult', NULL, 'general-consultation', 'General consultation', 'consultation', 3500, 'MYR', 0, 'active'),
  ('svc-follow-up', NULL, 'follow-up', 'Follow-up consultation', 'consultation', 2500, 'MYR', 0, 'active'),
  ('svc-medical-cert', NULL, 'medical-certificate', 'Medical certificate', 'document', 1000, 'MYR', 0, 'active');

INSERT OR IGNORE INTO onboarding_tasks (
  id, branch_id, task_key, title, owner_role, status, metadata_json
) VALUES
  ('onboard-pa-staff', 'puncak-alam', 'staff_accounts', 'Invite staff and assign branch roles', 'admin', 'todo', '{"seededBy":"migration"}'),
  ('onboard-pa-inventory', 'puncak-alam', 'inventory_opening_balance', 'Upload medicine opening balance', 'pharmacist', 'todo', '{"seededBy":"migration"}'),
  ('onboard-pa-myinvois', 'puncak-alam', 'myinvois_profile', 'Configure MyInvois taxpayer profile', 'billing', 'todo', '{"seededBy":"migration"}');
