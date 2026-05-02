"use client";

import Link from "next/link";
import { CalendarCheck, MapPin, MessageCircle } from "lucide-react";
import { branches, publicServices } from "@usrahmedic/domain";
import { BranchBadge, PublicTopbar, SectionHeading, SystemNotice } from "../components/chrome";
import { usePublicHomeCopy } from "../components/language";

export default function PublicSitePage() {
  const copy = usePublicHomeCopy();

  return (
    <div className="app-shell">
      <PublicTopbar active="home" />
      <main className="page">
        <section className="hero">
          <div>
            <SystemNotice label={copy.notice} />
            <h1>{copy.heroTitle}</h1>
            <p>{copy.heroText}</p>
            <div className="hero-actions">
              <Link className="primary-action" href="/patient">
                <CalendarCheck size={18} aria-hidden="true" />
                {copy.bookVisit}
              </Link>
            </div>
          </div>
          <div className="hero-media" aria-label="Clinic team supporting a family consultation" />
        </section>

        <section className="section">
          <SectionHeading title={copy.branchesTitle} text={copy.branchesText} />
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
          <SectionHeading title={copy.journeysTitle} text={copy.journeysText} />
          <div className="grid grid-3">
            {publicServices.map((service) => (
              <article className="card" key={service.id}>
                <span className={service.appointment === "appointment" ? "pill warn" : "pill ok"}>{service.appointment}</span>
                <h3>{service.title}</h3>
                <p>{service.summary}</p>
                <div className="pill-row">
                  <span className="pill">
                    <MapPin size={14} aria-hidden="true" />
                    {copy.branchAvailability}
                  </span>
                  <span className="pill">
                    <MessageCircle size={14} aria-hidden="true" />
                    {copy.whatsappFallback}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section panel">
          <div className="section-heading">
            <div>
              <h2>{copy.separateTitle}</h2>
              <p>{copy.separateText}</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
