import { beforeEach, describe, expect, it, vi } from "vitest";

const generateTextMock = vi.fn();
const createGoogleGenerativeAIMock = vi.fn(() =>
  vi.fn((modelId: string) => modelId),
);

vi.mock("ai", () => ({
  generateText: (...args: unknown[]) => generateTextMock(...args),
}));

vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: (...args: unknown[]) =>
    createGoogleGenerativeAIMock(...args),
}));

describe("AI runtime helpers", () => {
  beforeEach(() => {
    generateTextMock.mockReset();
    createGoogleGenerativeAIMock.mockClear();
  });

  it("uses the configured prompt and returns Gemini usage metadata", async () => {
    generateTextMock.mockResolvedValue({
      text: "Hello from Gemini",
      usage: {
        inputTokens: 12,
        outputTokens: 20,
        totalTokens: 32,
      },
    });

    const { generateWithPrimaryModel } = await import("../convex/ai");
    const result = await generateWithPrimaryModel({
      organizationId: "org_doc_123",
      botId: "bot_doc_123",
      providerType: "google",
      providerApiKey: "api-key",
      selectedModel: "gemini-2.5-flash",
      messages: [{ role: "user", content: "Hello there" }],
      systemPrompt: "You are helpful.",
      ragContext: [],
      x: 5_000,
      temperature: 0.4,
      maxTokens: 256,
    });

    expect(createGoogleGenerativeAIMock).toHaveBeenCalledWith({
      apiKey: "api-key",
    });
    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-2.5-flash",
        prompt: expect.stringContaining("You are helpful."),
        temperature: 0.4,
        maxOutputTokens: 256,
      }),
    );
    expect(result.selectedProvider).toBe("google");
    expect(result.selectedModel).toBe("gemini-2.5-flash");
    expect(result.usage?.totalTokens).toBe(32);
  });

  it("validates DigitalOcean reference config coherently", async () => {
    const { validateDigitalOceanReferenceConfig } =
      await import("../convex/ai");

    expect(() =>
      validateDigitalOceanReferenceConfig({
        endpointUrl: "https://example.com",
      }),
    ).toThrow(
      "DigitalOcean reference config requires both endpointUrl and modelId",
    );

    expect(
      validateDigitalOceanReferenceConfig({
        endpointUrl: "https://example.com",
        modelId: "llama3.3-70b-instruct",
      }),
    ).toEqual({ valid: true });
  });
});
