import { Router, json, errorResponse } from "../lib/router.js";
import { firestoreList, firestoreCreate, firestoreGet, firestoreDelete } from "../lib/firebase.js";

/**
 * The same "notes" example as src/routes/notes.js, but backed by
 * Firebase Firestore instead of D1 — use this if you'd rather keep
 * your data in Firebase (e.g. you already have a Firebase project for
 * a mobile or web app and want one shared database). Disabled by
 * default in src/config.js since it needs service-account secrets;
 * see src/lib/firebase.js for setup.
 *
 * GET    /firebase-notes       -> list all notes
 * POST   /firebase-notes       -> create a note { text }
 * GET    /firebase-notes/:id   -> read one note
 * DELETE /firebase-notes/:id   -> delete one note
 */
const router = new Router();
const COLLECTION = "notes";

router.get("/", async ({ env }) => {
  const notes = await firestoreList(env, COLLECTION);
  return json({ notes });
});

router.post("/", async ({ env, request }) => {
  const { text } = await request.json().catch(() => ({}));
  if (!text) return errorResponse("text is required", 400);
  const note = await firestoreCreate(env, COLLECTION, { text, createdAt: new Date().toISOString() });
  return json({ note }, { status: 201 });
});

router.get("/:id", async ({ env, params }) => {
  const note = await firestoreGet(env, COLLECTION, params.id);
  if (!note) return errorResponse("not found", 404);
  return json({ note });
});

router.delete("/:id", async ({ env, params }) => {
  await firestoreDelete(env, COLLECTION, params.id);
  return json({ ok: true });
});

export default router;
