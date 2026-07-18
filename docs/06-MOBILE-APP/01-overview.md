# Sentinel360 Mobile App Overview

> The community-facing mobile application for Sentinel360 — connecting residents, security operators, and law enforcement through real-time safety intelligence.

## Purpose

The Sentinel360 mobile app (codenamed **SentinelWatch**) serves as the primary community engagement surface of the platform. It bridges the gap between AI-powered surveillance detection and the people who need that information to stay safe.

The app addresses three core needs:

- **Community engagement** — Residents stay informed about safety incidents in their area, receive verified updates from neighbours, and participate in keeping their community secure.
- **Sightings submission** — Community members can submit sightings of wanted persons, attaching photos, descriptions, and GPS location. Reports are flagged for law enforcement review and action.
- **Real-time alerts** — Push notifications deliver critical safety alerts (crime incidents, environmental hazards, infrastructure disruptions) with severity levels, location context, and actionable next steps.

## Technology Stack

| Layer              | Technology                                                              |
| ------------------ | ----------------------------------------------------------------------- |
| Framework          | **Expo 55** (SDK ~55.0.18)                                             |
| UI Runtime         | **React Native 0.83.2**                                                 |
| Navigation         | **Expo Router ~55.0.2** (file-based routing, typed routes)              |
| UI Component Kit   | **HeroUI Native ^1.0.0** (themed components, toast, inputs, surfaces)   |
| Styling            | **Uniwind ^1.6.0** + Tailwind CSS v4 (runtime-native utility classes)    |
| Forms              | **TanStack React Form** (catalog dep) + **Zod** schema validation       |
| Server State       | **TanStack React Query** (catalog dep)                                  |
| API Client         | **tRPC** (v11, `@trpc/client` + `@trpc/tanstack-react-query` proxy)     |
| Authentication     | **better-auth** (catalog) with `@better-auth/expo` native client plugin |
| Secure Storage     | **expo-secure-store** (session persistence)                             |
| Maps               | **react-native-maps ^1.27.2**                                           |
| Haptics            | **expo-haptics ~55.0.8**                                                |
| Animations         | **react-native-reanimated ^4.2.1**                                      |
| Gestures           | **react-native-gesture-handler ~2.30.0**                                |
| Bottom Sheets      | **@gorhom/bottom-sheet ^5**                                             |
| Keyboards          | **react-native-keyboard-controller ^1.20.7**                            |

## Architecture

The mobile app follows a **monorepo-first** architecture. It consumes shared packages from the workspace monorepo:

- **`@Sentinel360/api`** — tRPC router types and context. The app imports the `AppRouter` type to create a fully typed client connection to the Hono.js server.
- **`@Sentinel360/env`** — Environment variable schemas. The native variant (`@Sentinel360/env/native`) validates `EXPO_PUBLIC_SERVER_URL` using `@t3-oss/env-core`.
- **`@Sentinel360/config`** — Shared TypeScript and tooling configuration (dev dependency).

### Communication Flow

```
[Mobile App]  ──tRPC (httpBatchLink)──>  [Hono.js Server]
                                   │
                    [better-auth session cookies]
                                   │
[Mobile App]  ◀──Push Notification──  [FCM / APNs]
```

1. The app authenticates via **better-auth**, which manages session cookies stored in `expo-secure-store`.
2. All authenticated API calls flow through **tRPC** with the session cookie attached via a custom `headers()` function in the `httpBatchLink`.
3. Real-time alerts arrive through **push notifications** configured at the client registration level.
4. Media uploads (sighting photos) use **presigned S3 URLs** obtained from the server.

## User Roles

### Community Member (Primary)

The primary audience for the mobile app. Community members:

- Register and log in with email/password via better-auth
- View the public wanted feed (no login required for public access)
- Submit sightings of wanted persons with photos, description, and location
- Receive push notifications for alerts in their configured radius
- Configure alert preferences (radius, notification types)
- View their own sighting history and status updates

### Security Operator (Secondary)

