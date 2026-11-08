import { Router, json, errorResponse } from "../lib/router.js";
import { kvSetJSON } from "../lib/kv.js";

/**
 * Generic webhook receiver — point any service (GitHub, Stripe, a form
 * builder, an IoT device, etc.) at POST /webhook/:source and inspect
 * what arrives here. Every received payload is stored in KV under
 * webhook:<source>:<timestamp> so you can look back at recent events
 * from GET /webhook/:source/recent.
 *
 * For a provider that signs its payloads (Stripe, GitHub), verify the
 * signature before trusting the body — see the comment below.
 */
const router = new Router();

router.post("/:source", async ({ env, params, request }) => {
  const body = await request.text();

  // Example signature check (disabled by default). Most webhook
  // providers send an HMAC signature header you compare against a
  // shared secret stored as `wrangler secret put WEBHOOK_SECRET`.
  //
  // const signature = request.headers.get("x-signature");
  // const expected = await hmacHex(env.WEBHOOK_SECRET, body);
  // if (signature !== expected) return errorResponse("invalid signature", 401);

  let parsed = null;
  try {
    parsed = JSON.parse(body);
  } catch {
    parsed = body;
  }

  const key = `webhook:${params.source}:${Date.now()}`;
  await kvSetJSON(env, key, { receivedAt: new Date().toISOString(), payload: parsed });

  console.log(`Webhook received from "${params.source}"`);
  return json({ ok: true });
});

router.get("/:source/recent", async ({ env, params }) => {
  if (!env.APP_KV) return errorResponse("APP_KV not configured", 500);
  const { keys } = await env.APP_KV.list({ prefix: `webhook:${params.source}:`, limit: 20 });
  const events = await Promise.all(
    keys.map(async (k) => JSON.parse((await env.APP_KV.get(k.name)) || "null"))
  );
  return json({ events: events.reverse() });
});

export default router;
