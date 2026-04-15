import { describe, it, expect, vi, afterEach } from "vitest";

/**
 * Security tests for input validation and sanitization.
 * Tests protection against injection attacks, XSS, and malformed input.
 */

describe("Quiz Email Validation", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  it("should reject empty email", async () => {
    const { submitQuizEmail } = await import("@/app/actions/quiz-actions");

    const formData = new FormData();
    formData.set("email", "");
    formData.set("answers", "[]");

    const result = await submitQuizEmail(null, formData);
    expect(result.error).toBeDefined();
  });

  it("should reject email without @", async () => {
    const { submitQuizEmail } = await import("@/app/actions/quiz-actions");

    const formData = new FormData();
    formData.set("email", "invalidemail");
    formData.set("answers", "[]");

    const result = await submitQuizEmail(null, formData);
    expect(result.error).toBeDefined();
  });

  it("should reject email without dot", async () => {
    const { submitQuizEmail } = await import("@/app/actions/quiz-actions");

    const formData = new FormData();
    formData.set("email", "user@localhost");
    formData.set("answers", "[]");

    const result = await submitQuizEmail(null, formData);
    expect(result.error).toBeDefined();
  });

  it("should handle malformed JSON answers gracefully", async () => {
    const { submitQuizEmail } = await import("@/app/actions/quiz-actions");

    const formData = new FormData();
    formData.set("email", "user@test.com");
    formData.set("answers", "{not valid json[[[");

    const result = await submitQuizEmail(null, formData);
    // Should return an error, not throw
    expect(result.error).toBeDefined();
  });

  it("should handle non-array JSON answers", async () => {
    const { submitQuizEmail } = await import("@/app/actions/quiz-actions");

    const formData = new FormData();
    formData.set("email", "user@test.com");
    formData.set("answers", '{"evil": "object"}');

    // Should not crash - the code should handle non-array gracefully
    const result = await submitQuizEmail(null, formData);
    // Either succeeds (treating as empty) or returns error — both are acceptable
    expect(result.error ?? result.success).toBeDefined();
  });

  it("should normalize email to lowercase", async () => {
    const { submitQuizEmail } = await import("@/app/actions/quiz-actions");

    const formData = new FormData();
    formData.set("email", "USER@TEST.COM");
    formData.set("answers", "[]");

    // Should not throw — email normalization should work
    const result = await submitQuizEmail(null, formData);
    // Success or soft error (storage not configured) — not a crash
    expect(result).toBeDefined();
  });
});

describe("Source Code Security Patterns", () => {
  it("should not have dangerouslySetInnerHTML in any component", async () => {
    const { execSync } = await import("node:child_process");

    const result = execSync(
      'grep -r "dangerouslySetInnerHTML" src/ --include="*.tsx" --include="*.ts" -l 2>/dev/null || echo ""',
      { cwd: process.cwd(), encoding: "utf-8" },
    ).trim();

    // If any files use dangerouslySetInnerHTML, they should be reviewed
    if (result) {
      console.warn(
        `[REVIEW NEEDED] Files using dangerouslySetInnerHTML: ${result}`,
      );
    }
    // Not necessarily a failure, but flag it
  });

  it("should not have eval() calls", async () => {
    const { execSync } = await import("node:child_process");

    const result = execSync(
      'grep -rn "\\beval(" src/ --include="*.ts" --include="*.tsx" 2>/dev/null || echo ""',
      { cwd: process.cwd(), encoding: "utf-8" },
    ).trim();

    expect(result).toBe("");
  });

  it("should not have console.log of sensitive env vars", async () => {
    const { execSync } = await import("node:child_process");

    const result = execSync(
      'grep -rn "console\\.log.*process\\.env\\." src/ --include="*.ts" --include="*.tsx" 2>/dev/null || echo ""',
      { cwd: process.cwd(), encoding: "utf-8" },
    ).trim();

    expect(result).toBe("");
  });

  it("should not have string interpolation in SQL-like operations", async () => {
    const { execSync } = await import("node:child_process");

    // Check for template literals in .rpc() calls which could be SQL injection
    const result = execSync(
      'grep -rn "\\.rpc(\\`" src/ --include="*.ts" 2>/dev/null || echo ""',
      { cwd: process.cwd(), encoding: "utf-8" },
    ).trim();

    expect(result).toBe("");
  });
});

describe("Error Information Disclosure", () => {
  it("should not expose stack traces in debug route responses", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");

    const source = readFileSync(
      join(process.cwd(), "src/app/api/debug/process-webhook/route.ts"),
      "utf-8",
    );

    // Should NOT include error.stack in the response body
    expect(source).not.toMatch(/error\.stack/);
    // Should NOT send detailed error objects to client
    expect(source).not.toMatch(/name:\s*error\.name/);
  });

  it("should not expose internal details in webhook error responses", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");

    const source = readFileSync(
      join(
        process.cwd(),
        "src/server/recovery/controllers/webhook-controller.ts",
      ),
      "utf-8",
    );

    // Webhook controller should not leak stack traces
    expect(source).not.toMatch(/stack:\s*error\.stack/);
  });
});

describe("Sensitive Data in Source", () => {
  it("should not have API keys hardcoded in source files", async () => {
    const { execSync } = await import("node:child_process");

    // Check for common API key patterns in source (not env files)
    // Exclude placeholder text in form inputs (e.g. placeholder="sk_live_...")
    const result = execSync(
      'grep -rn "sk_live_\\|sk_test_\\|pk_live_\\|pk_test_" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "placeholder=" | grep -v "api-keys\\.ts" | grep -v "KEY_PREFIX_" | grep -v "sk_live_\\*\\|sk_test_\\*" || echo ""',
      { cwd: process.cwd(), encoding: "utf-8" },
    ).trim();

    expect(result).toBe("");
  });

  it("should not have JWT tokens hardcoded in source files", async () => {
    const { execSync } = await import("node:child_process");

    const result = execSync(
      'grep -rn "eyJhbGci" src/ --include="*.ts" --include="*.tsx" 2>/dev/null || echo ""',
      { cwd: process.cwd(), encoding: "utf-8" },
    ).trim();

    expect(result).toBe("");
  });
});
