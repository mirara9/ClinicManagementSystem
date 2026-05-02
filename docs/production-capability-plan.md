# Production Capability Plan

This plan is the working feature matrix for moving UsrahMedic from the current Cloudflare-ready foundation into a production clinic management system. It is implementation guidance, not a legal, tax, or medical compliance sign-off.

## Status Legend

- `Foundation only`: architecture, docs, sample data, or deployment shell exists, but the workflow is not production-usable.
- `Partially implemented`: a domain contract, simple UI, table, or API slice exists, but the end-to-end production workflow is incomplete.
- `Not implemented`: no meaningful production workflow exists yet.
- `Provider dependent`: code can be prepared, but go-live needs a selected external provider and credentials.
- `Decision required`: the clinic or owner must make a business, compliance, residency, or vendor decision before implementation can be finished.

## Capability Matrix

| Capability | Current status | Foundation evidence | Production work needed | Dependencies that code alone cannot solve |
|---|---|---|---|---|
| Real login/auth/MFA and staff accounts | Not implemented | Role and permission model exists in `packages/domain/src/permissions.ts`. | IdP decision, staff invitations, activation/suspension, MFA enrollment/recovery, password reset, BFF sessions, CSRF protection, remote logout, auth audit events. | IdP/OIDC provider, SMS/email provider, staff credential policy. |
| Role based access control | Partially implemented | RBAC and branch-aware access helpers exist. | Enforce permissions at every API/service boundary, persist staff assignments, care-team membership, break-glass reason and review workflow. | Clinic approval for role matrix and break-glass policy. |
| Branch level data isolation | Partially implemented | Branch IDs exist in seeded data and workflow contracts. | Branch-scoped queries, API authorization, audit proof for cross-branch access, owner-level PHI-safe aggregation. | CKAPS branch governance, PDPA least-privilege sign-off. |
| Shared doctor accounts across branches | Partially implemented | Doctor role exists; branch data exists. | Doctor profile, APC/credential evidence, branch assignment, locum schedule, cross-branch roster, branch-safe patient access. | Doctor credential/locum policy and branch manager approval workflow. |
| Patient registration and intake | Partially implemented | Booking/intake contracts and patient booking UI exist. | Patient registry UI/API, duplicate detection, dependent/guardian model, ID vault tokenization, consent history, intake triage handoff. | Identity storage approach and PDPA consent wording. |
| Patient records management | Partially implemented | Patient table and domain registration contract exist. | Canonical patient profile, immutable timeline, attachments, alerts, allergies, corrections ledger, merge governance, access/export workflow. | Object storage, legal review of medical record retention. |
| Medical history and visit records | Not implemented | Encounter permissions exist only as foundation. | Visit timeline, diagnosis, procedures, prescriptions, orders/results, referrals, follow-ups, corrections, print/export audit. | MMC medical record policy and clinic SOP. |
| Consultations management | Not implemented | Workflow states include consult states; no production consultation module exists. | Doctor workbench, SOAP notes, orders, prescription, disposition, follow-up, referral, billing handoff, audit events. | Clinical template approval and doctor sign-off. |
| Rich text document editor | Not implemented | No editor exists. | Secure clinical editor with templates, autosave, versioning, corrections, print/export, PDF generation, locked final documents. | PDF/document rendering choice and storage provider. |
| Medical certificate generation | Not implemented | No MC workflow exists. | MC templates, doctor signing, serial number, QR/verification, reprint controls, amendment/cancellation workflow. | Legal/clinic wording approval. |
| Appointment scheduling | Partially implemented | Patient booking and appointment API foundation exist. | Doctor roster, slot capacity, locking, reschedule/cancel/no-show, waitlist, reminders, deposit linkage. | Payment gateway and reminder provider. |
| Queue management | Partially implemented | Queue states and seeded tickets exist. | Walk-in registration, triage priority, room call, transfer, hold, skip, discharge, SLA timers, screen display. | Branch operational SOP. |
| Consultation and service billing | Not implemented | Billing permissions exist. | Draft bill from services/procedures/medicine, discount/approval rules, cash/card/QR/e-wallet settlement, refund/void/reversal, receipt. | Payment provider and finance policy. |
| Editable bills and invoices | Not implemented | No billing ledger exists. | Draft/final states, edit reasons, approval thresholds, invoice numbering, tax handling, audit, printable receipt/invoice. | Finance approval and tax/legal sign-off. |
| Insurance and panel pricing | Not implemented | Claim permission exists. | Panel directory, eligibility, panel-specific price schedules, GL/claim states, AR aging, rejection/rework workflow. | Panel/TPA contract and integration requirements. |
| LHDN e-Invoicing compliance | Provider dependent | No MyInvois workflow exists. | MyInvois states, validation, submission, UUID/QR storage, cancellation/rejection handling, retry queue, reconciliation reports. | LHDN/MyInvois integration, taxpayer profile, tax advisor sign-off. |
| RM10 booking deposit and payments | Provider dependent | Patient booking UI references a deposit intent; no real capture/refund exists. | Payment session, webhook verification, deposit ledger, refund/cancel rules, invoice settlement mapping, reconciliation. | Payment gateway and bank settlement process. |
| Medication and inventory management | Partially implemented | Medicine safety logic, stock receive/scan contracts, and medicine UI foundation exist. | Medicine master CRUD, opening balance, receive, transfer, stocktake, adjustment, quarantine, expiry, recall, disposal, valuation, audit. | Supplier data, stock opening balance, pharmacy legal review. |
| Bulk inventory upload | Not implemented | No upload workflow exists. | CSV/XLSX parser, preview, validation, duplicate matching, approval, rollback, import audit, error report. | Source file format and stock-master ownership decision. |
| Manual stock adjustments | Partially implemented | Stock permissions and movement concepts exist. | Adjustment reasons, approval thresholds, branch stock ledger, reversal, evidence attachment, controlled-item safeguards. | Pharmacy SOP and controlled medicine policy. |
| Dispensing and medicine label printing | Partially implemented | Dispense states and label foundation concepts exist. | Prescription-linked screening, clarify/prepare/label/check/counter-check/issue/counsel/reverse; printable label templates and print audit. | Label printer/browser print strategy and legal label content review. |
| Basic clinic reports | Partially implemented | Owner KPI sample and PHI-safe export contract exist. | Daily registration, appointment, queue, consultation, cash drawer, staff productivity, medicine expiry, stock movement reports. | Report definitions from owner/branch managers. |
| Revenue and billing reports | Partially implemented | PHI-safe export pattern exists, but no real billing ledger exists. | Revenue, collections, refunds, AR aging, panel claims, doctor performance, branch comparison, exports, scheduled delivery. | Accounting/export target and finance definitions. |
| Cloud-based clinic system | Foundation only | Cloudflare Pages, Functions, D1, and deployment docs exist. | Production environments, secrets, CI/CD, migrations, monitoring, uptime checks, backup, DR, rollback, incident response. | CI/monitoring/backup providers and production ownership. |
| Automatic system updates | Foundation only | Deployment scripts exist, but no protected release process exists. | Protected branch, preview deploys, tests before release, migration checks, feature flags, release notes, rollback and maintenance notices. | GitHub/CI provider access and release approval policy. |
| Ongoing platform improvements | Foundation only | Rollout docs exist. | Changelog, feature request intake, roadmap triage, staged rollout, post-release QA, product analytics without PHI leakage. | Product ownership process. |
| Malaysian-hosted database | Decision required | Current database target is Cloudflare D1; Malaysia residency is not guaranteed. | Decide residency requirement, select Malaysia-hosted PostgreSQL if required, define backup/restore/encryption/DR, migrate PHI write model. | Malaysia-hosted DB provider, PDPA cross-border transfer assessment, clinic risk acceptance. |
| Standard support | Not implemented | No support workflow exists. | Support plan, intake, ticket categories, SLA, clinic contacts, knowledge base, remote support access policy. | Support desk provider and support staffing. |
| Priority support | Not implemented | No escalation workflow exists. | Severity definitions, escalation, after-hours coverage, incident comms, status page, RCA workflow. | Support staffing and status page provider. |
| Assisted onboarding | Not implemented | Rollout plan has discovery/go-live criteria only. | Branch setup checklist, data import, staff setup, panel setup, stock opening balance, printer setup, training, sign-off. | Clinic data owners and branch availability. |

