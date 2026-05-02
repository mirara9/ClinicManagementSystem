export type CapabilityStatus =
  | "foundationOnly"
  | "partiallyImplemented"
  | "notImplemented"
  | "providerDependent"
  | "decisionRequired";

export type CapabilityCategory =
  | "access"
  | "clinical"
  | "billing"
  | "medicine"
  | "reporting"
  | "branching"
  | "platform"
  | "support";

export interface ProductCapability {
  id: string;
  category: CapabilityCategory;
  title: string;
  currentStatus: CapabilityStatus;
  foundationEvidence: string[];
  productionNeeded: string[];
  providerDependencies: string[];
  complianceDependencies: string[];
  phase: "phase-1" | "phase-2" | "phase-3" | "phase-4" | "phase-5";
}

export const productCapabilities = [
  {
    id: "auth-mfa-staff-accounts",
    category: "access",
    title: "Real login, MFA, staff accounts, and secure sessions",
    currentStatus: "notImplemented",
    foundationEvidence: ["Role and permission model exists in packages/domain/src/permissions.ts."],
    productionNeeded: [
      "Choose IdP and session architecture.",
      "Implement staff invitation, activation, suspension, password reset, MFA enrollment, recovery, and remote logout.",
      "Replace temporary role/header assumptions with server-enforced sessions and CSRF protection.",
      "Add audit events for login, failed login, MFA changes, privilege changes, and session revocation."
    ],
    providerDependencies: ["Managed OIDC/IdP or self-hosted Keycloak", "SMS/email provider for OTP or recovery"],
    complianceDependencies: ["PDPA access control evidence", "Staff credential governance"],
    phase: "phase-1"
  },
  {
    id: "rbac-abac-branch-isolation",
    category: "access",
    title: "Role based access control, branch isolation, and break-glass access",
    currentStatus: "partiallyImplemented",
    foundationEvidence: ["RBAC/ABAC helper functions exist in packages/domain/src/permissions.ts."],
    productionNeeded: [
      "Persist staff branch assignments and care-team relationships.",
      "Enforce authorization at every API/service boundary.",
      "Add branch-scoped query filters and branch-level audit evidence.",
      "Implement doctor break-glass with mandatory reason, notification, and review."
    ],
    providerDependencies: [],
    complianceDependencies: ["MMC medical record confidentiality", "PDPA least-privilege access"],
    phase: "phase-1"
  },
  {
    id: "patient-registry-emr-history",
    category: "clinical",
    title: "Patient registry, intake, EMR, medical history, and visit records",
    currentStatus: "partiallyImplemented",
    foundationEvidence: [
      "Booking and patient registration contracts exist in packages/domain/src/workflowContracts.ts.",
      "D1 foundation schema includes patient and appointment tables."
    ],
    productionNeeded: [
      "Create canonical patient profile, dependents, identifiers vault references, allergies, alerts, notes, attachments, and consent history.",
      "Build immutable visit timeline with encounter, diagnosis, orders, prescription, procedure, referral, MC, invoice, and audit links.",
      "Support corrections without hard delete.",
      "Add duplicate matching and patient merge governance."
    ],
    providerDependencies: ["Object storage for attachments and reports"],
    complianceDependencies: ["MMC no-delete medical record controls", "PDPA access/correction/export workflows"],
    phase: "phase-2"
  },
  {
    id: "appointment-queue-scheduling",
    category: "clinical",
    title: "Appointment scheduling, patient intake, and queue management",
    currentStatus: "partiallyImplemented",
    foundationEvidence: [
      "Patient booking UI and appointment contract exist.",
      "Queue workflow states and seeded queue data exist in packages/domain/src/clinicWorkflow.ts and data.ts."
    ],
    productionNeeded: [
      "Implement availability calendar, doctor roster, slot locking, reschedule, cancellation, no-show, and waitlist.",
      "Implement walk-in registration, triage priority, room call, queue transfer, hold, skip, and discharge.",
      "Sync appointment deposit state with queue arrival state."
    ],
    providerDependencies: ["Payment provider for deposit authorization/capture/refund", "SMS/email reminder provider"],
    complianceDependencies: ["PDPA consent for reminders", "Clinic SOP for queue priority handling"],
    phase: "phase-2"
  },
  {
    id: "consultation-mc-document-editor",
    category: "clinical",
    title: "Consultations, rich text clinical editor, medical certificate, referrals, and generated documents",
    currentStatus: "notImplemented",
    foundationEvidence: ["Encounter and prescription permissions exist, but no consultation UI or persistence exists."],
    productionNeeded: [
      "Build SOAP/clinical note editor with templates, autosave, version history, correction workflow, and print/export audit.",
      "Implement diagnosis, procedure, prescription, order, referral, and follow-up flows.",
      "Generate MC with doctor identity, branch, patient, date range, restrictions, serial number, QR/verification, and reprint audit.",
      "Create document templates for referral letters, consent forms, and patient reports."
    ],
    providerDependencies: ["PDF/document rendering service or library", "Secure object storage"],
    complianceDependencies: ["MMC documentation standards", "Clinic legal review for MC wording"],
    phase: "phase-2"
  },
  {
    id: "billing-invoices-panels-myinvois-payments",
    category: "billing",
    title: "Billing, editable invoices, panel pricing, MyInvois/LHDN, and payments",
    currentStatus: "providerDependent",
    foundationEvidence: ["Billing and claim permissions exist, but there is no real billing ledger."],
    productionNeeded: [
      "Implement service catalog pricing, editable draft bills, approvals, discounts, tax handling, receipts, refunds, voids, and cash drawer close.",
      "Implement panel/insurance eligibility, price schedules, claim submission states, guarantee letters, and AR aging.",
      "Implement MyInvois document states, validation, submission, cancellation, QR/UUID storage, and failure recovery.",
      "Connect RM10 booking deposit to appointment billing and final invoice settlement."
    ],
    providerDependencies: ["Payment gateway", "LHDN MyInvois integration", "Panel/TPA integrations", "Accounting export target"],
    complianceDependencies: ["LHDN e-Invoicing compliance", "Finance approval policy", "PDPA data sharing basis"],
    phase: "phase-3"
  },
  {
    id: "inventory-upload-adjust-dispense-labels",
    category: "medicine",
    title: "Medication inventory, bulk upload, manual adjustments, dispensing, labels, and legal registers",
    currentStatus: "partiallyImplemented",
    foundationEvidence: [
      "Medicine master and stock safety logic exists in packages/domain/src/medicine.ts.",
      "Stock receive and scan API contracts exist.",
      "Medicine page has foundation workflow UI."
    ],
    productionNeeded: [
      "Implement medicine master import with validation, duplicate handling, preview, approval, and rollback.",
      "Implement opening balance, stocktake, adjustment, transfer, quarantine, disposal, recall, and reversal workflows.",
      "Implement prescription-linked dispensing, screening, clarification, preparation, labeling, double-check, issue, counseling, void, and reverse.",
      "Implement printable labels with branch, patient, medicine, dose, frequency, duration, warnings, prescriber, dispenser, batch, and expiry."
    ],
    providerDependencies: ["Barcode scanner/printer model confirmation", "Label printer driver/browser print strategy"],
    complianceDependencies: ["Poisons/psychotropic register requirements", "GDSP storage requirements", "Clinic pharmacist/legal review"],
    phase: "phase-3"
  },
  {
    id: "reporting-real-data",
    category: "reporting",
    title: "Basic clinic reports and revenue/billing reports from real data",
    currentStatus: "partiallyImplemented",
    foundationEvidence: ["PHI-safe owner export contract and seeded owner KPIs exist."],
    productionNeeded: [
      "Build operational reports from appointment, queue, encounter, billing, claim, and stock ledgers.",
      "Build revenue, collection, refund, AR aging, panel claim, doctor productivity, stock valuation, expiry, and branch comparison reports.",
      "Implement report permissions, PHI redaction rules, export audit, and scheduled report delivery."
    ],
    providerDependencies: ["Accounting export target if required", "Email/report delivery provider if scheduled"],
    complianceDependencies: ["PDPA minimization and export audit"],
    phase: "phase-5"
  },
  {
    id: "multi-branch-shared-doctors",
    category: "branching",
    title: "Multi-branch support and shared doctor accounts across branches",
    currentStatus: "partiallyImplemented",
    foundationEvidence: ["Branch IDs and branch-aware data examples exist."],
    productionNeeded: [
      "Persist branch directory, rooms, counters, service availability, staff assignments, doctor schedules, and locum assignments.",
      "Allow one doctor account to work across assigned branches while keeping patient data branch-scoped by default.",
      "Support owner/system views across all branches with PHI-safe aggregation."
    ],
    providerDependencies: [],
    complianceDependencies: ["CKAPS branch registration and person-in-charge evidence", "MMC/APC/locum credential evidence"],
    phase: "phase-2"
  },
  {
    id: "malaysian-hosted-database",
    category: "platform",
    title: "Malaysian-hosted production database decision",
    currentStatus: "decisionRequired",
    foundationEvidence: ["Cloudflare D1 foundation database is configured, but Malaysia data residency is not guaranteed."],
    productionNeeded: [
      "Decide whether Malaysia residency is mandatory for production PHI and financial records.",
      "If mandatory, select a Malaysia-hosted PostgreSQL provider or self-managed Malaysia region infrastructure.",
      "Document backup, restore, encryption, monitoring, DR, data processing agreements, and cross-border transfer basis.",
      "Keep D1 only for non-PHI edge foundation data unless residency and durability requirements are approved."
    ],
    providerDependencies: ["Malaysia-hosted PostgreSQL or approved database provider", "Backup/monitoring provider"],
    complianceDependencies: ["PDPA cross-border transfer assessment", "Clinic risk acceptance"],
    phase: "phase-1"
  },
  {
    id: "cloud-updates-devops",
    category: "platform",
    title: "Cloud-based deployment, automatic updates, monitoring, backup, and DR",
    currentStatus: "foundationOnly",
    foundationEvidence: ["Cloudflare Pages deployment scripts and docs exist."],
    productionNeeded: [
      "Create CI/CD with lint, tests, typecheck, build, database migration checks, preview deployments, and protected production promotion.",
      "Implement environment management, secrets rotation, rollback, monitoring, uptime checks, error tracking, audit log retention, backup, and DR drills.",
      "Define release notes and clinic downtime/maintenance communication process."
    ],
    providerDependencies: ["GitHub Actions or CI provider", "Monitoring/error tracking provider", "Backup storage provider"],
    complianceDependencies: ["Change management evidence", "Security incident response process"],
    phase: "phase-1"
  },
  {
    id: "support-onboarding",
    category: "support",
    title: "Standard support, priority support, assisted onboarding, and ongoing improvements",
    currentStatus: "notImplemented",
    foundationEvidence: ["Rollout documentation exists, but no product support workflow exists."],
    productionNeeded: [
      "Define support plans, SLAs, escalation paths, support intake, ticket categories, severity levels, and clinic admin contacts.",
      "Build assisted onboarding checklist for branch setup, service catalog, staff import, patient import, panel setup, stock opening balance, printer setup, and training.",
      "Add feedback intake, changelog, feature flag rollout, and post-release issue review process."
    ],
    providerDependencies: ["Support desk provider", "Knowledge base provider", "Status page provider"],
    complianceDependencies: ["Support access policy for PHI", "Vendor processor register"],
    phase: "phase-4"
  }
] as const satisfies readonly ProductCapability[];

export type ProductCapabilityId = (typeof productCapabilities)[number]["id"];

export const requiredProductionCapabilityIds = [
  "auth-mfa-staff-accounts",
  "rbac-abac-branch-isolation",
  "patient-registry-emr-history",
  "appointment-queue-scheduling",
  "consultation-mc-document-editor",
  "billing-invoices-panels-myinvois-payments",
  "inventory-upload-adjust-dispense-labels",
  "reporting-real-data",
  "multi-branch-shared-doctors",
  "malaysian-hosted-database",
  "cloud-updates-devops",
  "support-onboarding"
] as const satisfies readonly ProductCapabilityId[];

export function getCapabilityById(id: ProductCapabilityId): ProductCapability {
  const capability = productCapabilities.find((item) => item.id === id);

  if (!capability) {
    throw new Error(`Unknown product capability: ${id}`);
  }

  return capability;
}

export function getCapabilitiesByStatus(status: CapabilityStatus): ProductCapability[] {
  return productCapabilities.filter((capability) => capability.currentStatus === status);
}

