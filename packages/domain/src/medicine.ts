import type { DispenseState, InventoryBatch, Medication, Role } from "./types";

export const dispenseWorkflow: DispenseState[] = [
  "prescribed",
  "screened",
  "clarified",
  "prepared",
  "labelled",
  "checked",
  "counterChecked",
  "issued",
  "counselled"
];

export interface DispenseDecision {
  allowed: boolean;
  reasons: string[];
  requiresCounterCheck: boolean;
  requiresLegalRegister: boolean;
}

export function evaluateDispense(medication: Medication, batch: InventoryBatch, role: Role, today = new Date()): DispenseDecision {
  const reasons: string[] = [];

  if (role !== "doctor" && role !== "dispenser" && role !== "branchManager" && role !== "systemAdmin") {
    reasons.push("Role is not allowed to dispense medicine.");
  }

  if (batch.status !== "available") {
    reasons.push(`Batch is ${batch.status}.`);
  }

  if (new Date(`${batch.expiry}T00:00:00`) < today) {
    reasons.push("Batch is expired.");
  }

  if (medication.recallStatus === "recalled") {
    reasons.push("Medication is recalled.");
  }

  if (batch.quantity <= 0) {
    reasons.push("Batch has no available quantity.");
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    requiresCounterCheck: medication.highAlert || medication.psychotropic || medication.dangerousDrug,
    requiresLegalRegister: medication.poisonGroup !== "none" || medication.psychotropic || medication.dangerousDrug
  };
}

export function buildDispenseLabel(medication: Medication, patientName: string, branchName: string): string[] {
  const lines = [
    branchName,
    `Patient: ${patientName}`,
    `${medication.brandName} (${medication.genericName}) ${medication.strength}`,
    `Form/route: ${medication.dosageForm} / ${medication.route}`,
    "Directions: As prescribed",
    "Supply date: today"
  ];

  if (medication.poisonGroup !== "none" || medication.psychotropic || medication.dangerousDrug) {
    lines.push("Controlled Medicine / Ubat Terkawal");
  }

  if (medication.coldChain) {
    lines.push("Keep refrigerated. Do not freeze.");
  }

  return lines;
}
