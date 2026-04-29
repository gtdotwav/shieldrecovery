import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  invalidateTemplateCache,
  resolveTemplate,
} from "../../../src/server/recovery/services/template-resolver";

describe("resolveTemplate (no Supabase configured → fallback path)", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    invalidateTemplateCache();
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
    invalidateTemplateCache();
  });

  it("falls back to the caller-supplied template when DB is unreachable", async () => {
    const result = await resolveTemplate({
      slug: "gentle-reminder-general",
      fallback: "Olá {{customerName}}!",
      variables: { customerName: "Carla" },
    });
    expect(result).toBe("Olá Carla!");
  });

  it("interpolates multiple variables and ignores unknown ones", async () => {
    const result = await resolveTemplate({
      slug: "anything",
      fallback: "{{name}} - {{value}} - {{missing}}",
      variables: { name: "Test", value: 42 },
    });
    expect(result).toBe("Test - 42 - ");
  });
});
