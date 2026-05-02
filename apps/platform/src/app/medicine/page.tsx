import {
  AlertTriangle,
  Boxes,
  ClipboardCheck,
  FileSpreadsheet,
  PackageCheck,
  Pill,
  Printer,
  ScanBarcode,
  ShieldAlert,
  SlidersHorizontal,
  Snowflake,
  Upload
} from "lucide-react";
import { branches, inventoryBatches, medications } from "@usrahmedic/domain";
import { MedicineReceiveStockAction } from "../../components/actions";
import { CloudflareReadiness, DashboardShell, IntegrationNotice, StatCard } from "../../components/chrome";
import { buildDispenseLabel, evaluateDispense } from "@usrahmedic/domain";

const inventoryImportChecks = [
  { title: "CSV/XLSX template", detail: "SKU, generic, brand, strength, form, MAL, poison group, branch, batch, expiry, quantity, cost." },
  { title: "Pre-import validation", detail: "Blocks duplicate batch, missing expiry, invalid MAL, negative quantity, and uncontrolled branch assignment." },
  { title: "Quarantine landing", detail: "New lots stay in quarantine until pharmacist or authorized staff accepts the receipt." },
  { title: "Audit and rollback", detail: "Every upload row gets a result, actor, source file hash, and correction path." }
];

const adjustmentReasons = [
  { reason: "Opening balance", owner: "Branch manager", control: "Requires signed migration worksheet" },
  { reason: "Damage or expiry", owner: "Pharmacy lead", control: "Requires disposal evidence and batch lock" },
  { reason: "Cycle count variance", owner: "Supervisor", control: "Requires second approval above threshold" },
  { reason: "Recall removal", owner: "Compliance", control: "Blocks dispensing and exports recall pack" }
];

const dispenseSafetyChecks = [
  "Prescription screening and prescriber clarification",
  "Allergy, duplication, high-alert, pediatric age and weight dose checks",
  "Generic-first substitution with documented patient counseling",
  "Counter-check before issue for controlled, LASA, and high-alert items"
];

const printJobs = [
  { id: "LBL-1042", patient: "Nur Aina", item: "Amoxicillin 250mg/5ml", status: "Ready", queue: "Puncak Alam printer 1" },
  { id: "LBL-1043", patient: "Adam Rayyan", item: "Paracetamol 120mg/5ml", status: "Needs check", queue: "Pediatric dosing review" },
  { id: "LBL-1044", patient: "Puan Salmah", item: "Metformin 500mg", status: "Printed", queue: "Counter collection" }
];

