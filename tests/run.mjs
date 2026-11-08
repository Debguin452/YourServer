/**
 * Minimal, dependency-free smoke test for the Worker. Mocks KV so the
 * whole request pipeline (routing, middleware, auth, rate limiting)
 * can be exercised without deploying anything or touching a real
 * Cloudflare account.
 *
 * Run locally:   node tests/run.mjs
 * Run in CI:     see .github/workflows/ci.yml (runs on every push/PR)
 */
import assert from "node:assert/strict";
import worker from "../src/index.js";

function makeMockKV() {
  const store = new Map();
  return {
    get: async (k) => (store.has(k) ? store.get(k) : null),
    put: async (k, v) => { store.set(k, v); },
    delete: async (k) => { store.delete(k); },
    list: async ({ prefix = "" } = {}) => ({
      keys: [...store.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })),
    }),
  };
}

const env = { APP_KV: makeMockKV(), APP_NAME: "test" };

async function call(method, path, body, headers = {}) {
  const init = { method, headers: { "content-type": "application/json", ...headers } };
  if (body !== undefined) init.body = JSON.stringify(body);
  const res = await worker.fetch(new Request(`http://localhost${path}`, init), env, {});
  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { status: res.status, body: parsed };
}

let passed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`ok   - ${name}`);
  } catch (err) {
    console.error(`FAIL - ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

await test("GET / returns the landing page", async () => {
  const r = await call("GET", "/");
  assert.equal(r.status, 200);
});

await test("GET /health reports ok", async () => {
  const r = await call("GET", "/health");
  assert.equal(r.status, 200);
  assert.equal(r.body.ok, true);
});

await test("GET /api/hello/:name greets by name", async () => {
  const r = await call("GET", "/api/hello/tester");
  assert.equal(r.body.message, "Hello, tester!");
});

await test("counter increments and persists across requests", async () => {
  await call("POST", "/api/counter/increment");
  const r = await call("GET", "/api/counter");
  assert.equal(r.body.count, 1);
});

await test("unknown route returns 404", async () => {
  const r = await call("GET", "/this/does/not/exist");
  assert.equal(r.status, 404);
});

await test("auth: register, login, access protected info, logout, then denied", async () => {
  await call("POST", "/auth/register", { username: "alice", password: "hunter2" });
  const login = await call("POST", "/auth/login", { username: "alice", password: "hunter2" });
  assert.equal(login.status, 200);
  const token = login.body.token;

  const me = await call("GET", "/auth/me", undefined, { authorization: `Bearer ${token}` });
  assert.equal(me.body.username, "alice");

  await call("POST", "/auth/logout", undefined, { authorization: `Bearer ${token}` });
  const meAfter = await call("GET", "/auth/me", undefined, { authorization: `Bearer ${token}` });
  assert.equal(meAfter.status, 401);
});

await test("kv-store: write, read, list, delete", async () => {
  await call("PUT", "/store/widget", { color: "blue" });
  const read = await call("GET", "/store/widget");
  assert.deepEqual(read.body.value, { color: "blue" });
  await call("DELETE", "/store/widget");
  const after = await call("GET", "/store/widget");
  assert.equal(after.status, 404);
});

await test("webhook: receive and list recent events", async () => {
  await call("POST", "/webhook/test-source", { hello: true });
  const recent = await call("GET", "/webhook/test-source/recent");
  assert.equal(recent.body.events.length, 1);
});

await test("shorten: create a short link and follow its redirect", async () => {
  const created = await call("POST", "/shorten", { url: "https://example.com/some/long/path" });
  assert.equal(created.status, 201);
  const res = await worker.fetch(new Request(`http://localhost/shorten/${created.body.code}`), env, {});
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("location"), "https://example.com/some/long/path");
});

await test("the landing page itself responds", async () => {
  const r = await call("GET", "/");
  assert.equal(r.status, 200);
  assert.ok(r.body.includes("yourserver"));
});

console.log(`\n${passed} test(s) passed.`);
if (process.exitCode) {
  console.error("Some tests failed.");
  process.exit(1);
}
