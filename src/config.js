/**
 * yourserver — central configuration.
 *
 * This is the one file most people need to touch to make the server
 * "theirs": turn features on/off, change the API key, change limits.
 * Everything here has a safe default, so the server works out of the
 * box with nothing changed.
 */

export const config = {
  appName: "yourserver",

  // --- CORS -----------------------------------------------------------
  // "*" allows any site to call your API. Set to a specific origin
  // (e.g. "https://myapp.com") or an array of origins to lock it down.
  cors: {
    enabled: true,
    allowOrigin: "*",
    allowMethods: "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    allowHeaders: "content-type, authorization, x-api-key",
  },

  // --- Auth -------------------------------------------------------------
  // When enabled, routes listed in `protectedPrefixes` require either
  // header `x-api-key: <API_KEY secret>` or `Authorization: Bearer <token>`
  // where <token> is a value previously issued by POST /auth/login.
  // Set the real key with `wrangler secret put API_KEY` (never commit it).
  auth: {
    enabled: false,
    protectedPrefixes: ["/admin"],
  },

  // --- Rate limiting ------------------------------------------------------
  // Simple fixed-window limiter backed by KV. Good enough to stop abuse
  // on a hobby project; swap for Cloudflare's built-in Rate Limiting
  // rules (dashboard) if you need something stricter.
  rateLimit: {
    enabled: true,
    windowSeconds: 60,
    maxRequests: 120, // per IP, per window
  },

  // --- Logging --------------------------------------------------------
  logging: {
    enabled: true,
    // "none" | "basic" | "verbose"
    level: "basic",
  },

  // --- Feature toggles --------------------------------------------------
  // Each corresponds to a route file in src/routes/. Set to false to
  // unmount a feature without deleting its code.
  features: {
    health: true,
    api: true,
    auth: true,
    kvStore: true,
    database: true,
    storage: true,
    webhook: true,
    websocket: true,
    page: true,
    shorten: true,
    qr: true,
    // Off by default — needs FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL /
    // FIREBASE_PRIVATE_KEY secrets first. See src/lib/firebase.js.
    firebaseNotes: false,
  },
};
