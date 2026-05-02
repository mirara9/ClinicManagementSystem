import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  FilePenLine,
  FileText,
  KeyRound,
  LockKeyhole,
  Receipt,
  ReceiptText,
  ShieldCheck,
  Stethoscope,
  UserCog,
  Users,
  WalletCards
} from "lucide-react";
import { branches, complianceControls, queueTickets } from "@usrahmedic/domain";
import { AdminRegistrationAction } from "../../components/actions";
import { CloudflareReadiness, DashboardShell, IntegrationNotice, StatCard } from "../../components/chrome";
import { WorkflowRail } from "../../components/workflow";

const accessControls = [
  { title: "Staff accounts", detail: "Invite staff by branch, role, MMC/APC metadata, and employment status.", state: "Configured", tone: "ok" },
  { title: "MFA enforcement", detail: "Owner, doctor, pharmacy, and finance roles require MFA before live access.", state: "Required", tone: "warn" },
  { title: "Role access", detail: "RBAC and branch scope gate patient charts, billing, inventory, and exports.", state: "Mapped", tone: "ok" },
  { title: "Session review", detail: "Device sessions, last login, failed MFA, and forced sign-out are operator-visible.", state: "Needs IdP", tone: "warn" }
];

const registryWorkflows = [
  "Register walk-in or booking patient",
  "Capture PDPA consent, emergency contact, allergy, pregnancy, and panel information",
  "Open visit record with triage, vitals, complaint, diagnosis, orders, and treatment plan",
  "Lock signed clinical notes with correction addendum instead of overwrite"
];

const consultationModules = [
  { icon: Stethoscope, title: "Consultation note", detail: "SOAP note, diagnosis, orders, medication plan, referral, follow-up, and doctor signature." },
  { icon: FilePenLine, title: "Rich text editor", detail: "Template-based letters, referral notes, wound progress, antenatal notes, and printable summaries." },
  { icon: BadgeCheck, title: "Medical certificate", detail: "MC number, dates, diagnosis visibility controls, doctor signature, QR verification, and reprint audit." }
];

const billingModules = [
  { title: "Consultation bill", detail: "Service, procedure, medication, discount, SST flag, payment split, and refund state.", status: "Draftable" },
  { title: "Editable invoice", detail: "Amend bill lines before payment lock; post-payment changes go through credit note.", status: "Controlled" },
  { title: "Panel pricing", detail: "Panel tariff, TPA claim, GL number, copay, rejection reason, and aging owner view.", status: "Needed" },
  { title: "MyInvois", detail: "TIN/ID capture, validation, submission state, UUID, QR, cancellation, and retry queue.", status: "Needed" },
  { title: "Payment", detail: "Cash, card, DuitNow, FPX deposit, reconciliation, drawer close, and branch settlement.", status: "Planned" }
];

const branchControls = [
  { branch: "Puncak Alam", doctor: "Dr. Nadia", scope: "Own patient charts and cash drawer", isolation: "Strict branch filter" },
  { branch: "Bukit Jelutong", doctor: "Shared locum pool", scope: "Shared doctor access by scheduled session", isolation: "Session-limited" },
  { branch: "Seremban 2", doctor: "Dr. Amir", scope: "Local queue, inventory, billing, and audit stream", isolation: "Strict branch filter" }
];

const supportOnboarding = [
  "Assisted onboarding: branch setup, service catalog, staff import, panel prices, and opening stock",
  "Standard support: ticket queue, SLA clock, release notes, backup status, and incident banner",
  "Priority support: escalation lane for owner, billing outage, payment issue, and clinic downtime"
];

