import { clinicWorkflowStates } from "./clinicWorkflow";
import { branches, inventoryBatches, medications, ownerKpis, publicServices, queueTickets } from "./data";
import type { BranchId, ClinicWorkflowState, InventoryBatch, OwnerKpi, QueueTicket, Role } from "./types";

export interface ValidationError {
  field: string;
  message: string;
}

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: ValidationError[] };

export type ConsentState = {
  pdpa: true;
  marketingOptIn?: boolean;
  smsReminder?: boolean;
};

export interface AppointmentBookingRequest {
  branchId: BranchId;
  serviceId: string;
  requestedAt: string;
  source: "public" | "staff";
  patient: {
    displayName: string;
    phoneNumber: string;
    dateOfBirth?: string;
    guardianName?: string;
  };
  consent: ConsentState;
  notes?: string;
}

export interface AppointmentBookingResponse {
  appointmentId: string;
  branchId: BranchId;
  serviceId: string;
  status: "pendingConfirmation";
  queueState: Extract<ClinicWorkflowState, "booked">;
  auditAction: AuditAction;
}

export interface PatientRegistrationRequest {
  branchId: BranchId;
  fullName: string;
  dateOfBirth: string;
  sex: "female" | "male" | "other" | "unknown";
  phoneNumber: string;
  registrationSource: "frontDesk" | "patientPortal";
  identityToken?: string;
  clinicalAlerts?: string[];
  consent: ConsentState;
}

export interface PatientRegistrationResponse {
  patientId: string;
  branchId: BranchId;
  status: "registered";
  auditAction: AuditAction;
}

export interface StockReceivingLineRequest {
  medicationId: string;
  batchNo: string;
  expiry: string;
  quantity: number;
  unitCostCents?: number;
}

export interface StockReceivingRequest {
  branchId: BranchId;
  supplierName: string;
  receivedBy: string;
  invoiceRef?: string;
  lines: StockReceivingLineRequest[];
}

export interface StockReceivingResponse {
  receiptId: string;
  branchId: BranchId;
  acceptedLineCount: number;
  quarantineLineIndexes: number[];
  auditAction: AuditAction;
}

export interface StockScanningRequest {
  branchId: BranchId;
  barcode: string;
  scannedBy: string;
  purpose: "dispense" | "receive" | "stocktake" | "recallCheck";
  medicationId?: string;
  batchNo?: string;
}

export interface StockScanningResponse {
  scanId: string;
  branchId: BranchId;
  status: "accepted" | "needsReview";
  auditAction: AuditAction;
}

export interface OwnerExportRequest {
  requestedByRole: Extract<Role, "owner" | "systemAdmin">;
  branchIds?: BranchId[];
  dateRange: {
    from: string;
    to: string;
  };
  includeQueueMetrics?: boolean;
  includeMedicineRisk?: boolean;
}

export interface OwnerQueueExport {
  branchId: BranchId;
  totalTickets: number;
  averageWaitingMinutes: number;
  byState: Record<ClinicWorkflowState, number>;
}

export interface OwnerMedicineRiskExport {
  branchId: BranchId;
  expiringWithin90Days: number;
  recalledBatches: number;
  lowStockBatches: number;
}

export interface OwnerExportResponse {
  exportId: string;
  generatedAt: string;
  scope: {
    branchIds: BranchId[];
  };
  queueByBranch: OwnerQueueExport[];
  medicineRiskByBranch: OwnerMedicineRiskExport[];
  kpis: OwnerKpi[];
  redactions: string[];
}

export type AuditAction =
  | "appointment.booking.requested"
  | "patient.registration.created"
  | "stock.received"
  | "stock.scanned"
  | "owner.export.generated"
  | "audit.event.created";

