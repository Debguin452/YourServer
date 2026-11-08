import { Router, json } from "../lib/router.js";
import { kvIncrement, kvGetJSON } from "../lib/kv.js";

/**
 * General example routes. Copy this file's pattern to add your own —
 * see examples/add-a-route.md for the full walkthrough.
 */
const router = new Router();

router.get("/hello/:name", ({ params }) => {
  return json({ message: `Hello, ${params.name}!` });
});

router.get("/counter", async ({ env }) => {
  const count = await kvGetJSON(env, "hit_counter", 0);
  return json({ count });
});

router.post("/counter/increment", async ({ env }) => {
  const count = await kvIncrement(env, "hit_counter", 1);
  return json({ count });
});

router.post("/echo", async ({ request }) => {
  let body = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  return json({ youSent: body });
});

// Proxy example: call another API from your server (useful for hiding
// an API key from the client, or combining several APIs into one).
router.get("/time", async () => {
  const res = await fetch("https://worldtimeapi.org/api/timezone/Etc/UTC");
  if (!res.ok) return json({ error: "upstream failed" }, { status: 502 });
  const data = await res.json();
  return json({ utc: data.utc_datetime });
});

export default router;
