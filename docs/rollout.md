# Rollout Plan

## Phase 0: Discovery

- Observe each branch for one full operating day.
- Map reception, triage, doctor, procedure, dispensary, cashier, branch manager, and owner workflows.
- Collect current patient, panel, stock, service, price, doctor, and branch data sources.
- Confirm MyInvois, accounting, payment, panel/TPA, WhatsApp, and lab/radiology integration requirements.

## Phase 1: Foundation

- Monorepo, design system, public site, auth design, audit model, compliance registers, CMS model.
- Import branch, service, doctor, panel, and campaign content into structured data.

## Phase 2: Clinic Operations

- Patient registry, appointment, queue, triage, EMR, orders/results, referrals, billing, cash drawer, receipts.
- Pilot one branch with parallel paper/spreadsheet fallback.

## Phase 3: Revenue And Medicine

- MyInvois states, panel claims, accounting export, medicine master, batch stock, dispensing, labels, legal registers.
- Run medicine stock opening balance validation before go-live.

## Phase 4: Mobile/PWA

- Patient PWA: booking, queue, dependents, receipts, results, reminders.
- Staff app: queue, tasks, notifications, stock scan, owner KPIs.

## Phase 5: Insights

- PHI-safe owner dashboards.
- Revenue, AR aging, queue SLA, campaign ROI, medicine usage, expiry risk, branch benchmarking.

## Go-Live Criteria

- One branch can run a full day from registration to close without spreadsheets.
- Cash drawer, card/QR/e-wallet settlement, MyInvois states, and panel claims reconcile.
- Medicine stock movement matches opening balance, dispensing, returns, and closing balance.
- Audit logs prove patient record access, edits, exports, prints, and stock changes.
- Staff can complete core workflows on slow network.