export interface AuditEventCreateRequest {
  actorId: string;
  actorRole: Role;
  action: AuditAction;
  occurredAt: string;
  outcome: "success" | "denied" | "validationFailed";
  resourceType: "appointment" | "patient" | "stock" | "ownerExport" | "audit";
  branchId?: BranchId;
  resourceId?: string;
  reason?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface AuditEventCreateResponse {
  auditEventId: string;
  accepted: true;
}

export interface OwnerExportSource {
  queueTickets?: QueueTicket[];
  inventoryBatches?: InventoryBatch[];
  ownerKpis?: OwnerKpi[];
}

export const safeWorkflowSamples = {
  appointmentBooking: {
    branchId: "puncak-alam",
    serviceId: "antenatal",
    requestedAt: "2030-05-01T02:30:00.000Z",
    source: "public",
    patient: {
      displayName: "Sample Patient",
      phoneNumber: "+60000000000"
    },
    consent: {
      pdpa: true,
      smsReminder: true,
      marketingOptIn: false
    },
    notes: "Synthetic booking sample for contract tests."
  },
  patientRegistration: {
    branchId: "puncak-alam",
    fullName: "Sample Patient",
    dateOfBirth: "1990-01-01",
    sex: "unknown",
    phoneNumber: "+60000000000",
    registrationSource: "frontDesk",
    identityToken: "vault-token-sample-patient",
    clinicalAlerts: ["No known allergies recorded in sample data"],
    consent: {
      pdpa: true,
      smsReminder: true
    }
  },
  stockReceiving: {
    branchId: "puncak-alam",
    supplierName: "Sample Licensed Supplier",
    receivedBy: "staff-sample",
    invoiceRef: "INV-SAMPLE-001",
    lines: [
      {
        medicationId: "med-paracetamol",
        batchNo: "PA-2801",
        expiry: "2028-12-31",
        quantity: 120,
        unitCostCents: 12
      }
    ]
  },
  stockScanning: {
    branchId: "puncak-alam",
    barcode: "MED-PARA-PA-2801",
    scannedBy: "staff-sample",
    purpose: "stocktake",
    medicationId: "med-paracetamol",
    batchNo: "PA-2801"
  },
  ownerExport: {
    requestedByRole: "owner",
    branchIds: ["puncak-alam", "bukit-jelutong", "seremban-2"],
    dateRange: {
      from: "2026-05-01",
      to: "2026-05-31"
    },
    includeQueueMetrics: true,
    includeMedicineRisk: true
  },
  auditEvent: {
    actorId: "staff-sample",
    actorRole: "branchManager",
    action: "stock.scanned",
    occurredAt: "2026-05-01T08:00:00.000Z",
    outcome: "success",
    resourceType: "stock",
    branchId: "puncak-alam",
    resourceId: "scan-sample",
    metadata: {
      queueDepth: 4,
      source: "contract-test"
    }
  }
} satisfies {
  appointmentBooking: AppointmentBookingRequest;
  patientRegistration: PatientRegistrationRequest;
  stockReceiving: StockReceivingRequest;
  stockScanning: StockScanningRequest;
  ownerExport: OwnerExportRequest;
  auditEvent: AuditEventCreateRequest;
};

const branchIds = new Set<BranchId>(branches.map((branch) => branch.id));
const publicServiceIds = new Set(publicServices.map((service) => service.id));
const medicationIds = new Set(medications.map((medication) => medication.id));
const roles = new Set<Role>([
  "patient",
  "guardian",
  "reception",
  "clinicAssistant",
  "doctor",
  "dispenser",
  "finance",
  "branchManager",
  "owner",
  "marketing",
  "systemAdmin"
]);
const appointmentSources = new Set<AppointmentBookingRequest["source"]>(["public", "staff"]);
const sexValues = new Set<PatientRegistrationRequest["sex"]>(["female", "male", "other", "unknown"]);
const registrationSources = new Set<PatientRegistrationRequest["registrationSource"]>(["frontDesk", "patientPortal"]);
const stockScanPurposes = new Set<StockScanningRequest["purpose"]>(["dispense", "receive", "stocktake", "recallCheck"]);
const ownerExportRoles = new Set<Role>(["owner", "systemAdmin"]);
const auditActions = new Set<AuditAction>([
  "appointment.booking.requested",
  "patient.registration.created",
  "stock.received",
  "stock.scanned",
  "owner.export.generated",
  "audit.event.created"
]);
const auditOutcomes = new Set<AuditEventCreateRequest["outcome"]>(["success", "denied", "validationFailed"]);
const auditResourceTypes = new Set<AuditEventCreateRequest["resourceType"]>(["appointment", "patient", "stock", "ownerExport", "audit"]);
const redactedOwnerExportFields = ["queueTickets.patientName", "queueTickets.id", "queueTickets.assignedTo", "audit.metadata.phi"];

const rawIdentifierKeyFragments = [
  "nric",
  "mykad",
  "passport",
  "identitycard",
  "identitynumber",
  "identification",
  "nationalid",
  "icnumber",
  "idnumber"
];

const phiKeyFragments = [
  ...rawIdentifierKeyFragments,
  "patientname",
  "fullname",
  "displayname",
  "phonenumber",
  "phone",
  "email",
  "dateofbirth",
  "dob",
  "address",
  "diagnosis",
  "allergy"
];

export function validateAppointmentBookingRequest(input: unknown): ValidationResult<AppointmentBookingRequest> {
  const errors: ValidationError[] = [];
  const record = requireRecord(input, "request", errors);

  if (!record) {
    return invalid(errors);
  }

  validateBranchId(record.branchId, "branchId", errors);
  validateRequiredString(record.serviceId, "serviceId", errors);
  validateSetValue(record.serviceId, publicServiceIds, "serviceId", "Unknown public service.", errors);
  validateIsoDateTime(record.requestedAt, "requestedAt", errors);
  validateSetValue(record.source, appointmentSources, "source", "Source must be public or staff.", errors);
  validateConsent(record.consent, "consent", errors);
  validateOptionalString(record.notes, "notes", 500, errors);
  collectRawIdentifierFields(record, "", errors);

  const patient = requireRecord(record.patient, "patient", errors);
  if (patient) {
    validateRequiredString(patient.displayName, "patient.displayName", errors);
    validateRequiredString(patient.phoneNumber, "patient.phoneNumber", errors);
    validateOptionalDateOnly(patient.dateOfBirth, "patient.dateOfBirth", errors);
    validateOptionalString(patient.guardianName, "patient.guardianName", 120, errors);
  }

  return toResult(input, errors);
}

export function validatePatientRegistrationRequest(input: unknown): ValidationResult<PatientRegistrationRequest> {
  const errors: ValidationError[] = [];
  const record = requireRecord(input, "request", errors);

  if (!record) {
    return invalid(errors);
  }

  validateBranchId(record.branchId, "branchId", errors);
  validateRequiredString(record.fullName, "fullName", errors);
  validateDateOnly(record.dateOfBirth, "dateOfBirth", errors);
  validateSetValue(record.sex, sexValues, "sex", "Sex must be female, male, other, or unknown.", errors);
  validateRequiredString(record.phoneNumber, "phoneNumber", errors);
  validateSetValue(record.registrationSource, registrationSources, "registrationSource", "Registration source is invalid.", errors);
  validateOptionalString(record.identityToken, "identityToken", 120, errors);
  validateConsent(record.consent, "consent", errors);
  collectRawIdentifierFields(record, "", errors);

  if (record.clinicalAlerts !== undefined) {
    if (!Array.isArray(record.clinicalAlerts)) {
      errors.push({ field: "clinicalAlerts", message: "Clinical alerts must be an array." });
    } else {
      record.clinicalAlerts.forEach((alert, index) => validateRequiredString(alert, `clinicalAlerts[${index}]`, errors));
    }
  }

  return toResult(input, errors);
}

export function validateStockReceivingRequest(input: unknown): ValidationResult<StockReceivingRequest> {
  const errors: ValidationError[] = [];
  const record = requireRecord(input, "request", errors);

  if (!record) {
    return invalid(errors);
  }

  validateBranchId(record.branchId, "branchId", errors);
  validateRequiredString(record.supplierName, "supplierName", errors);
  validateRequiredString(record.receivedBy, "receivedBy", errors);
  validateOptionalString(record.invoiceRef, "invoiceRef", 120, errors);

  if (!Array.isArray(record.lines) || record.lines.length === 0) {
    errors.push({ field: "lines", message: "At least one stock receiving line is required." });
  } else {
    record.lines.forEach((line, index) => validateStockReceivingLine(line, index, errors));
  }

  return toResult(input, errors);
}

export function validateStockScanningRequest(input: unknown): ValidationResult<StockScanningRequest> {
  const errors: ValidationError[] = [];
  const record = requireRecord(input, "request", errors);

  if (!record) {
    return invalid(errors);
  }

  validateBranchId(record.branchId, "branchId", errors);
  validateRequiredString(record.barcode, "barcode", errors);
  validateRequiredString(record.scannedBy, "scannedBy", errors);
  validateSetValue(record.purpose, stockScanPurposes, "purpose", "Stock scan purpose is invalid.", errors);
  validateOptionalString(record.medicationId, "medicationId", 120, errors);
  validateOptionalString(record.batchNo, "batchNo", 80, errors);
  collectDisallowedPhiFields(record, "", errors);

  return toResult(input, errors);
}

export function validateOwnerExportRequest(input: unknown): ValidationResult<OwnerExportRequest> {
  const errors: ValidationError[] = [];
  const record = requireRecord(input, "request", errors);

  if (!record) {
    return invalid(errors);
  }

  validateSetValue(record.requestedByRole, ownerExportRoles, "requestedByRole", "Owner export is limited to owner and system admin roles.", errors);

  if (record.branchIds !== undefined) {
    if (!Array.isArray(record.branchIds) || record.branchIds.length === 0) {
      errors.push({ field: "branchIds", message: "Branch scope must include at least one branch." });
    } else {
      const seenBranches = new Set<string>();
      record.branchIds.forEach((branchId, index) => {
        validateBranchId(branchId, `branchIds[${index}]`, errors);
        if (typeof branchId === "string" && seenBranches.has(branchId)) {
          errors.push({ field: `branchIds[${index}]`, message: "Branch scope cannot contain duplicates." });
        }
        if (typeof branchId === "string") {
          seenBranches.add(branchId);
        }
      });
    }
  }

  const dateRange = requireRecord(record.dateRange, "dateRange", errors);
  if (dateRange) {
    validateDateOnly(dateRange.from, "dateRange.from", errors);
    validateDateOnly(dateRange.to, "dateRange.to", errors);

    if (typeof dateRange.from === "string" && typeof dateRange.to === "string" && dateRange.from > dateRange.to) {
      errors.push({ field: "dateRange", message: "Date range start must be before or equal to end." });
    }
  }

  validateOptionalBoolean(record.includeQueueMetrics, "includeQueueMetrics", errors);
  validateOptionalBoolean(record.includeMedicineRisk, "includeMedicineRisk", errors);
  collectDisallowedPhiFields(record, "", errors);

  return toResult(input, errors);
}

export function validateAuditEventCreateRequest(input: unknown): ValidationResult<AuditEventCreateRequest> {
  const errors: ValidationError[] = [];
  const record = requireRecord(input, "request", errors);

  if (!record) {
    return invalid(errors);
  }

  validateRequiredString(record.actorId, "actorId", errors);
  validateSetValue(record.actorRole, roles, "actorRole", "Actor role is invalid.", errors);
  validateSetValue(record.action, auditActions, "action", "Audit action is invalid.", errors);
  validateIsoDateTime(record.occurredAt, "occurredAt", errors);
  validateSetValue(record.outcome, auditOutcomes, "outcome", "Audit outcome is invalid.", errors);
  validateSetValue(record.resourceType, auditResourceTypes, "resourceType", "Audit resource type is invalid.", errors);
  validateOptionalString(record.resourceId, "resourceId", 120, errors);
  validateOptionalString(record.reason, "reason", 500, errors);

  if (record.branchId !== undefined) {
    validateBranchId(record.branchId, "branchId", errors);
  }

  if (record.metadata !== undefined) {
    validateAuditMetadata(record.metadata, errors);
  }

  return toResult(input, errors);
}

export function buildPhiSafeOwnerExport(
  request: OwnerExportRequest,
  generatedAt = new Date(),
  source: OwnerExportSource = {}
): OwnerExportResponse {
  const scopedBranchIds = request.branchIds ?? branches.map((branch) => branch.id);
  const scopedBranches = new Set<BranchId>(scopedBranchIds);
  const sourceTickets = source.queueTickets ?? queueTickets;
  const sourceBatches = source.inventoryBatches ?? inventoryBatches;
  const generatedAtIso = generatedAt.toISOString();

  return {
    exportId: `owner-export-${generatedAtIso.slice(0, 10)}`,
    generatedAt: generatedAtIso,
    scope: {
      branchIds: scopedBranchIds
    },
    queueByBranch:
      request.includeQueueMetrics === false
        ? []
        : scopedBranchIds.map((branchId) => buildQueueExport(branchId, sourceTickets.filter((ticket) => ticket.branchId === branchId))),
    medicineRiskByBranch:
      request.includeMedicineRisk === false
        ? []
        : scopedBranchIds.map((branchId) =>
            buildMedicineRiskExport(
              branchId,
              sourceBatches.filter((batch) => batch.branchId === branchId && scopedBranches.has(batch.branchId)),
              generatedAt
            )
          ),
    kpis: source.ownerKpis ?? ownerKpis,
    redactions: redactedOwnerExportFields
  };
}

function validateStockReceivingLine(input: unknown, index: number, errors: ValidationError[]): void {
  const line = requireRecord(input, `lines[${index}]`, errors);

  if (!line) {
    return;
  }

  validateRequiredString(line.medicationId, `lines[${index}].medicationId`, errors);
  validateSetValue(line.medicationId, medicationIds, `lines[${index}].medicationId`, "Unknown medication.", errors);
  validateRequiredString(line.batchNo, `lines[${index}].batchNo`, errors);
  validateFutureDateOnly(line.expiry, `lines[${index}].expiry`, errors);
  validatePositiveInteger(line.quantity, `lines[${index}].quantity`, errors);

  if (line.unitCostCents !== undefined) {
    validateNonNegativeInteger(line.unitCostCents, `lines[${index}].unitCostCents`, errors);
  }
}

function validateAuditMetadata(input: unknown, errors: ValidationError[]): void {
  const metadata = requireRecord(input, "metadata", errors);

  if (!metadata) {
    return;
  }

  collectDisallowedPhiFields(metadata, "metadata", errors);

  for (const [key, value] of Object.entries(metadata)) {
    const field = `metadata.${key}`;

    if (value !== null && typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
      errors.push({ field, message: "Audit metadata values must be primitive." });
    }

    if (typeof value === "string" && containsRawIdentifierValue(value)) {
      errors.push({ field, message: "Audit metadata must not contain raw sensitive identifiers." });
    }
  }
}

function buildQueueExport(branchId: BranchId, tickets: QueueTicket[]): OwnerQueueExport {
  const byState = emptyWorkflowStateCounts();

  for (const ticket of tickets) {
    byState[ticket.state] += 1;
  }

  return {
    branchId,
    totalTickets: tickets.length,
    averageWaitingMinutes: tickets.length === 0 ? 0 : Math.round(tickets.reduce((sum, ticket) => sum + ticket.waitingMinutes, 0) / tickets.length),
    byState
  };
}

function buildMedicineRiskExport(branchId: BranchId, batches: InventoryBatch[], generatedAt: Date): OwnerMedicineRiskExport {
  const riskWindowEnd = new Date(generatedAt);
  riskWindowEnd.setUTCDate(riskWindowEnd.getUTCDate() + 90);

  return {
    branchId,
    expiringWithin90Days: batches.filter((batch) => {
      const expiry = parseDateOnly(batch.expiry);
      return expiry !== null && expiry <= riskWindowEnd;
    }).length,
    recalledBatches: batches.filter((batch) => batch.status === "recalled").length,
    lowStockBatches: batches.filter((batch) => batch.quantity > 0 && batch.quantity < 25).length
  };
}

function emptyWorkflowStateCounts(): Record<ClinicWorkflowState, number> {
  return Object.fromEntries(clinicWorkflowStates.map((state) => [state, 0])) as Record<ClinicWorkflowState, number>;
}

function requireRecord(input: unknown, field: string, errors: ValidationError[]): Record<string, unknown> | undefined {
  if (isRecord(input)) {
    return input;
  }

  errors.push({ field, message: "Expected an object." });
  return undefined;
}

function validateBranchId(value: unknown, field: string, errors: ValidationError[]): void {
  validateSetValue(value, branchIds, field, "Branch is not supported.", errors);
}

function validateRequiredString(value: unknown, field: string, errors: ValidationError[], maxLength = 160): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push({ field, message: "Required string is missing." });
    return;
  }

  if (value.length > maxLength) {
    errors.push({ field, message: `Must be ${maxLength} characters or fewer.` });
  }
}

