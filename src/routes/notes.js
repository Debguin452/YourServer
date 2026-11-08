import { Router, json, errorResponse } from "../lib/router.js";
import { queryAll, queryOne, execute } from "../lib/db.js";

/**
 * Example D1 (SQL) CRUD route — a notes list. Shows the pattern for
 * anything with real structure: swap "notes" for "products", "posts",
 * "tasks", whatever your project needs. Schema lives in schema.sql at
 * the repo root; apply it with the wrangler command in the README.
 *
 * GET    /notes       -> list all notes
 * POST   /notes       -> create a note { text }
 * GET    /notes/:id   -> read one note
 * DELETE /notes/:id   -> delete one note
 */
const router = new Router();

router.get("/", async ({ env }) => {
  const notes = await queryAll(env, "SELECT id, text, created_at FROM notes ORDER BY id DESC");
  return json({ notes });
});

router.post("/", async ({ env, request }) => {
  const { text } = await request.json().catch(() => ({}));
  if (!text) return errorResponse("text is required", 400);
  const result = await execute(
    env,
    "INSERT INTO notes (text, created_at) VALUES (?, ?)",
    text,
    new Date().toISOString()
  );
  return json({ id: result.meta.last_row_id, text }, { status: 201 });
});

router.get("/:id", async ({ env, params }) => {
  const note = await queryOne(env, "SELECT id, text, created_at FROM notes WHERE id = ?", params.id);
  if (!note) return errorResponse("not found", 404);
  return json({ note });
});

router.delete("/:id", async ({ env, params }) => {
  await execute(env, "DELETE FROM notes WHERE id = ?", params.id);
  return json({ ok: true });
});

export default router;
