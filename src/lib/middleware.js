import { errorResponse } from "./router.js";

/** Adds CORS headers to every response, and short-circuits OPTIONS preflights. */
export function corsMiddleware(corsConfig) {
  return async (c, next) => {
    if (!corsConfig.enabled) return next(c);

    if (c.request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(corsConfig),
      });
    }

    const response = await next(c);
    const headers = new Headers(response.headers);
    for (const [k, v] of Object.entries(corsHeaders(corsConfig))) {
      headers.set(k, v);
    }
    return new Response(response.body, { status: response.status, headers });
  };
}

function corsHeaders(corsConfig) {
  return {
    "access-control-allow-origin": corsConfig.allowOrigin,
    "access-control-allow-methods": corsConfig.allowMethods,
    "access-control-allow-headers": corsConfig.allowHeaders,
  };
}

/** Logs method, path, status and duration for every request. */
export function loggingMiddleware(loggingConfig) {
  return async (c, next) => {
    if (!loggingConfig.enabled) return next(c);
    const start = Date.now();
    const response = await next(c);
    const ms = Date.now() - start;
    if (loggingConfig.level === "verbose") {
      console.log(
        `${c.request.method} ${c.url.pathname} -> ${response.status} (${ms}ms) ip=${c.request.headers.get("cf-connecting-ip") || "?"}`
      );
    } else {
      console.log(`${c.request.method} ${c.url.pathname} -> ${response.status} (${ms}ms)`);
    }
    return response;
  };
}

/**
 * Fixed-window rate limiter backed by KV. One counter key per
 * (IP, window). Fine for a hobby project; it is NOT perfectly accurate
 * under high concurrency (KV is eventually consistent) — use
 * Cloudflare's dashboard Rate Limiting rules if you need something
 * stricter than "good enough".
 */
export function rateLimitMiddleware(rateLimitConfig) {
  return async (c, next) => {
    if (!rateLimitConfig.enabled || !c.env.APP_KV) return next(c);

    const ip = c.request.headers.get("cf-connecting-ip") || "unknown";
    const window = Math.floor(Date.now() / 1000 / rateLimitConfig.windowSeconds);
    const key = `ratelimit:${ip}:${window}`;

    const current = parseInt((await c.env.APP_KV.get(key)) || "0", 10);
    if (current >= rateLimitConfig.maxRequests) {
      return errorResponse("Too Many Requests", 429, {
        retryAfterSeconds: rateLimitConfig.windowSeconds,
      });
    }

    await c.env.APP_KV.put(key, String(current + 1), {
      expirationTtl: rateLimitConfig.windowSeconds * 2,
    });

    return next(c);
  };
}

/**
 * Protects routes whose path starts with one of `protectedPrefixes`.
 * Accepts either:
 *   - header "x-api-key: <API_KEY>" (set the real value with
 *     `wrangler secret put API_KEY`)
 *   - header "Authorization: Bearer <token>" where <token> was issued
 *     by POST /auth/login (see src/routes/auth.js)
 */
export function authMiddleware(authConfig) {
  return async (c, next) => {
    if (!authConfig.enabled) return next(c);

    const needsAuth = authConfig.protectedPrefixes.some((p) =>
      c.url.pathname.startsWith(p)
    );
    if (!needsAuth) return next(c);

    const apiKey = c.request.headers.get("x-api-key");
    if (apiKey && c.env.API_KEY && apiKey === c.env.API_KEY) {
      return next(c);
    }

    const authHeader = c.request.headers.get("authorization") || "";
    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice("Bearer ".length);
      if (c.env.APP_KV) {
        const session = await c.env.APP_KV.get(`session:${token}`);
        if (session) return next(c);
      }
    }

    return errorResponse("Unauthorized", 401);
  };
}
