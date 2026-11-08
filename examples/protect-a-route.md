# Locking a route down

`yourserver` ships with two ways to require authentication on a route,
both already wired up in `src/lib/middleware.js`.

## Option A — a single shared API key (simplest)

Good for: a route only you (or your own other apps) should call — an
admin panel, a script that writes data, a webhook you trigger yourself.

1. Set the real key as a secret (never commit it):
   ```
   npx wrangler secret put API_KEY
   ```
   Or add it as a GitHub repo secret `APP_API_KEY` — `deploy.yml`
   already forwards it to the Worker on every deploy.

2. In `src/config.js`, turn auth on and list which path prefixes need
   it:
   ```js
   auth: {
     enabled: true,
     protectedPrefixes: ["/admin", "/notes"],
   },
   ```

3. Callers now need the header `x-api-key: <your key>` on any request
   under those prefixes, or they get `401 Unauthorized`.

## Option B — per-user login (for an app with real users)

Already built: `src/routes/auth.js` gives you `POST /auth/register`,
`POST /auth/login`, `POST /auth/logout`, `GET /auth/me`. A logged-in
user gets a bearer token; send it as `Authorization: Bearer <token>`
on any request to a path listed in `protectedPrefixes` (same
`config.js` setting as above) and it's accepted automatically — the
auth middleware checks both the API key and valid session tokens.

## Verifying a signed webhook (Stripe, GitHub, etc.)

`src/routes/webhook.js` has a commented-out HMAC check. Most providers
sign their payload with a shared secret and send the signature in a
header; store the secret with `wrangler secret put WEBHOOK_SECRET`
and compare it with `crypto.subtle` (an example helper is sketched in
that file's comment) before trusting the body.
