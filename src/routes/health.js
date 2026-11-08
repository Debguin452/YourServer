import { Router, json } from "../lib/router.js";

const router = new Router();

router.get("/", ({ env }) => {
  return json({
    ok: true,
    app: "yourserver",
    time: new Date().toISOString(),
    bindings: {
      kv: Boolean(env.APP_KV),
      database: Boolean(env.DB),
      storage: Boolean(env.FILES),
    },
  });
});

export default router;
