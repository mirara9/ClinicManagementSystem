import { clinicWorkflowStates, type ClinicWorkflowState } from "@usrahmedic/domain";

const labels: Record<ClinicWorkflowState, string> = {
  booked: "Booked",
  walkIn: "Walk-in",
  arrived: "Arrived",
  registered: "Registered",
  triaged: "Triaged",
  waiting: "Waiting",
  called: "Called",
  inConsult: "Consult",
  ordersPending: "Orders",
  dispenseBill: "Dispense and bill",
  discharged: "Discharged",
  referred: "Referred",
  followUp: "Follow-up"
};

export function WorkflowRail({ current }: { current: ClinicWorkflowState }) {
  const activeIndex = clinicWorkflowStates.indexOf(current);

  return (
    <div className="workflow">
      {clinicWorkflowStates.slice(0, 11).map((state, index) => (
        <div className="workflow-step" key={state}>
          <span className={`step-dot ${index <= activeIndex ? "" : "muted"}`}>{index + 1}</span>
          <div>
            <strong>{labels[state]}</strong>
            <p className="muted">{state === current ? "Current station" : index < activeIndex ? "Completed" : "Pending"}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