Security operators have all community member capabilities plus:

- Access to the full wanted feed (including resolved cases)
- Ability to submit CCTV snapshots for AI analysis
- Receive operational alerts when AI detects suspect matches near monitored sites
- Acknowledge and escalate alerts from the mobile dashboard

## Key Features

| Feature               | Description                                                                                     |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| **Onboarding**        | 3-slide carousel introducing the app's value proposition. Skip or proceed to sign-up/sign-in.   |
| **Authentication**    | Email/password sign-up and sign-in via better-auth. Session persistence with biometric option.   |
| **Home Map**          | MapView showing nearby alerts and community activity. Current region card with safety status.    |
| **Alerts Feed**       | Filterable, searchable list of real-time alerts with severity badges (CRITICAL, SEVERE, ADVISORY). |
| **Wanted Feed**       | Public wanted persons repository with photo cards, status tags, and submit-sighting CTA.          |
| **Report Sighting**   | Upload photo/video from camera or gallery, auto-detect location, add description, toggle anonymity. |
| **Profile**           | User info, settings, notification preferences, sighting history, theme toggle.                   |

## Navigation Structure

The app uses Expo Router's file-based routing in a layered navigation architecture:

```
App Root (_layout.tsx)
├── [unauthenticated]
│   ├── /onboarding           → OnboardingScreen (carousel)
│   ├── /sign-in              → AuthScreen (mode="sign-in")
│   ├── /sign-up              → AuthScreen (mode="sign-up")
│   └── /modal                → Modal (presentation overlay)
│
└── [authenticated] → (drawer)/
    ├── index.tsx             → Redirect check (session → tabs)
    │
    └── (tabs)/
        ├── index.tsx         → Home (MapView, community feed, alerts summary)
        ├── alerts.tsx        → Alerts (filterable list, detail navigation)
        ├── wanted.tsx        → Wanted (public feed → person detail)
        ├── report.tsx        → Report Sighting (camera, location, description)
        └── profile.tsx       → Profile (user info, settings, history)
```

### Flow-by-flow

1. **First launch** → Onboarding carousel → Skip → Sign-in / Create Account
2. **Returning user** → Session check → Direct to `/ (drawer)/(tabs)`
3. **Authenticated** → Drawer → Tab navigation among Home, Alerts, Wanted, Report, Profile
4. **Unauthenticated access** → Public feed (wanted) is accessible; all other tabs redirect to sign-in

## App Provider Hierarchy

```
QueryClientProvider
└── GestureHandlerRootView
    └── KeyboardProvider
        └── AppThemeProvider (Uniwind light/dark)
            └── HeroUINativeProvider
                └── StackLayout (Expo Router Stack)
                    ├── Onboarding
                    ├── Sign-in / Sign-up
                    ├── Modal
                    └── Drawer → Tabs
```

- **QueryClientProvider** — Wraps all screens with TanStack Query context for server state management.
- **GestureHandlerRootView** — Required for react-native-gesture-handler (drawer, swipe gestures).
- **KeyboardProvider** — Manages keyboard avoidance and controller behaviour.
- **AppThemeProvider** — Uniwind-based theme context supporting light/dark mode with system default integration.
- **HeroUINativeProvider** — Theming context for HeroUI Native component library.

## Environment Configuration

Environment variables are defined in `@Sentinel360/env/native` and validated at build time:

| Variable                   | Description                  |
| -------------------------- | ---------------------------- |
| `EXPO_PUBLIC_SERVER_URL`   | Base URL of the Hono.js API  |

The app uses `expo-constants` for the OAuth scheme configuration and `expo-secure-store` for session token persistence.

## Global Styles

The app imports a single global CSS entry point (`global.css`) that composes:
- `@import "tailwindcss"` — Tailwind CSS v4 base
- `@import "uniwind"` — Uniwind runtime utilities
- `@import "heroui-native/styles"` — HeroUI component styles
- `@source './node_modules/heroui-native/lib'` — HeroUI source scanning
