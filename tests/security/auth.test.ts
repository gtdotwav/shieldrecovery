import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Security tests for the authentication system.
 * Tests password hashing, session tokens, and access control.
 */

describe("Password Security", () => {
  it("should generate unique salts for each hash", async () => {
    const { hashPlatformPassword } = await import("@/server/auth/passwords");
    const hash1 = hashPlatformPassword("testpassword");
    const hash2 = hashPlatformPassword("testpassword");

    // Same password should produce different hashes (random salt)
    expect(hash1).not.toEqual(hash2);
  });

  it("should use salt:hash format (not legacy plain hex)", async () => {
    const { hashPlatformPassword } = await import("@/server/auth/passwords");
    const hash = hashPlatformPassword("testpassword");

    // New format must contain a colon separator
    expect(hash).toContain(":");
    const [salt, hashPart] = hash.split(":");
    // Salt should be 32 bytes = 64 hex chars
    expect(salt.length).toBe(64);
    // Hash should be 64 bytes = 128 hex chars
    expect(hashPart.length).toBe(128);
  });

  it("should verify passwords correctly with new format", async () => {
    const { hashPlatformPassword, verifyPlatformPassword } = await import(
      "@/server/auth/passwords"
    );
    const hash = hashPlatformPassword("mysecretpassword");

    expect(verifyPlatformPassword("mysecretpassword", hash)).toBe(true);
    expect(verifyPlatformPassword("wrongpassword", hash)).toBe(false);
    expect(verifyPlatformPassword("", hash)).toBe(false);
  });

  it("should still verify legacy format hashes (backward compat)", async () => {
    const { verifyPlatformPassword } = await import("@/server/auth/passwords");
    const { scryptSync } = await import("node:crypto");

    // Simulate legacy hash (static salt "pagrecovery-seller-auth")
    const legacyHash = scryptSync("oldpassword", "pagrecovery-seller-auth", 64).toString("hex");

    expect(verifyPlatformPassword("oldpassword", legacyHash)).toBe(true);
    expect(verifyPlatformPassword("wrongpassword", legacyHash)).toBe(false);
  });

  it("should reject empty stored hash", async () => {
    const { verifyPlatformPassword } = await import("@/server/auth/passwords");

    expect(verifyPlatformPassword("anything", "")).toBe(false);
  });
});

describe("Session Token Security", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      PLATFORM_AUTH_SECRET: "test-secret-for-hmac-signing-key-32chars!",
      PLATFORM_AUTH_EMAIL: "admin@test.local",
      PLATFORM_AUTH_PASSWORD: "adminpass",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("should create and verify valid tokens", async () => {
    const { createSessionToken, verifySessionToken } = await import(
      "@/server/auth/core"
    );

    const token = await createSessionToken("user@test.com", "admin");
    const session = await verifySessionToken(token);

    expect(session).not.toBeNull();
    expect(session?.email).toBe("user@test.com");
    expect(session?.role).toBe("admin");
  });

  it("should reject tampered tokens", async () => {
    const { createSessionToken, verifySessionToken } = await import(
      "@/server/auth/core"
    );

    const token = await createSessionToken("user@test.com", "admin");
    // Tamper with the payload (flip a character)
    const parts = token.split(".");
    const tampered = parts[0].slice(0, -1) + "X" + "." + parts[1];

    const session = await verifySessionToken(tampered);
    expect(session).toBeNull();
  });

  it("should reject tokens with tampered signature", async () => {
    const { createSessionToken, verifySessionToken } = await import(
      "@/server/auth/core"
    );

    const token = await createSessionToken("user@test.com", "admin");
    const parts = token.split(".");
    const tampered = parts[0] + "." + parts[1].slice(0, -1) + "Z";

    const session = await verifySessionToken(tampered);
    expect(session).toBeNull();
  });

  it("should reject null/undefined/empty tokens", async () => {
    const { verifySessionToken } = await import("@/server/auth/core");

    expect(await verifySessionToken(null)).toBeNull();
    expect(await verifySessionToken(undefined)).toBeNull();
    expect(await verifySessionToken("")).toBeNull();
  });

  it("should reject tokens without separator", async () => {
    const { verifySessionToken } = await import("@/server/auth/core");
    expect(await verifySessionToken("nodothere")).toBeNull();
  });

  it("should reject tokens when PLATFORM_AUTH_SECRET is missing", async () => {
    delete process.env.PLATFORM_AUTH_SECRET;
    const { verifySessionToken } = await import("@/server/auth/core");
    expect(await verifySessionToken("any.token")).toBeNull();
  });
});