export default function MedicinePage() {
  const controlledCount = medications.filter((medicine) => medicine.poisonGroup !== "none" || medicine.psychotropic || medicine.dangerousDrug).length;
  const coldChainCount = medications.filter((medicine) => medicine.coldChain).length;

  return (
    <DashboardShell
      active="Medicine"
      title="Medicine operations"
      subtitle="Internal pharmacy, stock, labels, legal registers, batch traceability, and recall controls."
      actions={<IntegrationNotice />}
    >
      <div className="grid grid-4">
        <StatCard icon={Pill} label="Medication master" value={String(medications.length)} detail="MAL and regulatory fields" />
        <StatCard icon={ShieldAlert} label="Controlled items" value={String(controlledCount)} detail="Register and counter-check" tone="warn" />
        <StatCard icon={Snowflake} label="Cold chain" value={String(coldChainCount)} detail="Temperature log required" tone="warn" />
        <StatCard icon={Boxes} label="Active batches" value={String(inventoryBatches.length)} detail="Trace purchase to dispense" />
      </div>

      <section className="section panel">
        <h2>Stock receipt action</h2>
        <p>Submits through the Cloudflare API path first, then falls back locally when the endpoint is not deployed.</p>
        <CloudflareReadiness endpoint="/api/medicine/stock-receipts" note="Expected to record supplier evidence, quarantine state, and audit metadata once backend wiring lands." />
        <MedicineReceiveStockAction />
      </section>

      <section className="section grid grid-2">
        <div className="panel">
          <h2>Bulk inventory upload</h2>
          <p>Opening stock and supplier imports are presented as a controlled workflow before they can affect dispensable balance.</p>
          <div className="surface-list">
            {inventoryImportChecks.map((check) => (
              <div className="surface-item" key={check.title}>
                <span className="pill ok">
                  {check.title.includes("template") ? <FileSpreadsheet size={14} aria-hidden="true" /> : <Upload size={14} aria-hidden="true" />}
                  Import
                </span>
                <div>
                  <strong>{check.title}</strong>
                  <p className="muted">{check.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>Manual stock adjustments</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Reason</th>
                <th>Owner</th>
                <th>Control</th>
              </tr>
            </thead>
            <tbody>
              {adjustmentReasons.map((item) => (
                <tr key={item.reason}>
                  <td>
                    <strong>{item.reason}</strong>
                  </td>
                  <td>{item.owner}</td>
                  <td>
                    <span className="pill warn">
                      <SlidersHorizontal size={14} aria-hidden="true" />
                      {item.control}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section panel">
        <h2>Regulated medication master</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Medicine</th>
              <th>MAL</th>
              <th>Class</th>
              <th>Safety</th>
              <th>Recall</th>
            </tr>
          </thead>
          <tbody>
            {medications.map((medicine) => (
              <tr key={medicine.id}>
                <td>
                  <strong>{medicine.brandName}</strong>
                  <p className="muted">
                    {medicine.genericName} {medicine.strength}
                  </p>
                </td>
                <td>{medicine.malNumber}</td>
                <td>
                  <span className={medicine.poisonGroup === "none" ? "pill ok" : "pill warn"}>{medicine.poisonGroup}</span>
                </td>
                <td>
                  <div className="pill-row">
                    {medicine.coldChain ? <span className="pill warn">cold chain</span> : null}
                    {medicine.highAlert ? <span className="pill danger">high alert</span> : null}
                    {medicine.lasa ? <span className="pill warn">LASA</span> : null}
                  </div>
                </td>
                <td>{medicine.recallStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="section grid grid-2">
        <div className="panel">
          <h2>Batch traceability</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Batch</th>
                <th>Branch</th>
                <th>Expiry</th>
                <th>Qty</th>
                <th>Decision</th>
              </tr>
            </thead>
            <tbody>
              {inventoryBatches.map((batch) => {
                const medicine = medications.find((item) => item.id === batch.medicationId);
                const branch = branches.find((item) => item.id === batch.branchId);
                const decision = medicine ? evaluateDispense(medicine, batch, "dispenser", new Date("2026-05-01T00:00:00")) : null;

                return (
                  <tr key={batch.id}>
                    <td>{batch.batchNo}</td>
                    <td>{branch?.area}</td>
                    <td>{batch.expiry}</td>
                    <td>{batch.quantity}</td>
                    <td>
                      <span className={decision?.allowed ? "pill ok" : "pill danger"}>{decision?.allowed ? "dispensable" : "blocked"}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <h2>Dispensing workflow</h2>
          <div className="workflow">
            {["prescribed", "screened", "clarified", "prepared", "labelled", "checked", "counterChecked", "issued", "counselled"].map((step, index) => (
              <div className="workflow-step" key={step}>
                <span className="step-dot">{index + 1}</span>
                <div>
                  <strong>{step}</strong>
                  <p className="muted">Required state with actor, time, branch, and audit correlation.</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section grid grid-2">
        <div className="panel">
          <h2>Dispensing safety checks</h2>
          <p>Dispensing is surfaced as a clinical safety flow, not just a stock deduction.</p>
          <div className="grid">
            {dispenseSafetyChecks.map((check) => (
              <div className="task" key={check}>
                <ScanBarcode size={20} aria-hidden="true" />
                <div>
                  <strong>{check}</strong>
                  <p className="muted">Requires actor, branch, batch, patient, and prescription correlation.</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>Label print jobs</h2>
          <p>Labels include clinic identity, patient, medicine, strength, directions, warnings, supply date, expiry, and controlled item marking.</p>
          <table className="table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Patient</th>
                <th>Item</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {printJobs.map((job) => (
                <tr key={job.id}>
                  <td>
                    <strong>{job.id}</strong>
                    <p className="muted">{job.queue}</p>
                  </td>
                  <td>{job.patient}</td>
                  <td>{job.item}</td>
                  <td>
                    <span className={job.status === "Ready" || job.status === "Printed" ? "pill ok" : "pill warn"}>
                      <Printer size={14} aria-hidden="true" />
                      {job.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section grid grid-2">
        <div className="panel">
          <h2>Label preview</h2>
          <div className="card">
            {buildDispenseLabel(medications[1], "Nur Aina", "UsrahMedic Puncak Alam").map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
        <div className="panel">
          <h2>Legal registers</h2>
          <div className="grid">
            {["Prescription book", "Psychotropic register", "Stock ledger", "Correction ledger", "Inspection export"].map((item) => (
              <div className="task" key={item}>
                <ClipboardCheck size={20} aria-hidden="true" />
                <div>
                  <strong>{item}</strong>
                  <p className="muted">Separate from audit logs and protected from deletion.</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section grid grid-3">
        <article className="card">
          <PackageCheck size={22} aria-hidden="true" />
          <h3>Dispense to billing</h3>
          <p>Issued medication creates bill lines, margin reporting, batch ledger movement, and counseling proof.</p>
        </article>
        <article className="card">
          <AlertTriangle size={22} aria-hidden="true" />
          <h3>Recall readiness</h3>
          <p>Recall notices can find patients, lots, branches, quantity remaining, and affected dispense records.</p>
        </article>
        <article className="card">
          <Printer size={22} aria-hidden="true" />
          <h3>Printer stations</h3>
          <p>Branch printer mapping, reprint reason, label template version, and failed job retry are visible.</p>
        </article>
      </section>
    </DashboardShell>
  );
}
