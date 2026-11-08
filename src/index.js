import { Router, json } from "./lib/router.js";
import { corsMiddleware, loggingMiddleware, rateLimitMiddleware, authMiddleware } from "./lib/middleware.js";
import { config } from "./config.js";

import pageRoutes from "./routes/page.js";
import healthRoutes from "./routes/health.js";
import apiRoutes from "./routes/api.js";
import authRoutes from "./routes/auth.js";
import kvStoreRoutes from "./routes/kv-store.js";
import notesRoutes from "./routes/notes.js";
import filesRoutes from "./routes/files.js";
import webhookRoutes from "./routes/webhook.js";
import wsRoutes from "./routes/ws.js";
import shortenRoutes from "./routes/shorten.js";
import qrRoutes from "./routes/qr.js";
import firebaseNotesRoutes from "./routes/firebase-notes.js";

const router = new Router();

// Middleware runs in this order, wrapping every request.
router.useMiddleware(loggingMiddleware(config.logging));
router.useMiddleware(corsMiddleware(config.cors));
router.useMiddleware(rateLimitMiddleware(config.rateLimit));
router.useMiddleware(authMiddleware(config.auth));

// Every feature is its own file, mounted under its own prefix, and can
// be switched off from src/config.js without touching this file.
if (config.features.page) router.use("", pageRoutes);
if (config.features.health) router.use("/health", healthRoutes);
if (config.features.api) router.use("/api", apiRoutes);
if (config.features.auth) router.use("/auth", authRoutes);
if (config.features.kvStore) router.use("/store", kvStoreRoutes);
if (config.features.database) router.use("/notes", notesRoutes);
if (config.features.storage) router.use("/files", filesRoutes);
if (config.features.webhook) router.use("/webhook", webhookRoutes);
if (config.features.websocket) router.use("/ws", wsRoutes);
if (config.features.shorten) router.use("/shorten", shortenRoutes);
if (config.features.qr) router.use("/qr", qrRoutes);
if (config.features.firebaseNotes) router.use("/firebase-notes", firebaseNotesRoutes);

// An "admin" example route, protected when config.auth.enabled = true
// and "/admin" is listed in config.auth.protectedPrefixes.
router.get("/admin/whoami", () => json({ message: "You're authenticated." }));

export default {
  async fetch(request, env, ctx) {
    return router.handle(request, env, ctx);
  },

  // Fires only on the paid Workers plan with Cron Triggers enabled in
  // wrangler.toml. On the free plan, use the GitHub Actions scheduled
  // workflow instead — .github/workflows/scheduled-job.yml.
  async scheduled(event, env, ctx) {
    console.log("Scheduled event fired:", event.cron);
  },
};
