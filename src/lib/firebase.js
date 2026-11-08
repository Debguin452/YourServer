/**
 * Firestore access from a Cloudflare Worker, using Firebase's free
 * Spark plan (no credit card) as an alternative or companion database
 * to D1 — handy if you already use Firebase elsewhere (e.g. for a
 * mobile app) and want one database shared across both.
 *
 * Firebase's own Admin SDK doesn't run in the Workers runtime, so this
 * talks to the plain Firestore REST API instead, authenticating with a
 * Google service account the same way the Admin SDK does under the
 * hood: sign a short-lived JWT with the service account's private key
 * (Web Crypto, no dependency), trade it for an OAuth2 access token,
 * then call Firestore with that token as a Bearer header.
 *
 * Setup:
 *  1. Firebase console → Project settings → Service accounts →
 *     Generate new private key. Downloads a JSON file.
 *  2. From that file, set three Worker secrets (never commit them):
 *       npx wrangler secret put FIREBASE_PROJECT_ID     # "project_id"
 *       npx wrangler secret put FIREBASE_CLIENT_EMAIL   # "client_email"
 *       npx wrangler secret put FIREBASE_PRIVATE_KEY    # "private_key" (keep the \n's)
 *  3. Turn on `features.firebaseNotes` in src/config.js.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/datastore";

function base64url(bytes) {
  let str = typeof bytes === "string" ? btoa(bytes) : btoa(String.fromCharCode(...new Uint8Array(bytes)));
  return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem) {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function signJWT({ clientEmail, privateKeyPem }) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: clientEmail,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };

  const encoder = new TextEncoder();
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKeyPem.replace(/\\n/g, "\n")),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(unsigned));

  return `${unsigned}.${base64url(signature)}`;
}

// Access tokens are cached in module scope for the lifetime of the
// Worker isolate (usually minutes to hours) to avoid re-signing a JWT
// and round-tripping to Google on every request.
let cachedToken = null;
let cachedTokenExpiry = 0;

async function getAccessToken(env) {
  if (cachedToken && Date.now() < cachedTokenExpiry - 60_000) return cachedToken;

  requireFirebaseConfig(env);
  const jwt = await signJWT({
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKeyPem: env.FIREBASE_PRIVATE_KEY,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    throw new Error(`Firebase auth failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  cachedToken = data.access_token;
  cachedTokenExpiry = Date.now() + data.expires_in * 1000;
  return cachedToken;
}

function requireFirebaseConfig(env) {
  if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
    throw new Error(
      "Firebase is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and " +
        "FIREBASE_PRIVATE_KEY as Worker secrets (see src/lib/firebase.js)."
    );
  }
}

function baseUrl(projectId) {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
}

// --- Minimal JS <-> Firestore value encoding -----------------------------
// Supports the shapes this kit's example routes need: strings, numbers,
// booleans, null, nested objects and arrays. Good enough for typical
// app data; Firestore's full type system (timestamps, geopoints,
// references) isn't covered here.

function encodeValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encodeValue) } };
  if (typeof v === "object") return { mapValue: { fields: encodeFields(v) } };
  return { stringValue: String(v) };
}

function encodeFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) fields[k] = encodeValue(v);
  return fields;
}

function decodeValue(v) {
  if (!v) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return parseInt(v.integerValue, 10);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(decodeValue);
  if ("mapValue" in v) return decodeFields(v.mapValue.fields || {});
  return null;
}

function decodeFields(fields) {
  const obj = {};
  for (const [k, v] of Object.entries(fields)) obj[k] = decodeValue(v);
  return obj;
}

function decodeDoc(doc) {
  const id = doc.name.split("/").pop();
  return { id, ...decodeFields(doc.fields || {}) };
}

// --- Public CRUD helpers ---------------------------------------------

export async function firestoreList(env, collection) {
  const token = await getAccessToken(env);
  const res = await fetch(`${baseUrl(env.FIREBASE_PROJECT_ID)}/${collection}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Firestore list failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return (data.documents || []).map(decodeDoc);
}

export async function firestoreGet(env, collection, id) {
  const token = await getAccessToken(env);
  const res = await fetch(`${baseUrl(env.FIREBASE_PROJECT_ID)}/${collection}/${id}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore get failed: ${res.status} ${await res.text()}`);
  return decodeDoc(await res.json());
}

export async function firestoreCreate(env, collection, data) {
  const token = await getAccessToken(env);
  const res = await fetch(`${baseUrl(env.FIREBASE_PROJECT_ID)}/${collection}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ fields: encodeFields(data) }),
  });
  if (!res.ok) throw new Error(`Firestore create failed: ${res.status} ${await res.text()}`);
  return decodeDoc(await res.json());
}

export async function firestoreDelete(env, collection, id) {
  const token = await getAccessToken(env);
  const res = await fetch(`${baseUrl(env.FIREBASE_PROJECT_ID)}/${collection}/${id}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Firestore delete failed: ${res.status} ${await res.text()}`);
  }
}

// Exported for tests only.
export const _internal = { encodeValue, decodeValue, encodeFields, decodeFields, pemToArrayBuffer, base64url };
