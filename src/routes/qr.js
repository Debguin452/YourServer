import { Router, errorResponse } from "../lib/router.js";

/**
 * QR code generator — GET /qr?text=https://example.com
 *
 * Generating a QR code from scratch is a fair amount of error-correction
 * math for something that's genuinely a solved, keyless, free public
 * service (goqr.me's API needs no account or key). This route proxies
 * it so your users never see that third-party URL, and caches the
 * image at Cloudflare's edge so repeat requests for the same text are
 * instant and don't re-hit the upstream API.
 */
const router = new Router();

router.get("/", async ({ url, ctx }) => {
  const text = url.searchParams.get("text");
  if (!text) return errorResponse("pass the text to encode as ?text=...", 400);

  const size = url.searchParams.get("size") || "300x300";
  const upstream = `https://api.qrserver.com/v1/create-qr-code/?size=${encodeURIComponent(size)}&data=${encodeURIComponent(text)}`;

  // `caches` is a Workers-runtime global; guard it so this route also
  // runs fine under plain Node (e.g. in tests/run.mjs).
  const cache = typeof caches !== "undefined" ? caches.default : null;
  const cacheKey = new Request(upstream);
  let response = cache ? await cache.match(cacheKey) : null;
  if (response) return response;

  const upstreamResponse = await fetch(upstream);
  if (!upstreamResponse.ok) return errorResponse("QR generation failed upstream", 502);

  response = new Response(upstreamResponse.body, upstreamResponse);
  response.headers.set("cache-control", "public, max-age=86400");
  if (cache) ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
});

export default router;
