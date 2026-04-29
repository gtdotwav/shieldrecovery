import { vi } from "vitest";

/**
 * Drop-in fetch stub for `https://api.openai.com/v1/responses`.
 *
 *   vi.spyOn(globalThis, "fetch").mockImplementation(
 *     mockOpenAiFetch({ outputText: "Olá, tudo certo?" }),
 *   );
 */
export function mockOpenAiFetch(input: {
  outputText?: string;
  status?: number;
  delayMs?: number;
}) {
  const status = input.status ?? 200;
  const text = input.outputText ?? "stub-response";

  return vi.fn(async (target: RequestInfo | URL) => {
    const url = typeof target === "string" ? target : target.toString();
    if (!url.includes("api.openai.com")) {
      throw new Error(`Unexpected fetch in test: ${url}`);
    }
    if (input.delayMs) {
      await new Promise((resolve) => setTimeout(resolve, input.delayMs));
    }
    return new Response(
      JSON.stringify({
        output_text: text,
        output: [{ content: [{ type: "output_text", text }] }],
      }),
      { status, headers: { "content-type": "application/json" } },
    );
  });
}
