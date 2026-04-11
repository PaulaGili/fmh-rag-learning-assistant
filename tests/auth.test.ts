import { describe, it, expect, beforeEach, vi } from "vitest";

const TEST_PASSWORD = "test-password-123";
const TEST_SALT = "a".repeat(64);

vi.stubEnv("AUTH_PASSWORD", TEST_PASSWORD);
vi.stubEnv("AUTH_SALT", TEST_SALT);

describe("createSessionToken", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("AUTH_PASSWORD", TEST_PASSWORD);
    vi.stubEnv("AUTH_SALT", TEST_SALT);
  });

  it("returns a 64-char hex string", async () => {
    const { createSessionToken } = await import("../lib/auth");
    const token = await createSessionToken(TEST_PASSWORD);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic — same inputs always produce the same token", async () => {
    const { createSessionToken } = await import("../lib/auth");
    const t1 = await createSessionToken(TEST_PASSWORD);
    const t2 = await createSessionToken(TEST_PASSWORD);
    expect(t1).toBe(t2);
  });

  it("produces different tokens for different passwords", async () => {
    const { createSessionToken } = await import("../lib/auth");
    const t1 = await createSessionToken("password-one");
    const t2 = await createSessionToken("password-two");
    expect(t1).not.toBe(t2);
  });

  it("throws when AUTH_SALT is missing", async () => {
    vi.resetModules();
    vi.stubEnv("AUTH_SALT", "");
    const { createSessionToken } = await import("../lib/auth");
    await expect(createSessionToken(TEST_PASSWORD)).rejects.toThrow("AUTH_SALT");
  });
});

describe("getExpectedToken", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("AUTH_PASSWORD", TEST_PASSWORD);
    vi.stubEnv("AUTH_SALT", TEST_SALT);
  });

  it("matches createSessionToken for AUTH_PASSWORD", async () => {
    const { createSessionToken, getExpectedToken } = await import("../lib/auth");
    const expected = await getExpectedToken();
    const manual = await createSessionToken(TEST_PASSWORD);
    expect(expected).toBe(manual);
  });

  it("throws when AUTH_PASSWORD is missing", async () => {
    vi.resetModules();
    vi.stubEnv("AUTH_PASSWORD", "");
    vi.stubEnv("AUTH_SALT", TEST_SALT);
    const { getExpectedToken } = await import("../lib/auth");
    await expect(getExpectedToken()).rejects.toThrow("AUTH_PASSWORD");
  });

  it("caches the result across calls", async () => {
    const { getExpectedToken } = await import("../lib/auth");
    const t1 = await getExpectedToken();
    const t2 = await getExpectedToken();
    expect(t1).toBe(t2);
  });
});
