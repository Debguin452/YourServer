-- Schema for the example D1 database used by src/routes/notes.js.
-- Apply it once with:
--   npx wrangler d1 execute yourserver-db --remote --file=./schema.sql
-- (drop --remote to apply to your local dev database instead)

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL
);