function validateOptionalString(value: unknown, field: string, maxLength: number, errors: ValidationError[]): void {
  if (value === undefined) {
    return;
  }

  if (typeof value !== "string") {
    errors.push({ field, message: "Expected a string." });
    return;
  }

  if (value.length > maxLength) {
    errors.push({ field, message: `Must be ${maxLength} characters or fewer.` });
  }
}

function validateOptionalBoolean(value: unknown, field: string, errors: ValidationError[]): void {
  if (value !== undefined && typeof value !== "boolean") {
    errors.push({ field, message: "Expected a boolean." });
  }
}

function validateSetValue<T extends string>(value: unknown, set: ReadonlySet<T>, field: string, message: string, errors: ValidationError[]): void {
  if (typeof value !== "string" || !set.has(value as T)) {
    errors.push({ field, message });
  }
}

function validateConsent(value: unknown, field: string, errors: ValidationError[]): void {
  const consent = requireRecord(value, field, errors);

  if (!consent) {
    return;
  }

  if (consent.pdpa !== true) {
    errors.push({ field: `${field}.pdpa`, message: "PDPA consent must be explicitly true." });
  }

  validateOptionalBoolean(consent.marketingOptIn, `${field}.marketingOptIn`, errors);
  validateOptionalBoolean(consent.smsReminder, `${field}.smsReminder`, errors);
}

