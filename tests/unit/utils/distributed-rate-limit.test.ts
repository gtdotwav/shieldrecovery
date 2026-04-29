import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { bumpRateLimit } from "../../../src/server/recovery/utils/distributed-rate-limit";

describe("bumpRateLimit (in-memory fallback)", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  beforeEach(() => {
    // Force the in-memory fallback path by stripping Supabase env.
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  });

  it("allows up to maxCount hits then blocks the next one", async () => {
    const first = await bumpRateLimit({
      key: "rl-test:a",
      windowSeconds: 60,
      maxCount: 2,
    });
    expect(first.allowed).toBe(true);
    expect(first.count).toBe(1);

    const second = await bumpRateLimit({
      key: "rl-test:a",
      windowSeconds: 60,
      maxCount: 2,
    });
    expect(second.allowed).toBe(true);

    const third = await bumpRateLimit({
      key: "rl-test:a",
      windowSeconds: 60,
      maxCount: 2,
    });
    expect(third.allowed).toBe(false);
    expect(third.count).toBe(2);
  });

  it("uses independent buckets for distinct keys", async () => {
    const a = await bumpRateLimit({
      key: "rl-test:isolation:a",
      windowSeconds: 60,
      maxCount: 1,
    });
    const b = await bumpRateLimit({
      key: "rl-test:isolation:b",
      windowSeconds: 60,
      maxCount: 1,
    });
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true);
  });
});
