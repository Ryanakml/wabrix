import { describe, expect, it, vi } from "vitest";
import { prepareKnowledgeSourceDraft } from "../convex/lib/knowledge";

describe("knowledge ingestion", () => {
  it("stores Jina website content as markdown before embedding", async () => {
    const fetchMock = vi.fn(async () =>
      new Response("# FAQ\n\nWe are open on Sundays."),
    );

    const draft = await prepareKnowledgeSourceDraft({
      sourceType: "website",
      url: "https://example.com/faq",
      embeddingApiKey: "test-key",
      fetchImpl: fetchMock,
      lookupFn: async () => ["93.184.216.34"],
      embeddingClient: {
        models: {
          embedContent: async () => ({
            embeddings: [{ values: [0.1, 0.2] }],
          }),
        },
      },
    });

    expect(fetchMock).toHaveBeenCalledWith("https://r.jina.ai/https://example.com/faq");
    expect(draft.sourceVendor).toBe("jina_reader");
    expect(draft.markdownContent).toContain("# FAQ");
    expect(draft.chunkCount).toBeGreaterThan(0);
  });

  it("falls back to cheerio and converts HTML output into markdown", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(
        new Response(
          "<html><head><title>Policy</title></head><body><main><p>Answer in markdown.</p></main></body></html>",
        ),
      );

    const draft = await prepareKnowledgeSourceDraft({
      sourceType: "website",
      url: "https://example.com/policy",
      embeddingApiKey: "test-key",
      fetchImpl: fetchMock,
      lookupFn: async () => ["93.184.216.34"],
      embeddingClient: {
        models: {
          embedContent: async () => ({
            embeddings: [{ values: [0.1, 0.2] }],
          }),
        },
      },
    });

    expect(draft.sourceVendor).toBe("cheerio");
    expect(draft.markdownContent).toContain("# Policy");
    expect(draft.markdownContent).toContain("Answer in markdown.");
  });

  it("prepares inline knowledge, chunks it, and generates embeddings", async () => {
    const draft = await prepareKnowledgeSourceDraft({
      sourceType: "inline",
      title: "Support Notes",
      content:
        "Refunds are available within 14 days.\n\nBusiness hours are 09:00-17:00 every weekday.",
      embeddingApiKey: "test-key",
      embeddingClient: {
        models: {
          embedContent: async ({ contents }) => ({
            embeddings: (contents as string[]).map(() => ({
              values: [0.5, 0.4, 0.3],
            })),
          }),
        },
      },
    });

    expect(draft.title).toBe("Support Notes");
    expect(draft.embeddingModel).toBe("gemini-embedding-001");
    expect(draft.chunks.length).toBeGreaterThan(0);
    expect(draft.chunks[0]?.embedding).toEqual([0.5, 0.4, 0.3]);
  });
});
