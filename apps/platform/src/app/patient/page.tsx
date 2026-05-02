"use client";

import { Clock3, HeartPulse, MapPin, Phone, ShieldCheck, Sparkles, Stethoscope, WalletCards } from "lucide-react";
import { branches } from "@usrahmedic/domain";
import { PatientBookingAction } from "../../components/actions";
import { PublicTopbar } from "../../components/chrome";
import { usePatientPageCopy } from "../../components/language";

const serviceIcons = [HeartPulse, Stethoscope, ShieldCheck] as const;

export default function PatientPage() {
  const copy = usePatientPageCopy();

  return (
    <div className="app-shell patient-page">
      <PublicTopbar active="booking" />
      <main>
        <section className="patient-hero">
          <div className="patient-hero-copy">
            <span className="pill brand-pill">
              <Sparkles size={15} aria-hidden="true" />
              {copy.badge}
            </span>
            <h1>{copy.heroTitle}</h1>
            <p>{copy.heroText}</p>
            <div className="patient-trust-row" aria-label="Booking highlights">
              <span><Clock3 size={17} aria-hidden="true" /> {copy.open24}</span>
              <span><WalletCards size={17} aria-hidden="true" /> {copy.deposit}</span>
              <span><MapPin size={17} aria-hidden="true" /> {branches.length} {copy.branchCount}</span>
            </div>
            <div className="patient-hero-photo" aria-label={copy.heroPhotoLabel} />
          </div>
          <PatientBookingAction />
        </section>

        <section className="patient-section patient-process" aria-label={copy.processAria}>
          <div className="section-heading">
            <div>
              <p className="pill brand-pill">{copy.processBadge}</p>
              <h2>{copy.processTitle}</h2>
            </div>
            <p>{copy.processText}</p>
          </div>
          <div className="booking-steps">
            {copy.bookingSteps.map((step, index) => (
              <article key={step}>
                <span>{index + 1}</span>
                <strong>{step}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="patient-section" aria-label="Popular services">
          <div className="section-heading">
            <div>
              <p className="pill brand-pill">{copy.servicesBadge}</p>
              <h2>{copy.servicesTitle}</h2>
            </div>
            <p>{copy.servicesText}</p>
          </div>
          <div className="grid grid-3">
            {copy.services.map((service, index) => {
              const Icon = serviceIcons[index] ?? HeartPulse;
              return (
                <article className="service-card" key={service.title}>
                  <Icon size={24} aria-hidden="true" />
                  <h3>{service.title}</h3>
                  <p>{service.detail}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="patient-section branch-band" aria-label={copy.branchAria}>
          {branches.map((branch) => (
            <article key={branch.id}>
              <span className="pill brand-pill">{branch.hours}</span>
              <h3>{branch.name}</h3>
              <p>{branch.services.slice(0, 4).join(", ")}</p>
              <a href={`tel:${branch.hotline.replace(/[^+\d]/g, "")}`}>
                <Phone size={16} aria-hidden="true" />
                {branch.hotline}
              </a>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
