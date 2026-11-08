import { Router, json, errorResponse } from "../lib/router.js";
import { storagePut, storageGet, storageDelete, storageList } from "../lib/storage.js";

/**
 * File upload/download example backed by R2 (free object storage).
 *
 * GET    /files            -> list uploaded files
 * PUT    /files/:key       -> upload (body = raw file bytes)
 * GET    /files/:key       -> download
 * DELETE /files/:key       -> delete
 *
 * Try it with curl:
 *   curl -T myphoto.jpg https://<your-worker>/files/myphoto.jpg
 *   curl https://<your-worker>/files/myphoto.jpg -o out.jpg
 */
const router = new Router();

router.get("/", async ({ env }) => {
  const files = await storageList(env);
  return json({ files });
});

router.put("/:key", async ({ env, params, request }) => {
  await storagePut(env, params.key, request.body, {
    httpMetadata: { contentType: request.headers.get("content-type") || undefined },
  });
  return json({ ok: true, key: params.key });
});

router.get("/:key", async ({ env, params }) => {
  const obj = await storageGet(env, params.key);
  if (!obj) return errorResponse("not found", 404);
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  return new Response(obj.body, { headers });
});

router.delete("/:key", async ({ env, params }) => {
  await storageDelete(env, params.key);
  return json({ ok: true });
});

export default router;
