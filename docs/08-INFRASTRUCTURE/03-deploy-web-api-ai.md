# Deploying Sentinel360: web, API and AI service

> What is actually deployed today. `01-deployment-guide.md` describes a
> future Kubernetes target that has not been built.

**Production:** https://sentinel360-rosy.vercel.app (Vercel project
`sentinel360`, region `lhr1`). `<your-domain>` below means this URL.

## Topology

```
 Browser / mobile app ──HTTPS──▶  Vercel project "sentinel360"  (region lhr1, London)
                                   ├─ /trpc/*, /internal/*  → service "api"  (apps/server, Hono)
                                   └─ everything else       → service "web"  (apps/web, Next.js 16)
                                           │                       │
                                           │                       │ /api/ai/* proxy (session + console role,
                                           ▼                       ▼  shared key)
                                   Supabase (eu-west-2)     AI service on the camera machine
                                   Postgres · Auth · Storage   (apps/ai, FastAPI, port 8001)
                                           ▲                    exposed over HTTPS by Tailscale Funnel
                                           └──── POST /internal/ai/events (shared key) ────┘
```

- **Web + API** are two Vercel Services in one project: one domain, one
  deployment, one rollback. Same origin, so no CORS between them.
- **AI service** runs next to the camera, not on Vercel. It is a continuous
  video loop holding models in memory, reading a camera on the local network,
  so it cannot be a stateless, scale-to-zero Function. It only makes
  *outbound* calls to the API; the Funnel URL exists so the Live Monitor can
  reach its feed.

## Limits that shaped the code

| Limit (Vercel) | Effect | Handled by |
|---|---|---|
| 4.5 MB request body | AI events carry 2 base64 images | `MAX_AI_MEDIA_BYTES` = 1.5 MB (largest body ≈ 4.06 MB); snapshots are 10–200 KB |
| 300 s max function duration (Hobby) | The MJPEG feed proxy is one long response | Monitoring page reopens the feed every 270 s and retries on error |
| Serverless DB connections | Many short-lived instances | Supabase **transaction** pooler, port **6543** |
| No Edge runtime inside Services | Next.js `middleware.ts` compiles to Edge | Renamed to `proxy.ts` (Next.js 16 convention, runs on Node.js) |

## 1. One-time setup

1. **Link the repo** (from the repo root): `vercel link` → create project `sentinel360`.
   `vercel.json` at the root defines the services and routing.
2. **Production secret for the AI channel** — generate a new one, don't reuse the dev key:
   `openssl rand -hex 32`. Use the same value in all three places below.
3. **Environment variables** (Vercel → Settings → Environment Variables, Production):

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Supabase pooler URL with port **6543** (transaction mode) |
   | `SUPABASE_URL` | `https://<ref>.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
   | `CORS_ORIGIN` | `https://<your-domain>` |
   | `AI_SERVICE_API_KEY` | the production secret |
   | `NEXT_PUBLIC_SERVER_URL` | `https://<your-domain>` (same origin as the web app) |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
   | `AI_SERVICE_URL` | the AI machine's Funnel URL, e.g. `https://ai-box.<tailnet>.ts.net` |

   `NEXT_PUBLIC_*` values are baked in at build time: redeploy after changing them.
   Don't set `NODE_ENV`: Vercel already runs functions with `production`
   (which keeps email bodies out of logs), and setting it as a project
   variable also applies at build time, where installs then skip
   devDependencies (TypeScript, tsdown) and the build fails.
4. **Supabase Auth** → URL Configuration: set Site URL to `https://<your-domain>`
   and add `https://<your-domain>/auth/callback` and `/reset-password` to the
   redirect URLs.

## 2. Deploy web + API

```bash
vercel deploy            # preview
vercel deploy --prod     # production
```

Check: `https://<your-domain>/login` loads, sign in, Dashboard and Cases load
(tRPC through `/trpc`). Roll back with "Promote" on the previous deployment
(Vercel dashboard), ~1–2 min.

