import { Router, json, errorResponse } from "../lib/router.js";
import { kvSetJSON, kvGetJSON, kvDelete } from "../lib/kv.js";

/**
 * Minimal username/password auth backed by KV, issuing opaque bearer
 * tokens (session IDs) — not JWTs, on purpose: no crypto library to
 * misuse, just a random token stored server-side so it can be revoked.
 *
 * This is a starting point, not a hardened auth system. For anything
 * with real users, consider a dedicated auth provider instead. Notably
 * missing on purpose, to keep this file readable: password reset,
 * email verification, hashing with a per-user salt rotation policy.
 * Passwords here are hashed with SHA-256 — fine for a hobby project,
 * but a slow hash (scrypt/argon2) is what a production system should
 * use; Workers doesn't have those built in without a package.
 */
const router = new Router();

async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

router.post("/register", async ({ env, request }) => {
  const { username, password } = await request.json().catch(() => ({}));
  if (!username || !password) {
    return errorResponse("username and password are required", 400);
  }
  const existing = await kvGetJSON(env, `user:${username}`);
  if (existing) return errorResponse("username already taken", 409);

  const passwordHash = await hashPassword(password);
  await kvSetJSON(env, `user:${username}`, { username, passwordHash });
  return json({ ok: true, username }, { status: 201 });
});

router.post("/login", async ({ env, request }) => {
  const { username, password } = await request.json().catch(() => ({}));
  if (!username || !password) {
    return errorResponse("username and password are required", 400);
  }
  const user = await kvGetJSON(env, `user:${username}`);
  if (!user) return errorResponse("invalid credentials", 401);

  const passwordHash = await hashPassword(password);
  if (passwordHash !== user.passwordHash) {
    return errorResponse("invalid credentials", 401);
  }

  const token = crypto.randomUUID();
  // Sessions expire after 7 days; adjust to taste.
  await kvSetJSON(env, `session:${token}`, { username }, { expirationTtl: 60 * 60 * 24 * 7 });
  return json({ token });
});

router.post("/logout", async ({ env, request }) => {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (token) await kvDelete(env, `session:${token}`);
  return json({ ok: true });
});

router.get("/me", async ({ env, request }) => {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return errorResponse("Unauthorized", 401);
  const session = await kvGetJSON(env, `session:${token}`);
  if (!session) return errorResponse("Unauthorized", 401);
  return json({ username: session.username });
});

export default router;
