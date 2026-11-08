# yourserver

A free server that is **always on**, needs **no credit card**, and is
built to be rewired into whatever you're building — an API, a webhook
receiver, a tiny database-backed app, a WebSocket backend, a login
system, a file host. MIT licensed. Deployed straight from GitHub, no
local install required (fits an Android/no-CLI workflow).

## Why Cloudflare Workers, and why no card

"Free, no credit card, never sleeps, deploy from GitHub" rules out
most of the usual names:

| Platform | Needs a card to sign up? | Free limit | Sleeps / cold start? | Languages |
|---|---|---|---|---|
| **Cloudflare Workers** (used here) | **No** — email only | 100,000 requests/day [[toolradar.com]](https://toolradar.com/tools/cloudflare-workers/pricing) | **Never** — not a VM, nothing to wake up | JS/TS natively; Python GA since Sep 2026 [[simonwillison.net]](https://simonwillison.net/2026/Sep/21/cloudflare-python-worker/) |
| Google Cloud Run | **Yes**, for identity verification | 2M requests/mo | Scales to zero, ~1s cold start | Any (Docker) |
| Oracle Cloud "Always Free" VM | **Yes** | Real VM, 2 OCPU/12GB (cut from 4/24 in Aug 2026) [[space-node.net]](https://space-node.net/blog/oracle-cloud-always-free-limits-2026) | Never | Any |
| Render / Railway / Glitch free | No (Render/Glitch) | Varies | **Sleeps after ~15 min idle**, 30–60s wake-up | Any |
| SnapDeploy free | No | 100 hrs/mo, 10 deploys/day | Auto-sleeps, ~60s wake-up | Docker |

Cloudflare Workers is the only option that is both card-free at
signup **and** genuinely always-on by construction — a Worker is a
function Cloudflare runs on demand at the edge, not a VM that idles,
so there is no sleep state to wake up from. The free tier covers
real usage for a personal or small-team project; see **Free-tier
numbers** below for the other services this kit optionally uses.

The tradeoff: Workers isn't a general-purpose VM, so it can't run
*literally* any existing program unmodified (a Python/Flask app
written for a classic server needs minor adapting; something in PHP,
C, or that needs `multiprocessing` won't run here at all — see
**If your code doesn't fit**, below).

## What makes this "customizable to the most"

Everything of substance is one file, and every feature can be turned
on or off without touching the others:

- **`src/config.js`** — the one file most people need to edit. Toggle
  every feature, change CORS rules, rate limits, and which routes
  require auth, all in one place.
- **`src/routes/*.js`** — one file per feature, each independently
  mountable/removable. Add a new one by copying the closest existing
  file (see `examples/add-a-route.md`).
- **`src/lib/*.js`** — thin, readable helpers (router, KV, D1, R2,
  middleware) with no framework underneath to learn — read the whole
  thing in a few minutes if you want to know exactly what it does.
- **`src/index.js`** — the only place routes get wired together; stays
  short on purpose, since the pattern is "add a file, add one line".

## Features included out of the box

| Feature | Route(s) | Backed by |
|---|---|---|
| Health check | `GET /health` | — |
| HTML landing page | `GET /` | — |
| Example API (hello, counter, echo, upstream proxy) | `/api/...` | KV |
| Username/password auth with sessions | `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/me` | KV |
| Generic key-value data store (a ready-made little database) | `/store/:key` | KV |
| SQL (relational) data — example "notes" CRUD | `/notes` | D1 |
| File upload/download | `/files/:key` | R2 |
| Webhook receiver + recent-events log | `/webhook/:source` | KV |
| WebSocket echo server | `wss://.../ws` | — |
| URL shortener | `/shorten`, `/shorten/:code` | KV |
| QR code generator (edge-cached) | `/qr?text=...` | — |
| SQL data via Firebase Firestore instead of D1 (optional) | `/firebase-notes` | Firestore, free Spark plan, no card |
| Live, designed landing page — not a template page; the hero panel makes real requests to this same server as it loads | `/` | — |
| CORS | all routes | `src/config.js` |
| Rate limiting (per-IP) | all routes | KV |
| Route protection (API key or session token) | configurable prefixes | KV |
| Request logging | all routes | — |
| Automated tests | `tests/run.mjs` | runs in CI on every push |

Turn any row off from `src/config.js → features` without deleting the
code, so you can grow back into it later.

## Setup (10 minutes, all from a browser)

1. **Use this repo as a template** (or fork it) into your own GitHub
   account.

2. **Create a free Cloudflare account** at cloudflare.com — email and
   password only, **no card required**.

3. **Create an API token**: Cloudflare dashboard → **My Profile → API
   Tokens → Create Token → "Edit Cloudflare Workers" template**. Copy
   it (shown once).

4. **Find your Account ID**: Workers & Pages → overview page, shown in
   the right-hand sidebar.

5. **Add two repository secrets** on GitHub
   (`Settings → Secrets and variables → Actions → New repository secret`):
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

6. **Push to `main`** (a GitHub web-UI edit-and-commit counts). The
   `deploy.yml` workflow deploys automatically — watch it in the
   **Actions** tab. `ci.yml` runs the test suite first.

7. **Find your URL**: Cloudflare dashboard → Workers & Pages → your
   Worker, something like `https://yourserver.<you>.workers.dev`.

### Turning on KV, D1 or R2 (all optional, all free, no card)

Most example routes need one of these bindings. Uncomment the matching
block in `wrangler.toml` after creating each resource:

```
npx wrangler kv namespace create APP_KV      # powers /store, /auth, rate limiting
npx wrangler d1 create yourserver-db          # powers /notes
npx wrangler r2 bucket create yourserver-files  # powers /files
npx wrangler d1 execute yourserver-db --remote --file=./schema.sql
```

(`npx wrangler` needs Node.js — run it from any machine you have handy
once, or do the equivalent clicks in the Cloudflare dashboard; it's
not needed again for day-to-day deploys, those go through Actions.)

### Turning on auth / an API key

See `examples/protect-a-route.md` — two ways, a shared API key for
your own scripts, or full login for real users, both already wired
into `src/lib/middleware.js`.

### Scheduling recurring jobs (free Cron Triggers substitute)

Cloudflare's own Cron Triggers need the paid plan. This kit's
`.github/workflows/scheduled-job.yml` is the free substitute — GitHub
Actions calls your Worker on a timer. Add the `WORKER_URL` repo
secret (your `*.workers.dev` URL) and edit the cron line to taste.

### A custom domain

See `examples/custom-domain.md` — free, works with any registrar.

### Using Firebase (Firestore) instead of, or alongside, D1

Useful if you already use Firebase elsewhere (e.g. a mobile app) and
want one shared database. Firebase's free **Spark** plan needs no
credit card [[dev.to]](https://dev.to/androve2k/spark-vs-blaze-the-firebase-pricing-guide-i-wish-id-read-sooner-onb)
and includes 1 GiB of Firestore storage with 50,000 reads / 20,000
writes per day.

1. Firebase console → **Project settings → Service accounts →
   Generate new private key**. Downloads a JSON file.
2. From that file, set three Worker secrets (never commit them):
   ```
   npx wrangler secret put FIREBASE_PROJECT_ID
   npx wrangler secret put FIREBASE_CLIENT_EMAIL
   npx wrangler secret put FIREBASE_PRIVATE_KEY
   ```
3. In `src/config.js`, set `features.firebaseNotes = true`.
4. `/firebase-notes` now works the same as `/notes`, but reads and
   writes Firestore instead of D1 — see `src/lib/firebase.js` for how
   the server-to-Firestore auth works (a signed service-account JWT,
   no Admin SDK needed, since that SDK doesn't run in Workers).

## If your code doesn't fit a Worker

Workers run JavaScript/TypeScript natively and Python via Cloudflare's
Pyodide-based runtime (`examples/python-worker/` has a minimal
starting point) — both on the same free, card-free, always-on tier.

For languages Workers can't run at all (PHP, Go binaries, anything
needing real OS threads or `multiprocessing`), there's no way to stay
card-free on a platform that spins up real containers — Google Cloud
Run, Fly.io, and Koyeb all ask for card verification even on their
free allowances. The honest free-and-cardless options for those
languages are classic shared PHP hosts (e.g. InfinityFree,
000webhost) deployed by FTP rather than GitHub Actions, which is a
different enough workflow that it's out of scope for this kit — worth
knowing rather than quietly working around.

## Local development (optional)

Not required to deploy (GitHub Actions does that), but if you're ever
on a machine with Node.js:

```
npm install
npm run dev      # local preview at http://localhost:8787
npm run deploy   # manual deploy, same as the Actions workflow
node tests/run.mjs  # run the test suite yourself
```

## Free-tier numbers (check before relying on them — these change)

- Workers: 100,000 requests/day, resets 00:00 UTC
- Workers KV, D1, R2: each has its own generous free monthly
  allowance (reads/writes/storage) — current numbers are in
  Cloudflare's own docs, since they're the ones who'd know first if
  something changed
- GitHub Actions: unlimited minutes on **public** repos; a limited
  monthly allowance on **private** repos under the free GitHub plan

## License

MIT — see `LICENSE`. Use it, fork it, sell things built on it, no
attribution required.
