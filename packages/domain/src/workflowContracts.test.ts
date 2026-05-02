import { describe, expect, it } from "vitest";
import { queueTickets } from "./data";
import {
  buildPhiSafeOwnerExport,
  safeWorkflowSamples,
  validateAppointmentBookingRequest,
  validateAuditEventCreateRequest,
  validateOwnerExportRequest,
  validatePatientRegistrationRequest,
  validateStockReceivingRequest,
  validateStockScanningRequest,
  type ValidationResult
} from "./workflowContracts";

function expectInvalid(result: ValidationResult<unknown>): string[] {
  expect(result.ok).toBe(false);

  if (result.ok) {
    throw new Error("Expected invalid validation result");
  }

  return result.errors.map((error) => error.field);
}

describe("cloud workflow contracts", () => {
  it("accepts safe seeded workflow requests", () => {
    expect(validateAppointmentBookingRequest(safeWorkflowSamples.appointmentBooking).ok).toBe(true);
    expect(validatePatientRegistrationRequest(safeWorkflowSamples.patientRegistration).ok).toBe(true);
    expect(validateStockReceivingRequest(safeWorkflowSamples.stockReceiving).ok).toBe(true);
    expect(validateStockScanningRequest(safeWorkflowSamples.stockScanning).ok).toBe(true);
    expect(validateOwnerExportRequest(safeWorkflowSamples.ownerExport).ok).toBe(true);
    expect(validateAuditEventCreateRequest(safeWorkflowSamples.auditEvent).ok).toBe(true);
  });

  it("rejects unsafe or missing appointment booking input", () => {
    const fields = expectInvalid(
      validateAppointmentBookingRequest({
        ...safeWorkflowSamples.appointmentBooking,
        patient: {
          ...safeWorkflowSamples.appointmentBooking.patient,
          displayName: "",
          myKadNumber: "900101-10-1234"
        }
      })
    );

    expect(fields).toContain("patient.displayName");
    expect(fields).toContain("patient.myKadNumber");
  });

  it("rejects unsafe patient registration input", () => {
    const fields = expectInvalid(
      validatePatientRegistrationRequest({
        ...safeWorkflowSamples.patientRegistration,
        fullName: "",
        identityCardNumber: "900101101234"
      })
    );

    expect(fields).toContain("fullName");
    expect(fields).toContain("identityCardNumber");
  });

  it("rejects invalid stock receiving input", () => {
    const fields = expectInvalid(
      validateStockReceivingRequest({
        ...safeWorkflowSamples.stockReceiving,
        lines: [
          {
            medicationId: "missing-medication",
            batchNo: "",
            expiry: "2024-01-01",
            quantity: 0
          }
        ]
      })
    );

    expect(fields).toContain("lines[0].medicationId");
    expect(fields).toContain("lines[0].batchNo");
    expect(fields).toContain("lines[0].expiry");
    expect(fields).toContain("lines[0].quantity");
  });

  it("rejects invalid stock scanning input", () => {
    const fields = expectInvalid(
      validateStockScanningRequest({
        ...safeWorkflowSamples.stockScanning,
        barcode: " ",
        patientName: "Do not log this"
      })
    );

    expect(fields).toContain("barcode");
    expect(fields).toContain("patientName");
  });

  it("rejects audit events that include PHI metadata", () => {
    const fields = expectInvalid(
      validateAuditEventCreateRequest({
        ...safeWorkflowSamples.auditEvent,
        metadata: {
          patientName: "Do not export",
          queueDepth: 4
        }
      })
    );

    expect(fields).toContain("metadata.patientName");
  });

  it("builds owner exports without patient identifiers", () => {
    const request = validateOwnerExportRequest(safeWorkflowSamples.ownerExport);

    if (!request.ok) {
      throw new Error("Owner export sample should be valid");
    }

    const exported = buildPhiSafeOwnerExport(request.value, new Date("2026-05-01T08:00:00.000Z"));
    const serialized = JSON.stringify(exported);

    expect(exported.queueByBranch.length).toBeGreaterThan(0);
    expect(exported.redactions).toContain("queueTickets.patientName");
    expect(exported.redactions).toContain("queueTickets.id");

    for (const ticket of queueTickets) {
      expect(serialized).not.toContain(ticket.patientName);
      expect(serialized).not.toContain(ticket.id);
    }
  });
});
