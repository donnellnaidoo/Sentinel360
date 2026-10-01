# Sentinel360

A surveillance/incident-management platform: web dashboard, mobile app, an API server, and a CCTV AI detection pipeline. Built as a Turborepo monorepo on [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack) (Next.js, Hono, tRPC) with Supabase for auth and PostgreSQL.

## Features

- **TypeScript** - For type safety and improved developer experience
- **Next.js** - Web dashboard (`apps/web`)
- **React Native / Expo** - Mobile app (`apps/native`)
- **Hono + tRPC** - Type-safe API server (`apps/server`)
- **FastAPI + Ultralytics/OpenCV** - CCTV AI detection pipeline (`apps/ai`)
- **Supabase Auth** - Authentication and session handling
- **Drizzle ORM + PostgreSQL** - Database layer (`packages/db`)
- **Shared UI package** - shadcn/ui primitives live in `packages/ui`
- **Turborepo + Bun** - Monorepo build system and runtime

## Getting Started

### 1. Prerequisites

- [Bun](https://bun.sh)
- A PostgreSQL database (e.g. a [Supabase](https://supabase.com) project, which also provides auth)
- [uv](https://docs.astral.sh/uv/) and Python 3.11 or 3.12, only if you're working on `apps/ai`

### 2. Install dependencies

```bash
bun install
```

### 3. Configure environment variables

Each app reads its own `.env` file. Copy the example values and fill them in with your Supabase project's credentials:

| File | Key variables |
|---|---|
| `apps/server/.env` | `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CORS_ORIGIN`, `AI_SERVICE_API_KEY` |
| `apps/web/.env` | `NEXT_PUBLIC_SERVER_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| `apps/native/.env` | `EXPO_PUBLIC_SERVER_URL`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_TOMTOM_API_KEY` |
| `apps/ai/.env` | `STREAM_SOURCE`, `CAMERA_ID`, `BACKEND_URL`, `BACKEND_API_KEY` (must match `AI_SERVICE_API_KEY`) — see `apps/ai/README.md` |

Never commit real `.env` files with secrets.

### 4. Set up the database

```bash
bun run db:push
```

### 5. Run the apps

```bash
bun run dev
```

This starts the server, web, and native dev processes together via Turborepo. To run one at a time, see [Available Scripts](#available-scripts).

- Web dashboard: [http://localhost:3001](http://localhost:3001)
- API server: [http://localhost:3000](http://localhost:3000)
- Mobile: open with the Expo Go app (or a simulator) once `dev:native` is running
- AI pipeline: run separately, see `apps/ai/README.md` for Python setup

On a physical phone, `EXPO_PUBLIC_SERVER_URL` must be this computer's LAN address (for example `http://192.168.1.20:3000`). `localhost` only works in a simulator on the same machine. Restart the Expo dev server after changing `apps/native/.env`.

## Mobile app

`apps/native` is the community app (Expo Router). Tabs: Home, Alerts, Wanted, Report, Profile.

Auth and account screens:

- Onboarding, sign-in, and sign-up
- Forgot password: email, then a 6-digit recovery code, then a new password
- Signed-in change password: confirm the current password, then set a new one
- Edit profile, notification preferences, privacy and safety, dark mode
- Home neighborhood (device location plus a place name), my sightings, secure tips
- Help center and terms and privacy

Password reset emails are sent by Supabase Auth as a recovery OTP. Codes last 15 minutes. The API allows 3 reset requests per hour and 5 wrong attempts before the code is invalidated. Email templates live in `packages/db/supabase/templates/`. To push the 6-digit recovery and confirmation templates to the Supabase project, set `ACCESS_TOKEN_SECRET` (a [Supabase access token](https://supabase.com/dashboard/account/tokens)) in the env file the script reads, then run `packages/api/scripts/update-supabase-otp-templates.ts`.

`EXPO_PUBLIC_TOMTOM_API_KEY` is optional at startup and required for place names. The home and profile screens reverse-geocode the device GPS through the [TomTom Search API](https://developer.tomtom.com/). Without the key, the app still runs and shows coordinates or a location error instead of a neighborhood name. Create a key in the TomTom developer portal and add it to `apps/native/.env`.

The app asks for location while in use (area label and reports), and for camera and photo library access (profile picture and report evidence).

## Project Structure

```
Sentinel360/
├── apps/
│   ├── web/         # Web dashboard (Next.js)
│   ├── native/       # Mobile app (React Native, Expo)
│   ├── server/       # API server (Hono, tRPC) - talks to Postgres/Supabase
│   └── ai/          # CCTV AI detection pipeline (Python/FastAPI) - posts
│                     # detection events to the server's internal API
├── packages/
│   ├── ui/           # Shared shadcn/ui components and styles
│   ├── api/          # tRPC routers / business logic used by apps/server
│   ├── auth/         # Supabase auth client and helpers (used server-side)
│   ├── db/           # Drizzle schema, migrations, and queries
│   └── env/          # Typed, validated environment variables per app
├── supabase/          # Supabase project config
└── docs/              # Requirements, architecture, and domain docs
```

`apps/server` is the source of truth: it verifies Supabase-issued JWTs, exposes the tRPC API to `apps/web`/`apps/native`, and receives detection events from `apps/ai` over an internal API key.

## Available Scripts

- `bun run dev`: Start all applications in development mode
- `bun run build`: Build all applications
- `bun run dev:web`: Start only the web application
- `bun run dev:server`: Start only the server
- `bun run dev:native`: Start the React Native/Expo development server
- `bun run dev:ai`: Start the AI pipeline (requires `uv sync` in `apps/ai` first)
- `bun run check-types`: Check TypeScript types across all apps
- `bun run db:push`: Push schema changes to database
- `bun run db:generate`: Generate database client/types
- `bun run db:migrate`: Run database migrations
- `bun run db:studio`: Open database studio UI

## UI Customization

Web apps in this stack share shadcn/ui primitives through `packages/ui`.

- Change design tokens and global styles in `packages/ui/src/styles/globals.css`
- Update shared primitives in `packages/ui/src/components/*`
- Adjust shadcn aliases or style config in `packages/ui/components.json` and `apps/web/components.json`

### Add more shared components

Run this from the project root to add more primitives to the shared UI package:

```bash
npx shadcn@latest add accordion dialog popover sheet table -c packages/ui
```

Import shared components like this:

```tsx
import { Button } from "@Sentinel360/ui/components/button";
```

### Add app-specific blocks

If you want to add app-specific blocks instead of shared primitives, run the shadcn CLI from `apps/web`.



