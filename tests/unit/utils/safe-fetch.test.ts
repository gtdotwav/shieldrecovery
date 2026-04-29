import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { safeFetch } from "../../../src/server/recovery/utils/safe-fetch";

describe("safeFetch", () => {
  const realFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.fetch = realFetch;
  });

  it("aborts the request when the timeout elapses before a response", async () => {
    const slowFetch = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );
    globalThis.fetch = slowFetch as unknown as typeof fetch;

    const promise = safeFetch("https://example.com", { timeoutMs: 100 });
    vi.advanceTimersByTime(150);
    await expect(promise).rejects.toThrow(/aborted/i);
    expect(slowFetch).toHaveBeenCalledTimes(1);
  });

  it("respects a caller-supplied AbortSignal and does not double-arm", async () => {
    const stub = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    globalThis.fetch = stub as unknown as typeof fetch;

    const controller = new AbortController();
    const result = await safeFetch("https://example.com", {
      signal: controller.signal,
    });
    expect(result.status).toBe(204);
    const init = stub.mock.calls[0]?.[1] as RequestInit;
    expect(init.signal).toBe(controller.signal);
  });
});
