import { describe, expect, it } from "vitest";
import {
  assertPublicWebsiteUrl,
  chunkMarkdown,
  convertHtmlToMarkdown,
  normalizeMarkdown,
  selectRelevantKnowledgeChunks,
} from "../convex/lib/knowledge";

describe("knowledge helpers", () => {
  it("normalizes markdown and chunks long content", () => {
    const normalized = normalizeMarkdown("## FAQ\r\n\r\nHello   \r\n\r\n\r\nWorld");
    expect(normalized).toBe("## FAQ\n\nHello\n\nWorld");

    const chunks = chunkMarkdown(
      Array.from({ length: 12 }, (_, index) => `Paragraph ${index}`).join("\n\n"),
      {
        maxLength: 80,
        overlap: 10,
      },
    );
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("blocks private or internal website URLs", async () => {
    await expect(
      assertPublicWebsiteUrl("http://127.0.0.1/admin", async () => ["127.0.0.1"]),
    ).rejects.toThrow("Validation Error: private or internal URLs are blocked.");

    await expect(
      assertPublicWebsiteUrl("https://example.com", async () => ["10.10.10.10"]),
    ).rejects.toThrow("Validation Error: private or internal URLs are blocked.");
  });

  it("converts HTML fallback output into markdown", () => {
    const markdown = convertHtmlToMarkdown(`
      <html>
        <head><title>Shipping Policy</title></head>
        <body>
          <main>
            <h1>Shipping Policy</h1>
            <p>Orders ship every weekday.</p>
          </main>
        </body>
      </html>
    `);

    expect(markdown).toContain("# Shipping Policy");
    expect(markdown).toContain("Orders ship every weekday.");
  });

  it("retrieves the most relevant embedded knowledge chunks", () => {
    const matches = selectRelevantKnowledgeChunks(
      [1, 0, 0],
      [
        {
          sourceId: "source_a",
          title: "Returns",
          text: "You can return products within 30 days.",
          embedding: [0.99, 0.02, 0],
        },
        {
          sourceId: "source_b",
          title: "Store Hours",
          text: "We are open from 09:00 to 17:00.",
          embedding: [0, 1, 0],
        },
      ],
      {
        topK: 1,
        minimumScore: 0.1,
      },
    );

    expect(matches).toHaveLength(1);
    expect(matches[0]?.title).toBe("Returns");
  });
});
