import type { ClinicWorkflowState, QueueTicket, Role } from "./types";

export const clinicWorkflowStates: ClinicWorkflowState[] = [
  "booked",
  "walkIn",
  "arrived",
  "registered",
  "triaged",
  "waiting",
  "called",
  "inConsult",
  "ordersPending",
  "dispenseBill",
  "discharged",
  "referred",
  "followUp"
];

export const clinicTransitions: Record<ClinicWorkflowState, ClinicWorkflowState[]> = {
  booked: ["arrived"],
  walkIn: ["registered"],
  arrived: ["registered"],
  registered: ["triaged", "waiting"],
  triaged: ["waiting", "called", "referred"],
  waiting: ["called"],
  called: ["inConsult", "waiting"],
  inConsult: ["ordersPending", "dispenseBill", "referred", "followUp"],
  ordersPending: ["inConsult", "dispenseBill", "referred"],
  dispenseBill: ["discharged", "followUp"],
  discharged: ["followUp"],
  referred: ["followUp"],
  followUp: []
};

const restrictedTransitions = new Set<ClinicWorkflowState>(["inConsult", "ordersPending", "referred"]);

export function canTransition(from: ClinicWorkflowState, to: ClinicWorkflowState, role: Role): boolean {
  if (!clinicTransitions[from].includes(to)) {
    return false;
  }

  if (restrictedTransitions.has(to)) {
    return role === "doctor" || role === "clinicAssistant" || role === "branchManager";
  }

  if (to === "dispenseBill") {
    return role === "doctor" || role === "dispenser" || role === "finance" || role === "branchManager";
  }

  return role !== "patient" && role !== "guardian";
}

export function nextStates(ticket: QueueTicket, role: Role): ClinicWorkflowState[] {
  return clinicTransitions[ticket.state].filter((state) => canTransition(ticket.state, state, role));
}

export function transitionTicket(ticket: QueueTicket, to: ClinicWorkflowState, role: Role): QueueTicket {
  if (!canTransition(ticket.state, to, role)) {
    throw new Error(`Role ${role} cannot transition ${ticket.id} from ${ticket.state} to ${to}`);
  }

  return {
    ...ticket,
    state: to
  };
}
