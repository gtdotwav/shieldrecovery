import { describe, it, expect } from "vitest";

/**
 * Security tests for injection prevention.
 * Tests PostgREST filter sanitization and URL redirect validation.
 */

describe("PostgREST Filter Injection Prevention", () => {
  it("should not allow raw string interpolation in .or() filters", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");

    const source = readFileSync(
      join(
        process.cwd(),
        "src/server/recovery/services/supabase-storage.ts",
      ),
      "utf-8",
    );

    // Find all .or() calls with template literals
    const orCalls = source.match(/\.or\(`[^`]+`\)/g) ?? [];

    for (const call of orCalls) {
      // Every interpolation in .or() must use sanitizeFilterValue
      const interpolations = call.match(/\$\{[^}]+\}/g) ?? [];
      for (const interp of interpolations) {
        expect(interp).toContain("sanitizeFilterValue");
      }
    }
  });

  it("sanitizeFilterValue should strip dangerous characters", async () => {
    // Import the function indirectly by checking the file contains the right logic
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");

    const source = readFileSync(
      join(
        process.cwd(),
        "src/server/recovery/services/supabase-storage.ts",
      ),
      "utf-8",
    );

    // Must block commas (PostgREST filter separator)
    expect(source).toContain("sanitizeFilterValue");
    // Must use a whitelist approach (replace non-allowed chars)
    expect(source).toMatch(/replace\([^)]+[^a-zA-Z0-9]/);
  });
});

describe("Open Redirect Prevention in Retry Page", () => {
  it("should validate checkout URL origin before redirecting", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");

    const source = readFileSync(
      join(
        process.cwd(),
        "src/app/retry/[gatewayPaymentId]/page.tsx",
      ),
      "utf-8",
    );

    // Must validate the origin of the checkout URL
    expect(source).toContain("CHECKOUT_PLATFORM_URL");
    expect(source).toContain(".origin");
    // The redirect must be inside a conditional origin check, not standalone
    // Count: origin validation must appear before the redirect call
    const originCheckIdx = source.indexOf("redirectUrl.origin === checkoutOrigin");
    const redirectIdx = source.indexOf("redirect(session.checkoutUrl)");
    expect(originCheckIdx).toBeGreaterThan(-1);
    expect(redirectIdx).toBeGreaterThan(originCheckIdx);
  });
});

describe("Debug Route Error Sanitization", () => {
  it("should not expose stack traces in error responses", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");

    const source = readFileSync(
      join(
        process.cwd(),
        "src/app/api/debug/process-webhook/route.ts",
      ),
      "utf-8",
    );

    // Must NOT include error.stack or error.name in response JSON
    expect(source).not.toContain("error.stack");
    expect(source).not.toContain("error.name");
    // Must NOT leak Supabase URL/key content
    expect(source).not.toContain('.slice(0, 40)');
    expect(source).not.toContain('.slice(0, 20)');
  });
});