## Delivery Sequence

### Phase 1 - Production Foundation

1. Decide database residency and target write model.
2. Implement real auth, MFA, staff accounts, RBAC enforcement, branch assignments, audit hardening, CI/CD, monitoring, backup, and release process.
3. Prepare provider decisions for payment, MyInvois, SMS/email, support desk, object storage, and accounting export.

Exit criteria:

- No API trusts temporary role headers.
- Every staff action has a session, actor, branch scope, and audit trail.
- Database, backup, and deployment decisions are documented and tested.

### Phase 2 - Clinic Operations

1. Build patient registry, intake, guardian/dependent model, appointment scheduling, queue, triage, consultation, visit timeline, and medical record correction workflow.
2. Build doctor roster and shared doctor accounts across branches.
3. Pilot one branch with paper/spreadsheet fallback.

Exit criteria:

- One branch can complete registration to consultation to discharge using the system.
- Patient records cannot be hard-deleted.
- Cross-branch access is blocked unless assignment or break-glass rules allow it.

### Phase 3 - Revenue And Medicine

1. Implement billing, editable invoices, receipts, cash drawer, deposits, refunds, panels, claims, MyInvois, and reconciliation.
2. Implement medicine master, stock upload, opening balance, adjustments, stocktake, dispensing, legal registers, and label printing.

