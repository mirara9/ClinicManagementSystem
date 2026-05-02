import type { AppSurface, BranchId, Permission, Role } from "./types";

export const rolePermissions: Record<Role, Permission[]> = {
  patient: ["patient.read"],
  guardian: ["patient.read"],
  reception: ["patient.read", "patient.write", "queue.manage", "billing.manage"],
  clinicAssistant: ["patient.read", "patient.write", "queue.manage", "encounter.write"],
  doctor: ["patient.read", "encounter.write", "prescription.write"],
  dispenser: ["patient.read", "dispense.manage", "stock.manage"],
  finance: ["billing.manage", "claim.manage", "patient.read"],
  branchManager: [
    "patient.read",
    "patient.write",
    "queue.manage",
    "encounter.write",
    "dispense.manage",
    "stock.manage",
    "billing.manage",
    "claim.manage",
    "insight.read",
    "compliance.manage"
  ],
  owner: ["insight.read", "billing.manage", "claim.manage", "compliance.manage", "admin.manage"],
  marketing: ["cms.manage", "insight.read"],
  systemAdmin: [
    "patient.read",
    "patient.write",
    "queue.manage",
    "encounter.write",
    "prescription.write",
    "dispense.manage",
    "stock.manage",
    "billing.manage",
    "claim.manage",
    "insight.read",
    "cms.manage",
    "compliance.manage",
    "admin.manage"
  ]
};

export const surfaceRoles: Record<AppSurface, Role[]> = {
  public: ["patient", "guardian", "marketing", "owner", "systemAdmin"],
  patient: ["patient", "guardian", "systemAdmin"],
  staff: ["reception", "clinicAssistant", "doctor", "dispenser", "finance", "branchManager", "owner", "systemAdmin"],
  admin: ["reception", "clinicAssistant", "doctor", "finance", "branchManager", "owner", "systemAdmin"],
  medicine: ["doctor", "dispenser", "branchManager", "owner", "systemAdmin"],
  insight: ["branchManager", "owner", "marketing", "systemAdmin"]
};

export interface AccessContext {
  role: Role;
  assignedBranches: BranchId[];
  activeBranch: BranchId;
  patientBranch: BranchId;
  isCareTeamMember?: boolean;
  isGuardianOfPatient?: boolean;
  breakGlassReason?: string;
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role].includes(permission);
}

export function canAccessSurface(role: Role, surface: AppSurface): boolean {
  return surfaceRoles[surface].includes(role);
}

export function canAccessPatient(context: AccessContext): boolean {
  if (context.role === "owner" || context.role === "systemAdmin") {
    return true;
  }

  if (context.role === "patient" || context.role === "guardian") {
    return Boolean(context.isGuardianOfPatient);
  }

  if (!context.assignedBranches.includes(context.patientBranch)) {
    return Boolean(context.breakGlassReason && context.role === "doctor");
  }

  return hasPermission(context.role, "patient.read") && (context.activeBranch === context.patientBranch || Boolean(context.isCareTeamMember));
}
