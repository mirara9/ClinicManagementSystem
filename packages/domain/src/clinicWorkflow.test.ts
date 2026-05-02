import { describe, expect, it } from "vitest";
import { queueTickets } from "./data";
import { canTransition, nextStates, transitionTicket } from "./clinicWorkflow";

describe("clinic workflow", () => {
  it("allows clinical staff to move triaged patients into consult", () => {
    const ticket = queueTickets[0];
    const called = transitionTicket(ticket, "waiting", "clinicAssistant");
    const inRoom = transitionTicket({ ...called, state: "called" }, "inConsult", "doctor");

    expect(inRoom.state).toBe("inConsult");
  });

  it("blocks patient users from moving queue states", () => {
    expect(canTransition("registered", "waiting", "patient")).toBe(false);
  });

  it("returns role-aware next states", () => {
    const states = nextStates({ ...queueTickets[1], state: "ordersPending" }, "doctor");

    expect(states).toContain("dispenseBill");
    expect(states).toContain("referred");
  });
});
