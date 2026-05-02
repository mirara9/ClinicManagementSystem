import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Activity, BarChart3, Building2, CalendarCheck, ClipboardList, Cloud, Construction, Home, Phone, Pill, ShieldCheck } from "lucide-react";

const publicSurfaces = [
  { href: "/", label: "Laman utama", icon: Home },
  { href: "/patient", label: "Tempah janji temu", icon: CalendarCheck }
];

const internalSurfaces = [
  { href: "/admin", label: "Admin", icon: ClipboardList },
  { href: "/medicine", label: "Medicine", icon: Pill },
  { href: "/insight", label: "Insight", icon: BarChart3 }
];

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link className="brand" href={href}>
      <span className="brand-symbol">U+</span>
      <span className="brand-lockup">
        <strong><span>USRAH</span> MEDIC</strong>
        <small>Embrace your health</small>
      </span>
    </Link>
  );
}

export function PublicTopbar({ active = "Public" }: { active?: string }) {
  return (
    <header className="topbar">
      <Brand />
      <nav className="surface-nav" aria-label="Platform surfaces">
        {publicSurfaces.map((surface) => {
          const Icon = surface.icon;
          return (
            <Link className={surface.label === active ? "active" : ""} href={surface.href} key={surface.href}>
              <Icon size={16} aria-hidden="true" />
              {surface.label}
            </Link>
          );
        })}
        <a className="nav-contact" href="tel:+601135664998">
          <Phone size={16} aria-hidden="true" />
          011-3566 4998
        </a>
      </nav>
    </header>
  );
}

export function AppTopbar({ app, homeHref, icon: Icon }: { app: string; homeHref: string; icon: LucideIcon }) {
  return (
    <header className="topbar app-topbar">
      <Brand href={homeHref} />
      <span className="surface-identity">
        <Icon size={16} aria-hidden="true" />
        {app}
      </span>
    </header>
  );
}

export function DashboardShell({
  active,
  children,
  title,
  subtitle,
  actions
}: {
  active: string;
  children: React.ReactNode;
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}) {
  return (
    <main className="dashboard">
      <aside className="sidebar">
        <Brand href="/admin" />
        <nav className="side-nav" aria-label="Internal surfaces">
          {internalSurfaces.map((surface) => {
            const Icon = surface.icon;
            return (
              <Link className={surface.label === active ? "active" : ""} href={surface.href} key={surface.href}>
                <Icon size={18} aria-hidden="true" />
                {surface.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <section className="workspace">
        <div className="workspace-header">
          <div>
            <p className="pill ok">
              <ShieldCheck size={14} aria-hidden="true" />
              Internal workspace
            </p>
            <h1>{title}</h1>
            <p className="muted">{subtitle}</p>
          </div>
          {actions}
        </div>
        {children}
      </section>
    </main>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "ok"
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone?: "ok" | "warn" | "danger";
}) {
  return (
    <article className="card stat">
      <span className={`pill ${tone}`}>
        <Icon size={15} aria-hidden="true" />
        {label}
      </span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

export function SectionHeading({ title, text }: { title: string; text: string }) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    </div>
  );
}

export function SystemNotice() {
  return (
    <span className="pill warn">
      <Construction size={14} aria-hidden="true" />
      Foundation preview
    </span>
  );
}

export function BranchBadge({ label }: { label: string }) {
  return (
    <span className="pill">
      <Building2 size={14} aria-hidden="true" />
      {label}
    </span>
  );
}

export function IntegrationNotice() {
  return (
    <span className="pill warn">
      <Activity size={14} aria-hidden="true" />
      Cloudflare API pending
    </span>
  );
}

export function CloudflareReadiness({ endpoint, note }: { endpoint: string; note?: string }) {
  return (
    <div className="readiness">
      <span className="pill warn">
        <Cloud size={14} aria-hidden="true" />
        Cloudflare-ready
      </span>
      <p>
        Posts to <strong>{endpoint}</strong>. {note ?? "Local/offline fallback remains active until Pages Functions and D1 are deployed."}
      </p>
    </div>
  );
}