Preview deployments call the production API (`NEXT_PUBLIC_SERVER_URL` is
absolute). Fine for now; scope it per environment if previews need isolation.

## 3. Run the AI service on the camera machine

Windows box with the X3 (or any machine for the demo clip / an IP camera).

```bash
cd apps/ai
uv sync
# models/yolov8n.pt and models/slowfast_ucfcrime_binary.pth from the model team's handoff
cp .env.example .env
```

`apps/ai/.env`:

```
STREAM_SOURCE=x3tcp://127.0.0.1:5001     # or rtsp://..., or samples/demo.mp4
CAMERA_ID=CAM-ENTRANCE-1
CAMERA_LOCATION_NAME=Main entrance
BACKEND_URL=https://<your-domain>
BACKEND_API_KEY=<the production secret>
```

Run it (no `--reload` outside development):

```bash
uv run uvicorn app.main:app --host 127.0.0.1 --port 8001
```

For the X3: start `Sentinel360X3Stitcher.exe` **before** pressing Start on
the Live Monitor (the pipeline does not yet wait for the stitcher).

### Windows machine (the X3 box)

Everything runs natively in PowerShell — no WSL needed. The repo's
`bun run dev:ai` uses a bash helper, so start uvicorn directly instead.

1. Install **Git**, **Python 3.11** and **uv**
   (`powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"`).
2. Clone the repo, check out the integration branch, then:
   ```powershell
   cd apps\ai
   uv sync
   ```
   This installs CPU PyTorch. (MPS is Mac-only; an NVIDIA GPU needs the CUDA
   wheels from pytorch.org, otherwise `auto` falls back to CPU.)
3. Copy `yolov8n.pt` and `slowfast_ucfcrime_binary.pth` from the model team's
   `py-weight\` folder into `apps\ai\models\`.
4. Create `apps\ai\.env` (values from the deployment owner; never commit it):
   ```
   STREAM_SOURCE=x3tcp://127.0.0.1:5001
   CAMERA_ID=CAM-X3-1
   CAMERA_LOCATION_NAME=<where the camera is>
   BACKEND_URL=https://sentinel360-rosy.vercel.app
   BACKEND_API_KEY=<production AI secret>
   ```
   On CPU the X3's four views with anomaly detection run at ~3–4 fps; set
   `ANOMALY_ENABLED=false` if knife detection feels sluggish.
5. Dry run without the camera: set `STREAM_SOURCE=samples/demo.mp4` after
   `uv run python samples\generate_smoketest_clip.py`.
6. Start `Sentinel360X3Stitcher.exe`, then:
   ```powershell
   uv run uvicorn app.main:app --host 127.0.0.1 --port 8001
   ```

### Expose it over HTTPS with Tailscale Funnel

1. Install Tailscale on the AI machine and sign in.
2. Enable Funnel for the tailnet (admin console → Access controls), then:
   `tailscale funnel --bg 8001`
3. The machine's URL (`https://<machine>.<tailnet>.ts.net`) is `AI_SERVICE_URL`
   in Vercel. Redeploy is not needed for server-side vars, but a new
   deployment picks them up reliably.

Everything under `/stream/*` requires the shared key; `/health` is public.

## 4. Verify end to end

1. `curl https://<machine>.<tailnet>.ts.net/health` → `{"status":"ok",...}`
2. Live Monitor → Start → feed appears; the status panel shows fps.
3. Optional real-docket check from the AI machine (creates a real docket —
   close it afterwards): `uv run python scripts/smoke_e2e.py`

## Costs and quotas to watch

- **Vercel bandwidth:** the proxied MJPEG feed is ~0.25 MB/s per viewer
  (~0.9 GB/hour). Keep the Live Monitor closed when not in use on Hobby.
- **Supabase free plan** pauses after ~7 days idle; open the project before demos.