function validateIsoDateTime(value: unknown, field: string, errors: ValidationError[]): void {
  if (typeof value !== "string" || !value.includes("T") || Number.isNaN(Date.parse(value))) {
    errors.push({ field, message: "Expected an ISO date-time string." });
  }
}

function validateDateOnly(value: unknown, field: string, errors: ValidationError[]): void {
  if (typeof value !== "string" || parseDateOnly(value) === null) {
    errors.push({ field, message: "Expected a YYYY-MM-DD date." });
  }
}

function validateOptionalDateOnly(value: unknown, field: string, errors: ValidationError[]): void {
  if (value !== undefined) {
    validateDateOnly(value, field, errors);
  }
}

function validateFutureDateOnly(value: unknown, field: string, errors: ValidationError[]): void {
  if (typeof value !== "string") {
    errors.push({ field, message: "Expected a YYYY-MM-DD date." });
    return;
  }

  const parsed = parseDateOnly(value);
  if (parsed === null) {
    errors.push({ field, message: "Expected a YYYY-MM-DD date." });
    return;
  }

  if (value < new Date().toISOString().slice(0, 10)) {
    errors.push({ field, message: "Expiry must not be in the past." });
  }
}

function validatePositiveInteger(value: unknown, field: string, errors: ValidationError[]): void {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    errors.push({ field, message: "Expected a positive integer." });
  }
}

