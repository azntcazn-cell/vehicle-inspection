# Vehicle Inspection Checklist

A web app for tracking vehicle pre-trip inspections across a small fleet. Inspectors log in individually, run through a checklist per vehicle, and admins manage vehicles, users, and the checklist itself.

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript)
- [Turso](https://turso.tech) (hosted libSQL / SQLite-compatible) via [Drizzle ORM](https://orm.drizzle.team)
- [Auth.js](https://authjs.dev) (NextAuth v5) with email/password credentials
- [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) for inspection photo/video attachments
- Tailwind CSS

## Local development

Install dependencies:

```bash
npm install
```

Copy the env file and fill in `AUTH_SECRET` (generate one with `npx auth secret`):

```bash
cp .env.example .env.local
```

You can leave `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` empty for local dev — the app falls back to a local SQLite file (`local.db`). Likewise, `BLOB_READ_WRITE_TOKEN` can be left empty locally — inspection photo/video uploads fall back to `public/uploads`.

Push the schema and seed a default checklist + admin user:

```bash
npm run db:push
npm run db:seed
```

This creates an admin login (`admin@example.com` / `changeme123` by default — override with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` env vars before seeding).

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Setting up Turso for production

Local SQLite files don't persist on Vercel's serverless filesystem, so production uses [Turso](https://turso.tech) (hosted libSQL, same SQLite dialect).

```bash
# install the Turso CLI, then:
turso db create vehicle-inspection
turso db show vehicle-inspection --url          # -> TURSO_DATABASE_URL
turso db tokens create vehicle-inspection        # -> TURSO_AUTH_TOKEN
```

Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in your deployment environment, then push the schema against that database:

```bash
TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npm run db:push
TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npm run db:seed
```

## Setting up Vercel Blob for production

Photo/video attachments use [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) so uploads persist in production (local disk doesn't survive on Vercel's serverless filesystem, same issue as SQLite).

From your Vercel project: **Storage → Create Database → Blob**, then copy the generated `BLOB_READ_WRITE_TOKEN` into your environment variables.

## Deploying to Vercel

1. Push this repo to GitHub and import it into Vercel.
2. Add environment variables in the Vercel project settings: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `AUTH_SECRET`, `BLOB_READ_WRITE_TOKEN`.
3. Deploy. Run `db:push`/`db:seed` against the production database (from your machine, as above) before first use.

## App structure

- `/login` — sign in
- `/` — dashboard: active vehicles, last inspection status, quick "Start Inspection"
- `/inspect/[vehicleId]` — run a checklist inspection
- `/history` — past inspections, filterable by vehicle/inspector/status/date
- `/vehicles`, `/admin/users`, `/admin/checklist` — admin-only management screens

## Scripts

- `npm run dev` — start the dev server
- `npm run build` / `npm run start` — production build/start
- `npm run db:push` — push the Drizzle schema to the configured database
- `npm run db:seed` — seed the default checklist template and an admin user
