import { Router, json, errorResponse } from "../lib/router.js";
import { kvGetJSON, kvSetJSON, kvDelete, kvListJSON } from "../lib/kv.js";

/**
 * Generic key-value CRUD API over KV — a ready-made little database
 * for anything shaped like "store this JSON under this name": app
 * settings, feature flags, a to-do list, saved game state, etc.
 *
 * GET    /store            -> list everything
 * GET    /store/:key       -> read one value
 * PUT    /store/:key       -> write one value (body = JSON)
 * DELETE /store/:key       -> delete one value
 */
const router = new Router();

router.get("/", async ({ env }) => {
  const items = await kvListJSON(env, "");
  return json({ items });
});

router.get("/:key", async ({ env, params }) => {
  const value = await kvGetJSON(env, params.key);
  if (value === null) return errorResponse("not found", 404);
  return json({ key: params.key, value });
});

router.put("/:key", async ({ env, params, request }) => {
  const value = await request.json().catch(() => null);
  if (value === null) return errorResponse("request body must be JSON", 400);
  await kvSetJSON(env, params.key, value);
  return json({ key: params.key, value });
});

router.delete("/:key", async ({ env, params }) => {
  await kvDelete(env, params.key);
  return json({ ok: true });
});

export default router;
