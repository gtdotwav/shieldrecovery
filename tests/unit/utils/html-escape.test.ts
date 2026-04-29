import { describe, expect, it } from "vitest";

import {
  escapeHtml,
  renderSafeMarkdown,
} from "../../../src/server/recovery/utils/html-escape";

describe("escapeHtml", () => {
  it("escapes the canonical XSS characters", () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;&#x2F;script&gt;",
    );
  });

  it("returns the input unchanged when there is nothing to escape", () => {
    expect(escapeHtml("hello world")).toBe("hello world");
  });

  it("preserves accented Portuguese", () => {
    expect(escapeHtml("Olá, João")).toBe("Olá, João");
  });
});

describe("renderSafeMarkdown", () => {
  it("expands **bold** without trusting raw HTML", () => {
    expect(renderSafeMarkdown("Hello **world**")).toBe(
      "Hello <strong>world</strong>",
    );
  });

  it("escapes script tags even when they appear inside **bold**", () => {
    const out = renderSafeMarkdown("**<img src=x onerror=alert(1)>**");
    expect(out).not.toContain("<img");
    expect(out).toContain("&lt;img");
    expect(out).toContain("<strong>");
  });

  it("converts bullets into the safe arrow glyph", () => {
    expect(renderSafeMarkdown("• primeiro\n• segundo")).toBe(
      "→ primeiro<br/>→ segundo",
    );
  });

  it("converts newlines into <br/>", () => {
    expect(renderSafeMarkdown("a\nb\nc")).toBe("a<br/>b<br/>c");
  });
});
