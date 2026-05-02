import { describe, expect, it } from "vitest";
import { canAccessPatient, canAccessSurface, hasPermission } from "./permissions";

describe("permissions", () => {
  it("allows owner to access insights", () => {
    expect(canAccessSurface("owner", "insight")).toBe(true);
    expect(hasPermission("owner", "insight.read")).toBe(true);
  });

  it("blocks branch staff from unrelated branch patients without break glass", () => {
    expect(
      canAccessPatient({
        role: "reception",
        activeBranch: "puncak-alam",
        assignedBranches: ["puncak-alam"],
        patientBranch: "seremban-2"
      })
    ).toBe(false);
  });

  it("allows doctor break-glass access only with reason", () => {
    expect(
      canAccessPatient({
        role: "doctor",
        activeBranch: "puncak-alam",
        assignedBranches: ["puncak-alam"],
        patientBranch: "seremban-2",
        breakGlassReason: "Emergency transfer review"
      })
    ).toBe(true);
  });
});
