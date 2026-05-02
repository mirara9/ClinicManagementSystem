import Link from "next/link";
import { CalendarCheck, MapPin, MessageCircle } from "lucide-react";
import { branches, publicServices } from "@usrahmedic/domain";
import { BranchBadge, PublicTopbar, SectionHeading, SystemNotice } from "../components/chrome";

export default function PublicSitePage() {
  return (
    <div className="app-shell">
      <PublicTopbar active="Laman utama" />
      <main className="page">
        <section className="hero">
          <div>
            <SystemNotice />
            <h1>UsrahMedic family clinic platform</h1>
            <p>
              A fast public website and connected clinic system for branch discovery, booking, antenatal care, ultrasound, panels,
              chronic follow-up, and patient communication.
            </p>
            <div className="hero-actions">
              <Link className="primary-action" href="/patient">
                <CalendarCheck size={18} aria-hidden="true" />
                Book visit
              </Link>
            </div>
          </div>
          <div className="hero-media" aria-label="Clinic team supporting a family consultation" />
        </section>

        <section className="section">
          <SectionHeading title="Branches" text="Official branch data becomes structured content shared across public, admin, mobile, and insight surfaces." />
          <div className="grid grid-3">
            {branches.map((branch) => (
              <article className="card" key={branch.id}>
                <BranchBadge label={branch.area} />
                <h3>{branch.name}</h3>
                <p>{branch.hours}</p>
                <p>{branch.hotline}</p>
                <div className="pill-row">
                  {branch.services.slice(0, 4).map((service) => (
                    <span className="pill" key={service}>
                      {service}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section">
          <SectionHeading title="Patient journeys" text="The public site stays patient-friendly while feeding clean service, campaign, and booking data into operations." />
          <div className="grid grid-3">
            {publicServices.map((service) => (
              <article className="card" key={service.id}>
                <span className={service.appointment === "appointment" ? "pill warn" : "pill ok"}>{service.appointment}</span>
                <h3>{service.title}</h3>
                <p>{service.summary}</p>
                <div className="pill-row">
                  <span className="pill">
                    <MapPin size={14} aria-hidden="true" />
                    Branch availability
                  </span>
                  <span className="pill">
                    <MessageCircle size={14} aria-hidden="true" />
                    WhatsApp fallback
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section panel">
          <div className="section-heading">
            <div>
              <h2>Separate patient and clinic systems</h2>
              <p>Patients use the public site and patient app. Staff, clinic operations, medicine, and owner insight remain separate authenticated workspaces.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
