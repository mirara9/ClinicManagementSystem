import {
  Activity,
  BarChart3,
  CircleDollarSign,
  Clock3,
  CloudCog,
  Database,
  FileWarning,
  Headphones,
  LineChart,
  Megaphone,
  ReceiptText,
  RefreshCw,
  Server,
  ShieldCheck,
  WalletCards
} from "lucide-react";
import { ownerKpis } from "@usrahmedic/domain";
import { InsightExportAction } from "../../components/actions";
import { CloudflareReadiness, DashboardShell, IntegrationNotice, StatCard } from "../../components/chrome";

const branchScores = [
  { branch: "Puncak Alam", revenue: 92, queue: 78, claims: 64 },
  { branch: "Bukit Jelutong", revenue: 74, queue: 89, claims: 82 },
  { branch: "Seremban 2", revenue: 84, queue: 73, claims: 71 }
];

const realDataReports = [
  { title: "Daily clinic report", source: "Appointments, queue, billing, payments", freshness: "Live after close", owner: "Branch manager" },
  { title: "Revenue and billing", source: "Invoice, refund, deposit, drawer, panel AR", freshness: "Near real time", owner: "Owner finance" },
  { title: "Medicine margin", source: "Dispense lines, batch cost, adjustment loss", freshness: "Nightly", owner: "Pharmacy lead" },
  { title: "Clinical operations", source: "Visits, triage, consult duration, MC count", freshness: "PHI-safe aggregate", owner: "Medical director" }
];

const revenueWorkflow = [
  { label: "Booking deposit", value: "RM10 captured", detail: "Maps FPX/eWallet/card/counter deposits to appointment and refund state." },
  { label: "Consultation invoice", value: "Editable draft", detail: "Locks only after payment or MyInvois submission rules require control." },
  { label: "Panel aging", value: "0-30 / 31-60 / 60+", detail: "Tracks GL, claim batch, rejection, resubmit, and write-off reason." },
  { label: "Accounting export", value: "Ready queue", detail: "Sends payment, invoice, tax, claim, and drawer close summaries without PHI." }
];

const supportSlaRows = [
  { lane: "Standard support", sla: "Next business day", scope: "How-to, onboarding follow-up, report questions" },
  { lane: "Priority support", sla: "4 business hours", scope: "Payment, queue, invoice, and stock workflow issues" },
  { lane: "Incident channel", sla: "Active monitoring", scope: "Clinic downtime, data access, security, and payment outage" }
];

const updateChannels = [
  { title: "Automatic system updates", detail: "Cloud release channel with version notes, rollback window, and clinic-impact flags.", icon: RefreshCw },
  { title: "Ongoing platform improvements", detail: "Owner-visible roadmap for billing, MyInvois, inventory, and patient app releases.", icon: CloudCog },
  { title: "Malaysian database decision", detail: "Tracks selected production data region, backup, DR, and compliance evidence.", icon: Database }
];

