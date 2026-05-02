import { Clock3, HeartPulse, MapPin, Phone, ShieldCheck, Sparkles, Stethoscope, WalletCards } from "lucide-react";
import { branches } from "@usrahmedic/domain";
import { PatientBookingAction } from "../../components/actions";
import { PublicTopbar } from "../../components/chrome";

const services = [
  {
    title: "Antenatal & Buku Pink",
    detail: "Pemeriksaan ibu mengandung, follow-up berkala, urine/blood check, dan nasihat penjagaan.",
    icon: HeartPulse
  },
  {
    title: "2D hingga 5D Ultrasound",
    detail: "Tempahan scan, laporan, dan pengesahan slot mengikut doktor serta cawangan.",
    icon: Stethoscope
  },
  {
    title: "Haji & Umrah",
    detail: "Saringan kesihatan, vaksinasi, dan dokumentasi yang disusun untuk perjalanan.",
    icon: ShieldCheck
  }
];

const bookingSteps = [
  "Pilih cawangan dan perkhidmatan",
  "Semak butiran pesakit",
  "Bayar deposit RM10",
  "Tunggu pengesahan klinik"
];

export default function PatientPage() {
  return (
    <div className="app-shell patient-page">
      <PublicTopbar active="Tempah janji temu" />
      <main>
        <section className="patient-hero">
          <div className="patient-hero-copy">
            <span className="pill brand-pill">
              <Sparkles size={15} aria-hidden="true" />
              Tempahan online Usrah Medic
            </span>
            <h1>Tempah slot klinik, sahkan butiran, bayar deposit RM10.</h1>
            <p>
              Pengalaman tempahan ini direka seperti laman rasmi Usrah Medic: jelas, mesra pesakit, dan terus kepada
              tindakan. Pesakit yang log masuk akan melihat maklumat mereka diisi secara automatik sebelum bayaran.
            </p>
            <div className="patient-trust-row" aria-label="Booking highlights">
              <span><Clock3 size={17} aria-hidden="true" /> Cawangan 24 jam</span>
              <span><WalletCards size={17} aria-hidden="true" /> Deposit RM10</span>
              <span><MapPin size={17} aria-hidden="true" /> {branches.length} cawangan</span>
            </div>
            <div className="patient-hero-photo" aria-label="Usrah Medic family clinic booking" />
          </div>
          <PatientBookingAction />
        </section>

        <section className="patient-section patient-process" aria-label="Booking process">
          <div className="section-heading">
            <div>
              <p className="pill brand-pill">Cara tempahan</p>
              <h2>Ringkas untuk pesakit, lengkap untuk klinik</h2>
            </div>
            <p>
              Deposit RM10 membantu mengurangkan no-show. Klinik masih perlu mengesahkan slot sebenar sebelum lawatan.
            </p>
          </div>
          <div className="booking-steps">
            {bookingSteps.map((step, index) => (
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
              <p className="pill brand-pill">Perkhidmatan popular</p>
              <h2>Perkhidmatan yang selalu ditempah</h2>
            </div>
            <p>
              Fokus kepada servis yang pesakit benar-benar cari di laman klinik: ibu dan anak, ultrasound, saringan,
              vaksinasi, dan rawatan keluarga.
            </p>
          </div>
          <div className="grid grid-3">
            {services.map((service) => {
              const Icon = service.icon;
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

        <section className="patient-section branch-band" aria-label="UsrahMedic branches">
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