Exit criteria:

- Cash/card/QR/e-wallet settlement reconciles with invoices and deposits.
- Stock ledger reconciles from opening balance through dispensing and adjustments.
- Controlled medicine workflows have legal review before go-live.

### Phase 4 - Support, Onboarding, And Patient Experience

1. Implement standard/priority support workflows, onboarding checklists, knowledge base, clinic setup tools, and support access policy.
2. Expand patient PWA after clinical and billing data are real: booking, queue status, dependents, receipts, results, reminders.

Exit criteria:

- New branch onboarding can be run from checklist to sign-off.
- Support staff can help without uncontrolled PHI access.

### Phase 5 - Reporting And Continuous Improvement

1. Build operational, revenue, billing, panel, inventory, doctor, branch, and owner reports from real ledgers.
2. Add scheduled reports, PHI-safe exports, changelog, feedback intake, feature flags, and staged rollout controls.

Exit criteria:

- Owner dashboards reconcile with operational and finance ledgers.
- Export and scheduled report access is auditable and PHI-minimized.

## Provider-Dependent Work

These cannot be completed purely in code:

- IdP/OIDC and MFA recovery channel.
- Malaysia-hosted database decision if local residency is mandatory.
- Payment gateway for RM10 deposits, final payments, refunds, and reconciliation.
- LHDN MyInvois production integration and tax advisor sign-off.
- Panel/TPA integrations and contracts.
- SMS/email provider for reminders and auth recovery.
- Document/PDF rendering and secure object storage.
- Label printer and receipt printer hardware/browser print strategy.
- Support desk, status page, monitoring, backup, and accounting export providers.

## Compliance And Policy Gates

- PDPA: privacy notice, consent, access/correction/export, breach workflow, vendor register, cross-border basis.
- MMC: confidential records, no hard delete, corrections ledger, medical report release workflow.
- CKAPS: branch registration, OYB/person-in-charge, incident/complaint/assessable event evidence.
- Pharmacy/medicine: poison group handling, psychotropic/dangerous drug register decision, label content, storage/disposal/recall SOP.
- LHDN: e-invoice states, cancellation/rejection handling, taxpayer profile, audit and reconciliation.
- Support: support staff PHI access policy and vendor processor register.

## Source Of Truth

The code-backed capability map is in `packages/domain/src/productCapabilities.ts`. Tests in `packages/domain/src/productCapabilities.test.ts` ensure the requested production scope stays represented and does not get silently narrowed.
