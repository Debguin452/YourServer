/**
 * Helper around a D1 binding (DB) — a real SQLite database, free tier
 * included (see README for current limits). Good for anything with
 * structure or relationships that KV's flat key-value model can't
 * express nicely.
 */

export function requireDB(env) {
  if (!env.DB) {
    throw new Error(
      "DB binding is not configured. Create a D1 database and uncomment " +
        "the [[d1_databases]] block in wrangler.toml (see README)."
    );
  }
  return env.DB;
}

/** Run the schema in schema.sql against the bound D1 database. */
export async function runMigrations(env, schemaSQL) {
  const db = requireDB(env);
  const statements = schemaSQL
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const stmt of statements) {
    await db.prepare(stmt).run();
  }
}

export async function queryAll(env, sql, ...params) {
  const db = requireDB(env);
  const { results } = await db
    .prepare(sql)
    .bind(...params)
    .all();
  return results;
}

export async function queryOne(env, sql, ...params) {
  const db = requireDB(env);
  return db
    .prepare(sql)
    .bind(...params)
    .first();
}

export async function execute(env, sql, ...params) {
  const db = requireDB(env);
  return db
    .prepare(sql)
    .bind(...params)
    .run();
}
