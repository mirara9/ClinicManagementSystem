# Architecture

## Decision

Use separate app surfaces with one shared backend and one canonical data model for v1.

- Public: `usrahmedic.com`
- Operations: `admin.usrahmedic.com`
- Medicine: `medicine.usrahmedic.com`
- Owner dashboards: `insight.usrahmedic.com`
- Patient and staff mobile surfaces start as PWA-style web screens, with native apps later.

## Current Implementation

- `apps/platform`: Next.js app with host-aware routing and all initial surfaces.
- `packages/domain`: shared TypeScript domain model, seeded data, workflow rules, permissions, compliance controls, and medicine safety logic.

## Cloudflare Production Target

- Deploy the public and operational web surfaces to Cloudflare Pages from the static Next.js export in `apps/platform/out`.
- Use Cloudflare Pages Functions for edge API routes under `/api/*`.
- Use Cloudflare D1 for the first production foundation database: branch/service catalog, booking intake, queue snapshots, stock movements, compliance evidence, and PHI-safe audit events.
- The production foundation migration `0003_production_clinic_foundation.sql` extends D1 with staff accounts, MFA/session tracking, branch assignments, patient EMR history, visits, consultations, clinical documents, medical certificates, invoices, payments, panel pricing, MyInvois tracking, inventory import/adjustment/dispensing/label jobs, report snapshots, support tickets, onboarding tasks, and update notes.
- Keep object-heavy records such as reports, scans, consent files, invoices, and ultrasound media behind a future Cloudflare R2-backed document service.
- Keep the app deployable without a local server; local development remains only a developer workflow.

## Backend API Foundation

The Cloudflare Pages Functions backend exposes minimal create/list endpoints for the production modules:

- `/api/auth/staff` for staff accounts and branch assignments.
- `/api/auth/sessions` for MFA-verified staff session records.
- `/api/patients` for patient registration, intake, and medical history entries.
- `/api/visits` for visit opening, triage payloads, and queue ticket creation.
- `/api/consultations` for draft/signed consultation records.
- `/api/documents` for rich text clinical documents and medical certificates.
- `/api/billing/invoices` and `/api/billing/payments` for editable invoice/payment foundations.
- `/api/panels` for panel/insurance providers and branch-specific price rules.
- `/api/inventory/imports`, `/api/inventory/adjustments`, `/api/inventory/dispense`, and `/api/inventory/labels` for pharmacy workflows.
- `/api/reports/snapshots` for real report snapshots generated from live operational tables.
- `/api/support/tickets` and `/api/onboarding/tasks` for support and assisted onboarding.

New branch-scoped endpoints use `staff_branch_assignments` for branch isolation. `owner` can operate across branches; staff/admin roles need `X-UsrahMedic-Actor-Id` to match an active branch assignment until the real IdP/BFF session layer replaces temporary headers.

## Longer-Term Production Target

- Keep a modular monolith backend first.
- Use PostgreSQL as the canonical write model.
- Use Redis for queue/session/cache needs.
- Use object storage for reports, scans, consent forms, referral documents, ultrasound images, and invoices.
- Use outbox events only for audit-critical and integration-critical workflows in v1.

## Security Decisions To Lock Before Backend Build

- IdP provider: managed OIDC or self-hosted Keycloak after residency and support review.
- Staff web session model: BFF session with CSRF protection.
- Mobile auth: Authorization Code + PKCE, secure token storage, remote logout.
- Authorization: service-layer RBAC and ABAC, with database RLS only as defense in depth.
- Audit: append-only and tamper-evident audit events for patient record access, edits, exports, printing, billing, stock movement, and admin actions.
- Data classification: PHI, PII, financial, operational, marketing, and audit.

## Avoid In V1

- Full microservices.
- Kafka or heavy analytics warehouse.
- Full public FHIR API.
- Public medicine commerce.
- Kubernetes unless deployment scale requires it.