describe("Path Access Control", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      PLATFORM_AUTH_SECRET: "test-secret",
      PLATFORM_AUTH_EMAIL: "admin@test.local",
      PLATFORM_AUTH_PASSWORD: "adminpass",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should protect admin routes from seller role", async () => {
    const { isRoleAllowedForPath } = await import("@/server/auth/core");

    expect(isRoleAllowedForPath("/admin", "seller")).toBe(false);
    expect(isRoleAllowedForPath("/admin/settings", "seller")).toBe(false);
    expect(isRoleAllowedForPath("/api/admin/sellers", "seller")).toBe(false);
  });

  it("should allow admin role on admin routes", async () => {
    const { isRoleAllowedForPath } = await import("@/server/auth/core");

    expect(isRoleAllowedForPath("/admin", "admin")).toBe(true);
    expect(isRoleAllowedForPath("/api/admin/sellers", "admin")).toBe(true);
  });

  it("should allow shared routes for both roles", async () => {
    const { isRoleAllowedForPath } = await import("@/server/auth/core");

    expect(isRoleAllowedForPath("/dashboard", "admin")).toBe(true);
    expect(isRoleAllowedForPath("/dashboard", "seller")).toBe(true);
    expect(isRoleAllowedForPath("/leads", "admin")).toBe(true);
    expect(isRoleAllowedForPath("/leads", "seller")).toBe(true);
  });

  it("should mark webhook paths as public", async () => {
    const { isPublicPath } = await import("@/server/auth/core");

    expect(isPublicPath("/webhooks/pagouai/abc123")).toBe(true);
    expect(isPublicPath("/webhooks/shield-gateway/key")).toBe(true);
    expect(isPublicPath("/api/webhooks/test")).toBe(true);
    expect(isPublicPath("/api/auth/token")).toBe(true);
  });

  it("should protect dashboard/admin from unauthenticated access", async () => {
    const { isProtectedPath } = await import("@/server/auth/core");

    expect(isProtectedPath("/dashboard")).toBe(true);
    expect(isProtectedPath("/admin")).toBe(true);
    expect(isProtectedPath("/api/admin/sellers")).toBe(true);
  });
});

describe("Open Redirect Prevention", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      PLATFORM_AUTH_SECRET: "test-secret",
      PLATFORM_AUTH_EMAIL: "admin@test.local",
      PLATFORM_AUTH_PASSWORD: "adminpass",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should block protocol-relative URLs", async () => {
    const { normalizeNextPath } = await import("@/server/auth/core");

    const result = normalizeNextPath("//evil.com/attack");
    expect(result).toBe("/dashboard");
  });

  it("should block absolute URLs", async () => {
    const { normalizeNextPath } = await import("@/server/auth/core");

    // Should only allow paths starting with /
    const result = normalizeNextPath("https://evil.com");
    expect(result).toBe("/dashboard");
  });

  it("should allow valid internal paths", async () => {
    const { normalizeNextPath } = await import("@/server/auth/core");

    expect(normalizeNextPath("/dashboard")).toBe("/dashboard");
    expect(normalizeNextPath("/admin")).toBe("/admin");
  });

  it("should redirect /login to dashboard", async () => {
    const { normalizeNextPath } = await import("@/server/auth/core");

    expect(normalizeNextPath("/login")).toBe("/dashboard");
  });

  it("should handle null/undefined/empty", async () => {
    const { normalizeNextPath } = await import("@/server/auth/core");

    expect(normalizeNextPath(null)).toBe("/dashboard");
    expect(normalizeNextPath(undefined)).toBe("/dashboard");
    expect(normalizeNextPath("")).toBe("/dashboard");
  });
});
