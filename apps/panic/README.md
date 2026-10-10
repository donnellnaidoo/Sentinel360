# apps/panic — panic button

A full-screen panic button for the phone in the panic box (phone screen
showing through the box, JBL speaker inside, Insta360 on the tripod).

Pressing it:

1. Starts a siren through the phone's audio output (pair the JBL with the phone).
2. Calls `apps/ai` `POST /stream/panic`, which grabs the camera's current
   unannotated view. If the pipeline is stopped, the press starts it and
   waits for the first frame.
3. Queues a `PANIC_BUTTON` event. The publisher sends it to
   `POST /internal/ai/events`, the same ingest path the knife and anomaly
   detections use, so it opens a CRITICAL auto-docket with the snapshot
   as evidence and alerts operators.
4. Polls `GET /stream/panic/{eventId}` and shows the docket number once it exists.

Presses within `PANIC_COOLDOWN_SECONDS` (default 10s) join the same docket.

## Running it

On the camera laptop, next to `apps/ai`:

```sh
cp apps/panic/.env.example apps/panic/.env   # set AI_SERVICE_API_KEY = apps/ai BACKEND_API_KEY
bun run dev:ai
bun run dev:panic
```

Vite prints a `Network:` URL (e.g. `http://192.168.1.20:3002`). Open it on
the phone; the phone must be on the same Wi-Fi as the laptop (or on the
laptop's hotspot). The API key stays on the laptop: the phone only calls
`/api/*`, and the Vite proxy adds the key before forwarding to `apps/ai`.

## Hosted on Vercel

Production: https://sentinel360-panic.vercel.app (Vercel project
`sentinel360-panic`, root directory `apps/panic`, region `cpt1`).

There the Vite proxy doesn't exist; `api/` holds Vercel functions that do the
same job (`/api/health`, `/api/panic`, `/api/panic/:eventId` -> apps/ai, key
added server-side). They need two project env vars:

- `AI_SERVICE_URL` — apps/ai reachable from the internet. The camera laptop
  exposes it with Tailscale Funnel: `tailscale funnel --bg 8001`, giving
  `https://desktop-b0no8mc.tail8c9133.ts.net`. Plain `tailscale serve`
  is tailnet-only and Vercel can't reach it.
- `AI_SERVICE_API_KEY` — the laptop's apps/ai `BACKEND_API_KEY`.

Deploy from the repo root (the root `.vercel/` links the main project, so
point the CLI at this one):

```sh
VERCEL_ORG_ID=team_o0V6THtuW8fxV7NM86dIVD0m VERCEL_PROJECT_ID=prj_dji7QwrV5wbMwvYSWOu4nLjGXxZM \
  vercel deploy --prod
```

The page has no login: anyone with the URL can press it and open a CRITICAL docket.

## Phone setup

- Add to Home Screen so it opens full screen.
- Turn auto-lock off (or use iOS Guided Access / Android screen pinning). The
  page is served over plain HTTP on the LAN, so the browser won't allow
  it to keep the screen awake itself.
- Pair the JBL over Bluetooth and turn the media volume up.
- The page has no login: anyone who can reach the laptop's IP on port 3002 can
  press it. That's fine on a closed demo network but not on a shared one.
