import { BellRing, ClipboardList, LogOut, Pill, QrCode, Search, ShieldCheck, Stethoscope } from "lucide-react";
import { queueTickets } from "@usrahmedic/domain";
import { StaffScanAction } from "../../components/actions";
import { AppTopbar, CloudflareReadiness } from "../../components/chrome";

export default function StaffPage() {
  return (
    <div className="app-shell">
      <AppTopbar app="Staff app" homeHref="/staff" icon={Stethoscope} />
      <main className="page mobile-shell">
        <section className="mobile-frame">
          <div className="mobile-header">
            <p className="pill">Staff app</p>
            <h2>Today at Puncak Alam</h2>
            <p>Queue, task handoff, stock scan, and secure notifications.</p>
          </div>
          <div className="mobile-body">
            {queueTickets.slice(0, 3).map((ticket) => (
              <div className="task" key={ticket.id}>
                <ClipboardList size={20} aria-hidden="true" />
                <div>
                  <strong>{ticket.id} - {ticket.patientName}</strong>
                  <p className="muted">{ticket.service} / {ticket.state}</p>
                </div>
              </div>
            ))}
            <div className="task">
              <QrCode size={20} aria-hidden="true" />
              <div>
                <strong>Scanner ready</strong>
                <p className="muted">Use the working scan form beside this preview.</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <p className="pill ok">Role-aware mobile work</p>
          <h1>Staff mobile foundation</h1>
          <p className="muted">
            Staff mobile starts narrow: queue, tasks, secure notifications, and stock scan. Full EMR remains optimized for
            the admin web surface until clinical mobile workflows are validated.
          </p>
          <div className="section panel">
            <h2>Stock scan action</h2>
            <p>Submits through the Cloudflare API path first, then falls back locally when the endpoint is not deployed.</p>
            <CloudflareReadiness endpoint="/api/stock/scan" note="Checks stock, expiry, recall, quarantine, and role permissions through the staff app boundary." />
            <StaffScanAction />
          </div>
          <div className="grid grid-2 section">
            {[
              { icon: Search, title: "Fast patient lookup", text: "Branch and care-team authorization checked before record display." },
              { icon: BellRing, title: "Safe notifications", text: "No sensitive clinical details in push, SMS, or WhatsApp notifications." },
              { icon: Pill, title: "Stock scan", text: "Batch, expiry, recall, and quarantine checks before dispense." },
              { icon: ShieldCheck, title: "Device controls", text: "Native phase will add secure storage, biometric unlock, and remote logout." },
              { icon: Stethoscope, title: "Doctor tasks", text: "Abnormal result acknowledgement and follow-up reminders stay visible." },
              { icon: LogOut, title: "Session revocation", text: "Staff offboarding and lost-device response are platform requirements." }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <article className="card" key={item.title}>
                  <Icon size={22} aria-hidden="true" />
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
