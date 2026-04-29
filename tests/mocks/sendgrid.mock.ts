import { vi } from "vitest";

/**
 * Drop-in fetch stub for SendGrid's mail/send endpoint. Returns the
 * canonical 202 (Accepted) shape so callers do not blow up.
 *
 *   vi.spyOn(globalThis, "fetch").mockImplementation(mockSendGridFetch());
 */
export function mockSendGridFetch(input: { failure?: boolean } = {}) {
  return vi.fn(async (target: RequestInfo | URL) => {
    const url = typeof target === "string" ? target : target.toString();
    if (!url.includes("api.sendgrid.com")) {
      throw new Error(`Unexpected fetch in test: ${url}`);
    }
    if (input.failure) {
      return new Response(
        JSON.stringify({ errors: [{ message: "fake send failure" }] }),
        { status: 502, headers: { "content-type": "application/json" } },
      );
    }
    return new Response(null, {
      status: 202,
      headers: { "x-message-id": "stub-msg-1" },
    });
  });
}
