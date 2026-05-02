# Cloudflare Deployment

This repository is configured for a static Next.js export on Cloudflare Pages, with Pages Functions under `functions/` and a D1 binding named `USRAHMEDIC_DB`.

Current Cloudflare deployment:

- Pages project: `usrahmedic-platform`
- Production URL: `https://usrahmedic-platform.pages.dev`
- Production D1 database: `usrahmedic-platform`
- Preview D1 database: `usrahmedic-platform-preview`

## One-time setup

1. Login and confirm the active account.

```powershell
npx wrangler login
npx wrangler whoami
```

2. Create the Pages project if it does not exist.

```powershell
npx wrangler pages project create usrahmedic-platform --production-branch=main
```

3. Create the production D1 database if it does not already exist.

```powershell
npx wrangler d1 create usrahmedic-platform
```

Copy the returned database UUID into `wrangler.toml`:

```toml
database_id = "<PRODUCTION_D1_DATABASE_ID>"
```

4. Create a preview D1 database if it does not already exist, or reuse production only for a controlled smoke test.

```powershell
npx wrangler d1 create usrahmedic-platform-preview
```

Copy the returned UUID into `wrangler.toml`:

```toml
preview_database_id = "<PREVIEW_D1_DATABASE_ID>"
```

5. Set non-secret allowed origins in `wrangler.toml`.

```toml
ALLOWED_ORIGINS = "https://usrahmedic-platform.pages.dev,https://<CUSTOM_DOMAIN>"
```

6. Optional but recommended: set an audit hash pepper as a Cloudflare secret. Do not commit the value.

```powershell
npx wrangler pages secret put AUDIT_HASH_PEPPER --project-name=usrahmedic-platform
```

## Migrations

Run migrations locally first.

```powershell
npx wrangler d1 migrations apply usrahmedic-platform --local
```

Run migrations against the remote production database after `wrangler.toml` has real D1 IDs.

```powershell
npx wrangler d1 migrations apply usrahmedic-platform --remote
```

For preview database validation, temporarily set `database_id` to the preview database ID or use the Cloudflare dashboard binding for the preview environment, then run the same migration command against the preview database name.

## Local preview

Build the static Next.js output.

```powershell
npm run build:cloudflare
```

Run Pages locally with the D1 binding.

```powershell
npx wrangler pages dev apps/platform/out --d1 USRAHMEDIC_DB=<LOCAL_OR_PREVIEW_D1_DATABASE_ID>
```

Smoke test the API.

```powershell
Invoke-RestMethod http://127.0.0.1:8788/api/health
```

Bootstrap the first branch and compliance evidence.

```powershell
$body = @{
  branch = @{
    code = "HQ"
    name = "UsrahMedic Main Branch"
    timezone = "Asia/Kuala_Lumpur"
  }
} | ConvertTo-Json -Depth 5

Invoke-RestMethod `
  -Method Post `
  -Uri http://127.0.0.1:8788/api/bootstrap `
  -Headers @{
    "X-UsrahMedic-Role" = "owner"
    "X-UsrahMedic-Actor-Id" = "<OWNER_USER_ID>"
  } `
  -ContentType "application/json" `
  -Body $body
```

## Preview deployment

Build and deploy a branch preview.

```powershell
npm run build:cloudflare
npx wrangler pages deploy apps/platform/out --project-name=usrahmedic-platform --branch=<PREVIEW_BRANCH>
```

Preview URL format:

```text
https://<PREVIEW_BRANCH>.usrahmedic-platform.pages.dev
```

## Production deployment

Apply remote migrations before deploying code that depends on new tables.

```powershell
npx wrangler d1 migrations apply usrahmedic-platform --remote
npm run build:cloudflare
npx wrangler pages deploy apps/platform/out --project-name=usrahmedic-platform
```

Production URL format:

```text
https://usrahmedic-platform.pages.dev
```

## API security notes

- The Pages Functions use CORS allow-listing from `ALLOWED_ORIGINS` plus local development origins.
- Mutating and owner endpoints require temporary role headers: `X-UsrahMedic-Role` and `X-UsrahMedic-Actor-Id`.
- Replace the temporary role headers with Cloudflare Access, an identity provider, or application auth before storing real patient data.
- Audit events hash actor IDs, resource IDs, IPs, user agents, and patient references. Audit metadata redacts common PHI keys and must not contain raw names, phone numbers, email addresses, diagnosis text, or tokens.
- Store secrets only through Cloudflare Pages secrets or local `.dev.vars`; do not commit secrets.

## Useful endpoints

- `GET /api/health`
- `GET|POST /api/bootstrap`
- `GET|POST /api/branches`
- `GET|POST /api/appointments`
- `POST /api/stock/receive`
- `POST /api/stock/scan`
- `GET /api/owner/export`
- `GET|POST /api/audit/events`