export default function InsightPage() {
  return (
    <DashboardShell
      active="Insight"
      title="Owner insights"
      subtitle="PHI-safe dashboards for revenue, operations, medicine margin, panel aging, and marketing attribution."
      actions={<IntegrationNotice />}
    >
      <div className="grid grid-4">
        {ownerKpis.map((kpi) => (
          <StatCard
            detail={kpi.trend}
            icon={kpi.risk === "high" ? FileWarning : kpi.label.includes("Queue") ? Clock3 : WalletCards}
            key={kpi.label}
            label={kpi.label}
            tone={kpi.risk === "high" ? "danger" : kpi.risk === "medium" ? "warn" : "ok"}
            value={kpi.value}
          />
        ))}
      </div>

      <section className="section grid grid-2">
        <div className="panel">
          <h2>PHI-safe export action</h2>
          <p>Submits through the Cloudflare API path first, then falls back to a local safe JSON export when the endpoint is not deployed.</p>
          <CloudflareReadiness endpoint="/api/insight/exports" note="Expected to enforce role, branch scope, PHI exclusions, and audit reason once backend wiring lands." />
          <InsightExportAction />
        </div>

        <div className="panel">
          <h2>Branch comparison</h2>
          <div className="progress-bars">
            {branchScores.map((score) => (
              <div className="grid" key={score.branch}>
                <strong>{score.branch}</strong>
                <MetricBar label="Revenue" value={score.revenue} />
                <MetricBar label="Queue SLA" value={score.queue} />
                <MetricBar label="Claims clean" value={score.claims} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section grid grid-2">
        <div className="panel">
          <h2>Analytics safety</h2>
          <div className="grid">
            {[
              "No free-text clinical notes in analytics",
              "No raw IC/passport values in dashboards",
              "No prescription detail in marketing exports",
              "Drill-down access requires role and audit reason"
            ].map((rule) => (
              <div className="task" key={rule}>
                <BarChart3 size={20} aria-hidden="true" />
                <div>
                  <strong>{rule}</strong>
                  <p className="muted">Data classification enforced before event export.</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>Real-data report catalog</h2>
          <p>Owner reports are shown with source systems and data freshness so operators can see what is live, closed, or aggregated.</p>
          <table className="table">
            <thead>
              <tr>
                <th>Report</th>
                <th>Source</th>
                <th>Freshness</th>
              </tr>
            </thead>
            <tbody>
              {realDataReports.map((report) => (
                <tr key={report.title}>
                  <td>
                    <strong>{report.title}</strong>
                    <p className="muted">{report.owner}</p>
                  </td>
                  <td>{report.source}</td>
                  <td>
                    <span className="pill ok">
                      <Activity size={14} aria-hidden="true" />
                      {report.freshness}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section panel">
        <h2>Revenue and billing reports</h2>
        <p>Finance reporting reflects the flows clinics actually need to reconcile: deposits, invoices, payments, panel claims, and accounting export.</p>
        <div className="grid grid-4">
          {revenueWorkflow.map((item) => (
            <article className="mini-card" key={item.label}>
              <span className="pill ok">
                {item.label.includes("Panel") ? <WalletCards size={14} aria-hidden="true" /> : item.label.includes("invoice") ? <ReceiptText size={14} aria-hidden="true" /> : <CircleDollarSign size={14} aria-hidden="true" />}
                {item.value}
              </span>
              <h3>{item.label}</h3>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section grid grid-3">
        <article className="card">
          <LineChart size={22} aria-hidden="true" />
          <h3>Revenue cycle</h3>
          <p>Tracks collections, cash drawer mismatch, refunds, MyInvois states, and accounting export readiness.</p>
        </article>
        <article className="card">
          <Megaphone size={22} aria-hidden="true" />
          <h3>Campaign ROI</h3>
          <p>Connects source, click, booking, visit, revenue, repeat visit, and MAB approval status.</p>
        </article>
        <article className="card">
          <Clock3 size={22} aria-hidden="true" />
          <h3>Queue SLA</h3>
          <p>Compares wait, triage, consult, dispense, and checkout duration by branch and station.</p>
        </article>
      </section>

      <section className="section grid grid-2">
        <div className="panel">
          <h2>Support SLA dashboard</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Lane</th>
                <th>SLA</th>
                <th>Scope</th>
              </tr>
            </thead>
            <tbody>
              {supportSlaRows.map((row) => (
                <tr key={row.lane}>
                  <td>
                    <strong>{row.lane}</strong>
                  </td>
                  <td>
                    <span className={row.lane.includes("Priority") ? "pill warn" : "pill ok"}>
                      <Headphones size={14} aria-hidden="true" />
                      {row.sla}
                    </span>
                  </td>
                  <td>{row.scope}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <h2>Update, hosting, and compliance channel</h2>
          <div className="grid">
            {updateChannels.map((channel) => {
              const Icon = channel.icon;
              return (
                <div className="task" key={channel.title}>
                  <Icon size={20} aria-hidden="true" />
                  <div>
                    <strong>{channel.title}</strong>
                    <p className="muted">{channel.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section grid grid-3">
        <article className="card">
          <Server size={22} aria-hidden="true" />
          <h3>Cloud clinic system</h3>
          <p>Tracks deployment health, branch availability, database backup status, and restore drill evidence.</p>
        </article>
        <article className="card">
          <ShieldCheck size={22} aria-hidden="true" />
          <h3>Branch-safe drilldown</h3>
          <p>Owner drilldown requires role, branch scope, PHI exclusion rules, and audit reason before export.</p>
        </article>
        <article className="card">
          <Database size={22} aria-hidden="true" />
          <h3>Malaysia hosting decision</h3>
          <p>Production database hosting remains a tracked decision with region, vendor, backup, and compliance proof.</p>
        </article>
      </section>
    </DashboardShell>
  );
}

function MetricBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="bar">
      <span>{label}</span>
      <span className="bar-track">
        <span className="bar-fill" style={{ width: `${value}%` }} />
      </span>
      <strong>{value}%</strong>
    </div>
  );
}