export default function AdminPage() {
  const urgentCount = queueTickets.filter((ticket) => ticket.triage === "urgent").length;
  const activeTicket = queueTickets[1];

  return (
    <DashboardShell
      active="Admin"
      title="Clinic operations"
      subtitle="Queue, triage, EMR, billing, panel claims, compliance evidence, and branch closing in one operational surface."
      actions={<IntegrationNotice />}
    >
      <div className="grid grid-4">
        <StatCard icon={Users} label="Waiting patients" value={String(queueTickets.length)} detail="Across three branches" />
        <StatCard icon={AlertTriangle} label="Urgent triage" value={String(urgentCount)} detail="Needs doctor review" tone="warn" />
        <StatCard icon={Receipt} label="Panel AR" value="RM 42.9k" detail="Claim module required" tone="danger" />
        <StatCard icon={ClipboardCheck} label="Audit coverage" value="100%" detail="Read/write/export target" />
      </div>

      <section className="section grid grid-2">
        <div className="panel">
          <h2>Registration action</h2>
          <p>Submits through the Cloudflare API path first, then falls back locally when the endpoint is not deployed.</p>
          <CloudflareReadiness endpoint="/api/admin/registrations" note="Expected to persist registration, queue handoff, and audit correlation once backend wiring lands." />
          <AdminRegistrationAction />
        </div>

        <div className="panel">
          <h2>Live queue</h2>
          <table className="table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Patient</th>
                <th>Station</th>
                <th>Triage</th>
                <th>Wait</th>
              </tr>
            </thead>
            <tbody>
              {queueTickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td>{ticket.id}</td>
                  <td>
                    <strong>{ticket.patientName}</strong>
                    <p className="muted">{ticket.service}</p>
                  </td>
                  <td>{ticket.state}</td>
                  <td>
                    <span className={ticket.triage === "urgent" ? "pill danger" : ticket.triage === "priority" ? "pill warn" : "pill ok"}>
                      {ticket.triage}
                    </span>
                  </td>
                  <td>{ticket.waitingMinutes}m</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section grid grid-2">
        <div className="panel">
          <h2>Clinical state model</h2>
          <p>{activeTicket.patientName} is tracked from booking through discharge, referral, and follow-up.</p>
          <WorkflowRail current={activeTicket.state} />
        </div>

        <div className="panel">
          <h2>Staff access and MFA</h2>
          <p>Production access is shown as account lifecycle, MFA readiness, and role scope rather than temporary headers.</p>
          <div className="surface-list">
            {accessControls.map((control) => (
              <div className="surface-item" key={control.title}>
                <span className={`pill ${control.tone}`}>
                  {control.title.includes("MFA") ? <LockKeyhole size={14} aria-hidden="true" /> : <KeyRound size={14} aria-hidden="true" />}
                  {control.state}
                </span>
                <div>
                  <strong>{control.title}</strong>
                  <p className="muted">{control.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section grid grid-2">
        <div className="panel">
          <h2>Patient registry and EMR</h2>
          <p>Front desk can move from patient registration into a full visit record without losing branch, consent, or audit context.</p>
          <div className="timeline">
            {registryWorkflows.map((step, index) => (
              <div className="workflow-step" key={step}>
                <span className="step-dot">{index + 1}</span>
                <div>
                  <strong>{step}</strong>
                  <p className="muted">Captured as structured patient and visit data before clinical sign-off.</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>Consultation and documents</h2>
          <div className="grid">
            {consultationModules.map((module) => {
              const Icon = module.icon;
              return (
                <div className="task" key={module.title}>
                  <Icon size={20} aria-hidden="true" />
                  <div>
                    <strong>{module.title}</strong>
                    <p className="muted">{module.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section panel">
        <h2>Billing, invoices, panel, MyInvois, and payment</h2>
        <p>Billing is presented as a guarded revenue workflow, not a static receipt, so clinics can handle edits, claims, tax, and reconciliation.</p>
        <div className="grid grid-5 compact-grid">
          {billingModules.map((module) => (
            <article className="mini-card" key={module.title}>
              <span className={module.status === "Needed" ? "pill warn" : "pill ok"}>
                {module.title === "Payment" ? <CreditCard size={14} aria-hidden="true" /> : module.title === "Panel pricing" ? <WalletCards size={14} aria-hidden="true" /> : <ReceiptText size={14} aria-hidden="true" />}
                {module.status}
              </span>
              <h3>{module.title}</h3>
              <p>{module.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section grid grid-3">
        {branches.map((branch) => (
          <article className="card" key={branch.id}>
            <span className="pill ok">{branch.hours}</span>
            <h3>{branch.area}</h3>
            <p>{branch.queueLoad} active queue slots. Service catalog and OYB evidence are branch-scoped.</p>
          </article>
        ))}
      </section>

      <section className="section panel">
        <h2>Branch isolation and shared doctors</h2>
        <p>Doctors can work across branches by scheduled assignment while patient data, queue, billing, inventory, and reports remain branch-scoped.</p>
        <table className="table">
          <thead>
            <tr>
              <th>Branch</th>
              <th>Doctor assignment</th>
              <th>Data scope</th>
              <th>Isolation</th>
            </tr>
          </thead>
          <tbody>
            {branchControls.map((control) => (
              <tr key={control.branch}>
                <td>
                  <strong>{control.branch}</strong>
                  <p className="muted">
                    <Building2 size={14} aria-hidden="true" /> Branch workspace
                  </p>
                </td>
                <td>{control.doctor}</td>
                <td>{control.scope}</td>
                <td>
                  <span className="pill ok">
                    <ShieldCheck size={14} aria-hidden="true" />
                    {control.isolation}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="section panel">
        <h2>Compliance workbench</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Area</th>
              <th>Control</th>
              <th>Implementation</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {complianceControls.map((control) => (
              <tr key={control.id}>
                <td>{control.area}</td>
                <td>{control.title}</td>
                <td>{control.implementation}</td>
                <td>
                  <span className={control.status === "foundation" ? "pill ok" : "pill warn"}>{control.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="section grid grid-3">
        <article className="card">
          <FileText size={22} aria-hidden="true" />
          <h3>Medical report release</h3>
          <p>Request, consent verification, doctor review, fee, deadline, and release audit are tracked as a formal workflow.</p>
        </article>
        <article className="card">
          <CalendarDays size={22} aria-hidden="true" />
          <h3>Orders and results</h3>
          <p>Abnormal results require clinician acknowledgement before patient release or case closure.</p>
        </article>
        <article className="card">
          <Receipt size={22} aria-hidden="true" />
          <h3>Revenue cycle</h3>
          <p>Cash drawer, MyInvois state, payment settlement, panel claim, and accounting export are first-class flows.</p>
        </article>
      </section>

      <section className="section panel">
        <h2>Support and onboarding operations</h2>
        <p>Implementation work is visible to operators, so clinic rollout and post-go-live support are part of the product surface.</p>
        <div className="grid grid-3">
          {supportOnboarding.map((item) => (
            <div className="task" key={item}>
              <UserCog size={20} aria-hidden="true" />
              <div>
                <strong>{item.split(":")[0]}</strong>
                <p className="muted">{item.includes(":") ? item.split(":").slice(1).join(":").trim() : item}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </DashboardShell>
  );
}
