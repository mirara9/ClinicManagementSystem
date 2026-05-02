import {
  cleanString,
  getDb,
  handleOptions,
  json,
  parseBoolean,
  requireRole,
  runEndpoint
} from "../../_lib/http.js";
import { writeAuditEvent } from "../../_lib/audit.js";

const METHODS = "GET, OPTIONS";

export function onRequestOptions(context) {
  return handleOptions(context, METHODS);
}

export async function onRequestGet(context) {
  return runEndpoint(context, METHODS, async () => {
    const actor = requireRole(context, ["owner"]);
    const db = getDb(context);
    const url = new URL(context.request.url);
    const branchId = cleanString(url.searchParams.get("branchId"), 128);
    const includePhi = parseBoolean(url.searchParams.get("includePhi"));

    const auditId = await writeAuditEvent(context, db, {
      branchId,
      actorType: actor.role,
      action: "owner_export.generate",
      resourceType: "owner_export",
      resourceId: branchId || "all_branches",
      phiScope: includePhi ? "exported" : "referenced",
      metadata: {
        includePhi,
        mode: includePhi ? "full" : "redacted"
      }
    });

    const scope = branchId ? " WHERE branch_id = ?" : "";
    const branchScope = branchId ? " WHERE id = ?" : "";
    const binds = branchId ? [branchId] : [];
    const patientsQuery = includePhi
      ? `SELECT * FROM patients${scope} ORDER BY created_at`
      : `SELECT
          id,
          branch_id,
          status,
          consent_pdpa_at IS NOT NULL AS has_pdpa_consent,
          consent_marketing_at IS NOT NULL AS has_marketing_consent,
          privacy_notice_version,
          created_at,
          updated_at
        FROM patients${scope}
        ORDER BY created_at`;

    const [
      branches,
      patients,
      appointments,
      queueTickets,
      stockItems,
      stockLots,
      stockMovements,
      stockScans,
      complianceEvidence,
      auditEvents,
      staffAccounts,
      staffBranchAssignments,
      patientMedicalHistory,
      visits,
      consultations,
      clinicalDocuments,
      medicalCertificates,
      serviceCatalog,
      panelProviders,
      patientPanelMemberships,
      panelPriceRules,
      invoices,
      invoiceLines,
      payments,
      myInvoisSubmissions,
      inventoryImportJobs,
      stockAdjustments,
      stockDispenses,
      stockDispenseLines,
      medicineLabelJobs,
      reportSnapshots,
      supportTickets,
      onboardingTasks,
      platformUpdateNotes
    ] = await Promise.all([
      all(db, `SELECT * FROM branches${branchScope} ORDER BY name`, binds),
      all(db, patientsQuery, binds),
      all(db, `SELECT * FROM appointments${scope} ORDER BY scheduled_start`, binds),
      all(db, `SELECT * FROM queue_tickets${scope} ORDER BY issued_at`, binds),
      all(db, `SELECT * FROM stock_items${scope} ORDER BY name`, binds),
      all(db, `SELECT * FROM stock_lots${scope} ORDER BY created_at`, binds),
      all(db, `SELECT * FROM stock_movements${scope} ORDER BY created_at`, binds),
      all(db, `SELECT * FROM stock_scan_events${scope} ORDER BY created_at`, binds),
      all(db, `SELECT * FROM compliance_evidence${scope} ORDER BY requirement_code`, binds),
      all(db, `SELECT * FROM audit_events${scope} ORDER BY created_at`, binds),
      all(db, "SELECT id, display_name, email, phone_e164, role, status, mfa_required, external_idp_subject, last_login_at, metadata_json, created_at, updated_at FROM staff_accounts ORDER BY display_name", []),
      all(db, `SELECT * FROM staff_branch_assignments${scope} ORDER BY created_at`, binds),
      all(db, `SELECT * FROM patient_medical_history${scope} ORDER BY created_at`, binds),
      all(db, `SELECT * FROM patient_visit_records${scope} ORDER BY opened_at`, binds),
      all(db, `SELECT * FROM consultations${scope} ORDER BY created_at`, binds),
      all(db, `SELECT * FROM clinical_documents${scope} ORDER BY created_at`, binds),
      all(db, `SELECT * FROM medical_certificates${scope} ORDER BY created_at`, binds),
      all(db, branchId ? "SELECT * FROM service_catalog WHERE branch_id IS NULL OR branch_id = ? ORDER BY service_code" : "SELECT * FROM service_catalog ORDER BY service_code", binds),
      all(db, "SELECT * FROM panel_providers ORDER BY name", []),
      all(db, `SELECT * FROM patient_panel_memberships${scope} ORDER BY created_at`, binds),
      all(db, branchId ? "SELECT * FROM panel_price_rules WHERE branch_id IS NULL OR branch_id = ? ORDER BY service_code" : "SELECT * FROM panel_price_rules ORDER BY service_code", binds),
      all(db, `SELECT * FROM invoices${scope} ORDER BY created_at`, binds),
      all(db, `SELECT l.* FROM invoice_lines l JOIN invoices i ON i.id = l.invoice_id${branchId ? " WHERE i.branch_id = ?" : ""} ORDER BY l.created_at`, binds),
      all(db, `SELECT * FROM payments${scope} ORDER BY created_at`, binds),
      all(db, `SELECT * FROM myinvois_submissions${scope} ORDER BY created_at`, binds),
      all(db, `SELECT * FROM inventory_import_jobs${scope} ORDER BY created_at`, binds),
      all(db, `SELECT * FROM stock_adjustments${scope} ORDER BY created_at`, binds),
      all(db, `SELECT * FROM stock_dispenses${scope} ORDER BY created_at`, binds),
      all(db, `SELECT * FROM stock_dispense_lines${scope} ORDER BY created_at`, binds),
      all(db, `SELECT * FROM medicine_label_jobs${scope} ORDER BY created_at`, binds),
      all(db, `SELECT * FROM report_snapshots${scope} ORDER BY created_at`, binds),
      all(db, `SELECT * FROM support_tickets${scope} ORDER BY created_at`, binds),
      all(db, `SELECT * FROM onboarding_tasks${scope} ORDER BY created_at`, binds),
      all(db, "SELECT * FROM platform_update_notes ORDER BY created_at", [])
    ]);

    return json(context, {
      ok: true,
      export: {
        generatedAt: new Date().toISOString(),
        auditEventId: auditId,
        phiMode: includePhi ? "included" : "redacted",
        branchId: branchId || null,
        data: {
          branches,
          patients,
          appointments,
          queueTickets,
          stockItems,
          stockLots,
          stockMovements,
          stockScans,
          complianceEvidence,
          auditEvents,
          staffAccounts,
          staffBranchAssignments,
          patientMedicalHistory,
          visits,
          consultations,
          clinicalDocuments,
          medicalCertificates,
          serviceCatalog,
          panelProviders,
          patientPanelMemberships,
          panelPriceRules,
          invoices,
          invoiceLines,
          payments,
          myInvoisSubmissions,
          inventoryImportJobs,
          stockAdjustments,
          stockDispenses,
          stockDispenseLines,
          medicineLabelJobs,
          reportSnapshots,
          supportTickets,
          onboardingTasks,
          platformUpdateNotes
        }
      }
    }, { methods: METHODS });
  });
}

async function all(db, query, binds) {
  const result = binds.length
    ? await db.prepare(query).bind(...binds).all()
    : await db.prepare(query).all();
  return result.results || [];
}
