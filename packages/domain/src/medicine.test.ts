import { describe, expect, it } from "vitest";
import { inventoryBatches, medications } from "./data";
import { buildDispenseLabel, evaluateDispense } from "./medicine";

describe("medicine safety", () => {
  it("requires legal register for controlled medicine", () => {
    const medication = medications.find((item) => item.id === "med-tramadol");
    const batch = inventoryBatches.find((item) => item.medicationId === "med-tramadol");

    if (!medication || !batch) {
      throw new Error("Test seed missing controlled medication");
    }

    const decision = evaluateDispense(medication, batch, "dispenser", new Date("2026-05-01T00:00:00"));

    expect(decision.allowed).toBe(true);
    expect(decision.requiresCounterCheck).toBe(true);
    expect(decision.requiresLegalRegister).toBe(true);
  });

  it("blocks recalled medication", () => {
    const medication = { ...medications[0], recallStatus: "recalled" as const };
    const decision = evaluateDispense(medication, inventoryBatches[0], "dispenser");

    expect(decision.allowed).toBe(false);
    expect(decision.reasons).toContain("Medication is recalled.");
  });

  it("adds controlled medicine text to labels", () => {
    const medication = medications.find((item) => item.id === "med-tramadol");

    if (!medication) {
      throw new Error("Test seed missing controlled medication");
    }

    expect(buildDispenseLabel(medication, "Nur Aina", "UsrahMedic Puncak Alam")).toContain("Controlled Medicine / Ubat Terkawal");
  });
});
