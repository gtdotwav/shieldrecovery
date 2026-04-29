import { vi } from "vitest";

/**
 * Stub for WhatsApp Cloud API messages endpoint. Returns a fake
 * message id so retry/log paths can be exercised without network.
 */
export function mockWhatsAppCloudFetch(input: { failure?: boolean } = {}) {
  return vi.fn(async (target: RequestInfo | URL) => {
    const url = typeof target === "string" ? target : target.toString();
    if (!url.includes("graph.facebook.com")) {
      throw new Error(`Unexpected fetch in test: ${url}`);
    }
    if (input.failure) {
      return new Response(
        JSON.stringify({ error: { code: 131009, message: "fake outage" } }),
        { status: 503, headers: { "content-type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({ messages: [{ id: "wamid.STUB-1" }] }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  });
}
