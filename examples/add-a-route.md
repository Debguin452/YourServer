# Adding your own route

Every feature lives in its own file under `src/routes/`, mounted at a
path prefix in `src/index.js`. This is the one pattern you need to
build anything.

1. Create `src/routes/notes-example.js` (or copy the closest existing
   route file — `src/routes/kv-store.js` for a plain data API,
   `src/routes/notes.js` for SQL, `src/routes/files.js` for file
   storage):

```js
import { Router, json } from "../lib/router.js";
import { kvGetJSON, kvSetJSON } from "../lib/kv.js";

const router = new Router();

router.get("/", async ({ env }) => {
  const todos = await kvGetJSON(env, "todos", []);
  return json({ todos });
});

router.post("/", async ({ env, request }) => {
  const { text } = await request.json();
  const todos = await kvGetJSON(env, "todos", []);
  todos.push({ text, done: false });
  await kvSetJSON(env, "todos", todos);
  return json({ todos }, { status: 201 });
});

export default router;
```

2. Wire it into `src/index.js`:

```js
import todosRoutes from "./routes/todos.js";
// ...
router.use("/todos", todosRoutes);
```

3. (Optional) add a toggle for it in `src/config.js` under
   `features`, so it can be switched off without deleting code.

4. Commit — even from the GitHub web UI. `ci.yml` runs the test suite,
   then `deploy.yml` ships it. Nothing to run on your own machine.

Your new endpoints are live at:
- `GET  https://<your-worker>.workers.dev/todos`
- `POST https://<your-worker>.workers.dev/todos`

That's the whole pattern — one file per feature, mounted under a
prefix, as many as you want.
