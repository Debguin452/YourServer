/**
 * Helper around a Workers KV binding (APP_KV) for simple key-value
 * persistence: counters, flags, sessions, small cached JSON blobs.
 * Free tier, eventually consistent — not for relational data (use D1,
 * src/lib/db.js, for that).
 */

export async function kvGetJSON(env, key, fallback = null) {
  if (!env.APP_KV) return fallback;
  const raw = await env.APP_KV.get(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export async function kvSetJSON(env, key, value, opts = {}) {
  requireKV(env);
  await env.APP_KV.put(key, JSON.stringify(value), opts);
}

export async function kvDelete(env, key) {
  requireKV(env);
  await env.APP_KV.delete(key);
}

export async function kvIncrement(env, key, by = 1) {
  const current = (await kvGetJSON(env, key, 0)) ?? 0;
  const next = current + by;
  await kvSetJSON(env, key, next);
  return next;
}

/** List all keys under a prefix (e.g. "notes:") and return their values. */
export async function kvListJSON(env, prefix) {
  requireKV(env);
  const { keys } = await env.APP_KV.list({ prefix });
  const values = await Promise.all(
    keys.map(async (k) => ({ key: k.name, value: await kvGetJSON(env, k.name) }))
  );
  return values;
}

function requireKV(env) {
  if (!env.APP_KV) {
    throw new Error(
      "APP_KV binding is not configured. Create a KV namespace and uncomment " +
        "the [[kv_namespaces]] block in wrangler.toml (see README)."
    );
  }
}
