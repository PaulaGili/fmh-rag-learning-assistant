const COOKIE_NAME = "fmh_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const PBKDF2_ITERATIONS = 100_000;

// derived once per Edge worker instance, then cached
let _cachedToken: string | null = null;

async function deriveToken(password: string): Promise<string> {
  const salt = process.env.AUTH_SALT;
  if (!salt) throw new Error("AUTH_SALT env var is required");

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  return Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function createSessionToken(password: string): Promise<string> {
  return deriveToken(password);
}

async function getExpectedToken(): Promise<string> {
  if (_cachedToken) return _cachedToken;
  const password = process.env.AUTH_PASSWORD;
  if (!password) throw new Error("AUTH_PASSWORD env var is required");
  _cachedToken = await deriveToken(password);
  return _cachedToken;
}

export { COOKIE_NAME, SESSION_MAX_AGE, createSessionToken, getExpectedToken };
