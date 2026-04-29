import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Security tests for API route protection.
 * Tests rate limiting, CRON_SECRET enforcement, CORS, and debug route protection.
 */

describe("CRON_SECRET Enforcement", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  describe("/api/agent/orchestrate", () => {
    it("should deny access when CRON_SECRET is not set", async () => {
      process.env = { ...originalEnv };
      delete process.env.CRON_SECRET;

      // Re-import to pick up env change
      const mod = await import("@/app/api/agent/orchestrate/route");

      const request = new Request("http://localhost:3000/api/agent/orchestrate");
      const response = await mod.GET(request);

      expect(response.status).toBe(401);
    });

    it("should deny access with wrong secret", async () => {
      process.env = { ...originalEnv, CRON_SECRET: "correct-secret" };

      const mod = await import("@/app/api/agent/orchestrate/route");

      const request = new Request("http://localhost:3000/api/agent/orchestrate", {
        headers: { authorization: "Bearer wrong-secret" },
      });
      const response = await mod.GET(request);

      expect(response.status).toBe(401);
    });

    it("should allow access with correct Bearer token", async () => {
      process.env = {
        ...originalEnv,
        CRON_SECRET: "correct-secret",
        NEXT_PUBLIC_SUPABASE_URL: "",
        SUPABASE_SERVICE_ROLE_KEY: "",
      };

      const mod = await import("@/app/api/agent/orchestrate/route");

      const request = new Request("http://localhost:3000/api/agent/orchestrate", {
        headers: { authorization: "Bearer correct-secret" },
      });

      // This will try to run the agent controller which may fail without DB,
      // but it should NOT return 401
      const response = await mod.GET(request);
      expect(response.status).not.toBe(401);
    });
  });

  describe("/api/debug/process-webhook", () => {
    it("should deny access without authorization", async () => {
      process.env = { ...originalEnv, CRON_SECRET: "test-secret" };

      const mod = await import("@/app/api/debug/process-webhook/route");

      const request = new Request("http://localhost:3000/api/debug/process-webhook?action=check");
      const response = await mod.GET(request);

      expect(response.status).toBe(401);
    });

    it("should deny access when CRON_SECRET not configured", async () => {
      process.env = { ...originalEnv };
      delete process.env.CRON_SECRET;

      const mod = await import("@/app/api/debug/process-webhook/route");

      const request = new Request("http://localhost:3000/api/debug/process-webhook?action=check", {
        headers: { authorization: "Bearer anything" },
      });
      const response = await mod.GET(request);

      expect(response.status).toBe(401);
    });

    it("should not leak Supabase keys in check response", async () => {
      process.env = {
        ...originalEnv,
        CRON_SECRET: "test-secret",
        NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "eyJhbGciOiJIUzI1NiJ9.secret-key",
      };

      const mod = await import("@/app/api/debug/process-webhook/route");

      const request = new Request("http://localhost:3000/api/debug/process-webhook?action=check", {
        headers: { authorization: "Bearer test-secret" },
      });
      const response = await mod.GET(request);
      const body = await response.json();

      // Should NOT contain the actual URL or key
      if (body.env) {
        expect(body.env.supabaseUrl).not.toContain("supabase.co");
        expect(body.env.supabaseKey).not.toContain("eyJ");
      }
    });
  });
});

describe("CORS Configuration", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  it("should not use wildcard (*) as CORS origin", async () => {
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_APP_URL;

    const { corsOptions } = await import("@/server/recovery/utils/api-response");

    const response = corsOptions();
    const origin = response.headers.get("Access-Control-Allow-Origin");

    expect(origin).not.toBe("*");
  });

  it("should use configured APP_URL for CORS", async () => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_APP_URL: "https://pagrecovery.com.br",
    };

    const { corsOptions } = await import("@/server/recovery/utils/api-response");

    const response = corsOptions();
    const origin = response.headers.get("Access-Control-Allow-Origin");

    expect(origin).toBe("https://pagrecovery.com.br");
  });
});


describe("Security Headers", () => {
  it("should have security headers configured in next.config", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");

    const configSource = readFileSync(
      join(process.cwd(), "next.config.ts"),
      "utf-8",
    );

    expect(configSource).toContain("X-Content-Type-Options");
    expect(configSource).toContain("X-Frame-Options");
    expect(configSource).toContain("Strict-Transport-Security");
    expect(configSource).toContain("Referrer-Policy");
    expect(configSource).toContain("Permissions-Policy");
  });
});

describe("Worker Secret Timing-Safe Comparison", () => {
  it("should use timingSafeEqual in worker route", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");

    const workerSource = readFileSync(
      join(process.cwd(), "src/app/api/worker/run/route.ts"),
      "utf-8",
    );

    expect(workerSource).toContain("timingSafeEqual");
    // Must NOT use plain === for secret comparison
    expect(workerSource).not.toMatch(/secret\s*===\s*bearerToken/);
    expect(workerSource).not.toMatch(/secret\s*===\s*headerToken/);
  });

  it("should use timingSafeEqual via authorizeCronRequest in orchestrate route", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");

    const orchestrateSource = readFileSync(
      join(process.cwd(), "src/app/api/agent/orchestrate/route.ts"),
      "utf-8",
    );
    // Cron auth was extracted to a shared helper; the route delegates to it.
    expect(orchestrateSource).toContain("authorizeCronRequest");

    const helperSource = readFileSync(
      join(process.cwd(), "src/server/observability/cron-auth.ts"),
      "utf-8",
    );
    expect(helperSource).toContain("timingSafeEqual");

    // Must NOT use plain === for secret comparison anywhere in the helper.
    expect(helperSource).not.toMatch(/secret\s*===\s*[a-zA-Z]/);
  });
});
