import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { authorizeCronRequest } from "../../../src/server/observability/cron-auth";

describe("authorizeCronRequest", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = "secret-token-for-tests";
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it("rejects the request when no secret header is present", () => {
    const request = new Request("https://example.com/api/agent/orchestrate");
    const result = authorizeCronRequest(request, { route: "/api/agent" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("invalid_secret");
    }
  });

  it("accepts a Bearer token that matches CRON_SECRET", () => {
    const request = new Request("https://example.com/api/agent/orchestrate", {
      headers: { authorization: "Bearer secret-token-for-tests" },
    });
    const result = authorizeCronRequest(request, { route: "/api/agent" });
    expect(result.ok).toBe(true);
  });

  it("accepts the legacy x-worker-secret header", () => {
    const request = new Request("https://example.com/api/agent/orchestrate", {
      headers: { "x-worker-secret": "secret-token-for-tests" },
    });
    const result = authorizeCronRequest(request, { route: "/api/agent" });
    expect(result.ok).toBe(true);
  });

  it("returns secret_not_configured when CRON_SECRET is empty", () => {
    process.env.CRON_SECRET = "";
    const request = new Request("https://example.com/api/agent/orchestrate", {
      headers: { authorization: "Bearer anything" },
    });
    const result = authorizeCronRequest(request, { route: "/api/agent" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("secret_not_configured");
    }
  });
});
