# UsrahMedic Platform

Cloudflare-ready implementation foundation for the UsrahMedic clinic management platform.

## What Exists

- A TypeScript monorepo with a runnable Next.js platform app.
- Shared domain logic for clinic workflow states, permissions, compliance controls, seeded branches, medicine safety, and owner KPIs.
- Initial web surfaces for the public site, admin clinic operations, medicine operations, owner insights, patient PWA, and staff app.
- Cloudflare-oriented client actions for registration, stock receiving, owner export, patient booking, and staff stock scan.
- Static Next.js export for Cloudflare Pages, with Pages Functions and D1 as the edge API/data target.
- Architecture, compliance, and rollout documentation aligned to the reviewed plan.

## Run Locally

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

## Cloudflare Target

Live deployment:

- `https://usrahmedic-platform.pages.dev`

```powershell
npm run build:cloudflare
npm run preview:cloudflare
```

Production deployment uses Cloudflare Pages with `apps/platform/out` as the build output and Pages Functions under `functions/` for `/api/*` routes. D1 migrations live under `migrations/`.

After creating the real D1 database and updating `wrangler.toml` with the Cloudflare-provided IDs:

```powershell
npm run db:migrate:remote
npm run deploy:cloudflare
```

Key routes:

- `/` public website
- `/admin` clinic operations
- `/medicine` pharmacy and inventory
- `/insight` owner dashboards
- `/patient` patient PWA
- `/staff` staff mobile surface

The app also includes host-based rewrites for future deployment:

- `admin.usrahmedic.com` -> `/admin`
- `medicine.usrahmedic.com` -> `/medicine`
- `insight.usrahmedic.com` -> `/insight`

## Verification

```powershell
npm run lint
npm run test
npm run typecheck
npm run build
```

## Implementation Boundary

This is not yet the final clinic management system. It is the first executable Cloudflare foundation.

Production still needs:

- Real authentication and staff MFA.
- PostgreSQL persistence and audit storage.
- Payment, MyInvois, panel/TPA, WhatsApp, lab/radiology, and accounting integrations.
- Legal review for PDPA, CKAPS, MAB, OHS, prescribing, and dispensing workflows.
- Migration of real branch, panel, patient, service, price, and stock data.
- Security testing, backup/DR drills, and pilot branch rollout.
