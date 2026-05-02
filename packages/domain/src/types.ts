export type BranchId = "puncak-alam" | "bukit-jelutong" | "seremban-2";

export type AppSurface = "public" | "admin" | "medicine" | "insight" | "patient" | "staff";

export type Role =
  | "patient"
  | "guardian"
  | "reception"
  | "clinicAssistant"
  | "doctor"
  | "dispenser"
  | "finance"
  | "branchManager"
  | "owner"
  | "marketing"
  | "systemAdmin";

export type Permission =
  | "patient.read"
  | "patient.write"
  | "queue.manage"
  | "encounter.write"
  | "prescription.write"
  | "dispense.manage"
  | "stock.manage"
  | "billing.manage"
  | "claim.manage"
  | "insight.read"
  | "cms.manage"
  | "compliance.manage"
  | "admin.manage";

export type ClinicWorkflowState =
  | "booked"
  | "walkIn"
  | "arrived"
  | "registered"
  | "triaged"
  | "waiting"
  | "called"
  | "inConsult"
  | "ordersPending"
  | "dispenseBill"
  | "discharged"
  | "referred"
  | "followUp";

export type DispenseState =
  | "prescribed"
  | "screened"
  | "clarified"
  | "prepared"
  | "labelled"
  | "checked"
  | "counterChecked"
  | "issued"
  | "counselled"
  | "reversed"
  | "voided";

export interface Branch {
  id: BranchId;
  name: string;
  area: string;
  hours: string;
  hotline: string;
  services: string[];
  queueLoad: number;
}

export interface PublicService {
  id: string;
  title: string;
  summary: string;
  journey: "family" | "womenChildren" | "urgent" | "chronic" | "campaign";
  appointment: "walkIn" | "appointment" | "either";
}

export interface QueueTicket {
  id: string;
  patientName: string;
  branchId: BranchId;
  state: ClinicWorkflowState;
  service: string;
  triage: "routine" | "priority" | "urgent";
  assignedTo: string;
  waitingMinutes: number;
}

export interface Medication {
  id: string;
  genericName: string;
  brandName: string;
  activeIngredients: string[];
  strength: string;
  dosageForm: string;
  route: string;
  malNumber: string;
  poisonGroup: "none" | "B" | "C";
  psychotropic: boolean;
  dangerousDrug: boolean;
  controlledFlags: string[];
  coldChain: boolean;
  highAlert: boolean;
  lasa: boolean;
  recallStatus: "clear" | "watch" | "recalled";
}

export interface InventoryBatch {
  id: string;
  medicationId: string;
  branchId: BranchId;
  batchNo: string;
  expiry: string;
  quantity: number;
  status: "available" | "quarantined" | "expired" | "recalled";
}

export interface ComplianceControl {
  id: string;
  area: "PDPA" | "CKAPS" | "MMC" | "OHS" | "MAB" | "Medicine" | "Security";
  title: string;
  implementation: string;
  status: "foundation" | "needsLegalReview" | "blockedUntilProvider";
}

export interface OwnerKpi {
  label: string;
  value: string;
  trend: string;
  risk: "low" | "medium" | "high";
}
