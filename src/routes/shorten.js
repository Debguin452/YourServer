import { Router, json, errorResponse } from "../lib/router.js";
import { kvGetJSON, kvSetJSON } from "../lib/kv.js";

/**
 * A tiny URL shortener, backed by KV.
 *
 * POST /shorten          { url: "https://..." }  -> { code, shortUrl }
 * GET  /shorten/:code    -> 302 redirect to the original URL
 * GET  /shorten          -> list everything you've shortened
 */
const router = new Router();

function randomCode(length = 6) {
  const alphabet = "abcdefghijkmnpqrstuvwxyzACDEFGHJKLMNPQRSTUVWXY23456789"; // no 0/O/l/1/B/8 confusion
  let code = "";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i++) code += alphabet[bytes[i] % alphabet.length];
  return code;
}

router.get("/", async ({ env }) => {
  if (!env.APP_KV) return errorResponse("APP_KV not configured", 500);
  const { keys } = await env.APP_KV.list({ prefix: "shorten:" });
  const links = await Promise.all(
    keys.map(async (k) => ({ code: k.name.replace("shorten:", ""), url: await kvGetJSON(env, k.name) }))
  );
  return json({ links });
});

router.post("/", async ({ env, request, url }) => {
  const { url: target, code: wantedCode } = await request.json().catch(() => ({}));
  if (!target) return errorResponse("url is required", 400);
  try {
    new URL(target);
  } catch {
    return errorResponse("url must be a valid absolute URL", 400);
  }

  let code = wantedCode || randomCode();
  if (wantedCode) {
    const existing = await kvGetJSON(env, `shorten:${code}`);
    if (existing) return errorResponse("that code is already taken", 409);
  }

  await kvSetJSON(env, `shorten:${code}`, target);
  return json({ code, shortUrl: `${url.origin}/shorten/${code}`, target }, { status: 201 });
});

router.get("/:code", async ({ env, params }) => {
  const target = await kvGetJSON(env, `shorten:${params.code}`);
  if (!target) return errorResponse("not found", 404);
  return Response.redirect(target, 302);
});

export default router;
