/**
 * Helper around an R2 binding (FILES) — free object storage (zero
 * egress fees) for anything bigger than belongs in KV: uploads,
 * images, backups, exports.
 */

export function requireStorage(env) {
  if (!env.FILES) {
    throw new Error(
      "FILES binding is not configured. Create an R2 bucket and uncomment " +
        "the [[r2_buckets]] block in wrangler.toml (see README)."
    );
  }
  return env.FILES;
}

export async function storagePut(env, key, data, opts = {}) {
  const bucket = requireStorage(env);
  await bucket.put(key, data, opts);
}

export async function storageGet(env, key) {
  const bucket = requireStorage(env);
  const obj = await bucket.get(key);
  return obj; // null if not found; caller reads obj.body / obj.text() / obj.arrayBuffer()
}

export async function storageDelete(env, key) {
  const bucket = requireStorage(env);
  await bucket.delete(key);
}

export async function storageList(env, prefix = "") {
  const bucket = requireStorage(env);
  const listed = await bucket.list({ prefix });
  return listed.objects.map((o) => ({
    key: o.key,
    size: o.size,
    uploaded: o.uploaded,
  }));
}