function validateNonNegativeInteger(value: unknown, field: string, errors: ValidationError[]): void {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    errors.push({ field, message: "Expected a non-negative integer." });
  }
}

function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return null;
  }

  return date;
}

function collectRawIdentifierFields(input: unknown, path: string, errors: ValidationError[]): void {
  collectUnsafeFields(input, path, errors, isRawIdentifierKey, "Raw sensitive identifiers must be tokenized before entering domain workflows.");
}

function collectDisallowedPhiFields(input: unknown, path: string, errors: ValidationError[]): void {
  collectUnsafeFields(input, path, errors, isPhiKey, "PHI is not allowed in this workflow payload.");
}

function collectUnsafeFields(
  input: unknown,
  path: string,
  errors: ValidationError[],
  isUnsafeKey: (key: string) => boolean,
  message: string
): void {
  if (Array.isArray(input)) {
    input.forEach((item, index) => collectUnsafeFields(item, `${path}[${index}]`, errors, isUnsafeKey, message));
    return;
  }

  if (!isRecord(input)) {
    return;
  }

  for (const [key, value] of Object.entries(input)) {
    const field = path ? `${path}.${key}` : key;

    if (isUnsafeKey(key)) {
      errors.push({ field, message });
    }

    collectUnsafeFields(value, field, errors, isUnsafeKey, message);
  }
}

function isRawIdentifierKey(key: string): boolean {
  const normalized = normalizeKey(key);

  if (normalized.endsWith("token") || normalized.endsWith("ref")) {
    return false;
  }

  return rawIdentifierKeyFragments.some((fragment) => normalized.includes(fragment));
}

function isPhiKey(key: string): boolean {
  const normalized = normalizeKey(key);

  if (normalized.endsWith("token") || normalized.endsWith("ref")) {
    return false;
  }

  return phiKeyFragments.some((fragment) => normalized.includes(fragment));
}

function containsRawIdentifierValue(value: string): boolean {
  return /\b\d{6}[- ]?\d{2}[- ]?\d{4}\b/.test(value);
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function toResult<T>(input: unknown, errors: ValidationError[]): ValidationResult<T> {
  if (errors.length > 0) {
    return invalid(errors);
  }

  return { ok: true, value: input as T };
}

function invalid(errors: ValidationError[]): ValidationResult<never> {
  return { ok: false, errors };
}
