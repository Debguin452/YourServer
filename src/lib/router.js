/**
 * Tiny zero-dependency router for Cloudflare Workers, with a basic
 * middleware chain. No framework to install — read every line of this
 * file in a couple of minutes if you want to know exactly what your
 * server does.
 */

export class Router {
  constructor() {
    this.routes = [];
    this.middlewares = [];
  }

  /** Run before every route match (logging, CORS, auth, rate limiting…). */
  useMiddleware(fn) {
    this.middlewares.push(fn);
    return this;
  }

  add(method, pattern, handler) {
    const paramNames = [];
    const regexStr = pattern
      .replace(/\/+$/, "")
      .split("/")
      .map((segment) => {
        if (segment.startsWith(":")) {
          paramNames.push(segment.slice(1));
          return "([^/]+)";
        }
        if (segment === "*") return "(.*)";
        return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      })
      .join("/");
    const regex = new RegExp(`^${regexStr}/?$`);
    this.routes.push({ method, regex, paramNames, handler, pattern });
    return this;
  }

  get(pattern, handler) {
    return this.add("GET", pattern, handler);
  }
  post(pattern, handler) {
    return this.add("POST", pattern, handler);
  }
  put(pattern, handler) {
    return this.add("PUT", pattern, handler);
  }
  patch(pattern, handler) {
    return this.add("PATCH", pattern, handler);
  }
  delete(pattern, handler) {
    return this.add("DELETE", pattern, handler);
  }

  /** Mount another Router's routes under a path prefix. */
  use(prefix, router) {
    for (const r of router.routes) {
      this.routes.push({
        method: r.method,
        regex: new RegExp(`^${prefix}${r.regex.source.slice(1)}`),
        paramNames: r.paramNames,
        handler: r.handler,
        pattern: prefix + r.pattern,
      });
    }
    return this;
  }

  async handle(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const match = {};

    const findRoute = () => {
      for (const route of this.routes) {
        if (route.method !== "*" && route.method !== request.method) continue;
        const m = path.match(route.regex);
        if (!m) continue;
        const params = {};
        route.paramNames.forEach((name, i) => {
          params[name] = decodeURIComponent(m[i + 1]);
        });
        return { route, params };
      }
      return null;
    };

    const matched = findRoute();
    const baseCtx = {
      request,
      env,
      ctx,
      url,
      params: matched ? matched.params : {},
      route: matched ? matched.route.pattern : null,
    };

    // Build the middleware chain, ending in the actual route handler
    // (or a 404 if nothing matched).
    const finalHandler = async (c) => {
      if (!matched) {
        return new Response(JSON.stringify({ error: "Not Found" }), {
          status: 404,
          headers: { "content-type": "application/json" },
        });
      }
      try {
        return await matched.route.handler(c);
      } catch (err) {
        console.error("Route handler error:", err);
        return new Response(
          JSON.stringify({ error: "Internal Server Error", message: String(err && err.message || err) }),
          { status: 500, headers: { "content-type": "application/json" } }
        );
      }
    };

    let chain = finalHandler;
    for (let i = this.middlewares.length - 1; i >= 0; i--) {
      const mw = this.middlewares[i];
      const next = chain;
      chain = (c) => mw(c, next);
    }

    return chain(baseCtx);
  }
}

/** JSON response helper. */
export function json(data, init = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status: init.status || 200,
    headers: { "content-type": "application/json", ...init.headers },
  });
}

/** Plain text / HTML helper. */
export function html(body, init = {}) {
  return new Response(body, {
    status: init.status || 200,
    headers: { "content-type": "text/html; charset=utf-8", ...init.headers },
  });
}

/** Shorthand for an error JSON response. */
export function errorResponse(message, status = 400, extra = {}) {
  return json({ error: message, ...extra }, { status });
}
