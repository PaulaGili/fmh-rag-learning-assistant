const COOKIE_NAME = "fmh_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

async function createSessionToken(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "__fmh_salt_2024__");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getExpectedToken(): Promise<string> {
  const password = process.env.AUTH_PASSWORD;
  if (!password) throw new Error("AUTH_PASSWORD not set");
  return createSessionToken(password);
}

export { COOKIE_NAME, SESSION_MAX_AGE, createSessionToken, getExpectedToken };
