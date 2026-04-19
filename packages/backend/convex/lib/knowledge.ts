"use node";

import { lookup } from "node:dns/promises";
import { GoogleGenAI } from "@google/genai";
import * as cheerio from "cheerio";
import TurndownService from "turndown";

export const KNOWLEDGE_EMBEDDING_MODEL = "gemini-embedding-001";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

export type WebsiteFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export type WebsiteLookup = (hostname: string) => Promise<string[]>;

export type KnowledgeDraftChunk = {
  chunkIndex: number;
  text: string;
  embedding: number[];
  tokenEstimate: number;
};

export type KnowledgeSearchChunk = {
  sourceId: string;
  title: string;
  text: string;
  embedding: number[];
};

export type WebsiteMarkdownResult = {
  markdown: string;
  sourceVendor: "jina_reader" | "firecrawl" | "cheerio";
  originalFormat: "markdown" | "html";
};

export type PreparedKnowledgeSourceDraft = {
  title: string;
  sourceType: "inline" | "website" | "pdf";
  sourceUrl?: string;
  sourceVendor:
    | "inline"
    | "jina_reader"
    | "firecrawl"
    | "cheerio"
    | "pdf_deferred";
  originalFormat: "markdown" | "html" | "plain_text" | "pdf";
  markdownContent: string;
  chunkCount: number;
  embeddingModel?: string;
  status: "ready" | "deferred";
  errorMessage?: string;
  chunks: KnowledgeDraftChunk[];
};

export function normalizeMarkdown(input: string): string {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function estimateTokenCount(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function deriveKnowledgeTitle(
  markdown: string,
  sourceUrl?: string,
  fallbackTitle?: string,
): string {
  if (fallbackTitle && fallbackTitle.trim().length > 0) {
    return fallbackTitle.trim();
  }

  const headingMatch = markdown.match(/^#\s+(.+)$/m);
  if (headingMatch?.[1]) {
    return headingMatch[1].trim();
  }

  if (sourceUrl) {
    const parsed = new URL(sourceUrl);
    return parsed.hostname.replace(/^www\./, "");
  }

  return "Untitled Knowledge Source";
}

export function chunkMarkdown(
  markdown: string,
  {
    maxLength = 900,
    overlap = 140,
  }: {
    maxLength?: number;
    overlap?: number;
  } = {},
): string[] {
  const normalized = normalizeMarkdown(markdown);
  if (!normalized) {
    return [];
  }

  const paragraphs = normalized.split("\n\n");
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;

    if (candidate.length <= maxLength) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current);
      const overlapSeed =
        overlap > 0 ? current.slice(Math.max(0, current.length - overlap)) : "";
      current = overlapSeed ? `${overlapSeed}\n\n${paragraph}` : paragraph;
      continue;
    }

    for (let index = 0; index < paragraph.length; index += maxLength - overlap) {
      chunks.push(paragraph.slice(index, index + maxLength));
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks
    .map((chunk) => normalizeMarkdown(chunk))
    .filter((chunk, index, allChunks) => chunk.length > 0 && allChunks.indexOf(chunk) === index);
}

export function convertHtmlToMarkdown(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, nav, footer, noscript, iframe, svg").remove();

  const title = $("title").first().text().trim();
  const mainHtml =
    $("main").first().html() ??
    $("article").first().html() ??
    $("body").html() ??
    html;
  const markdownBody = turndown.turndown(mainHtml);

  return normalizeMarkdown(
    [title ? `# ${title}` : "", markdownBody].filter(Boolean).join("\n\n"),
  );
}

export function isPrivateIpAddress(address: string): boolean {
  if (address === "::1") {
    return true;
  }

  if (/^(fc|fd|fe80):/i.test(address)) {
    return true;
  }

  const parts = address.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }

  const [first = NaN, second = NaN] = parts;

  if (first === 10 || first === 127 || first === 0) {
    return true;
  }

  if (first === 169 && second === 254) {
    return true;
  }

  if (first === 172 && second >= 16 && second <= 31) {
    return true;
  }

  if (first === 192 && second === 168) {
    return true;
  }

  return false;
}

async function defaultLookup(hostname: string): Promise<string[]> {
  const addresses = await lookup(hostname, {
    all: true,
    verbatim: true,
  });

  return addresses.map((entry) => entry.address);
}

export async function assertPublicWebsiteUrl(
  url: string,
  lookupFn: WebsiteLookup = defaultLookup,
): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Validation Error: website URL must be a valid URL.");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Validation Error: website URL must use http or https.");
  }

  if (parsed.username || parsed.password) {
    throw new Error("Validation Error: website URL cannot include credentials.");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new Error("Validation Error: private or internal URLs are blocked.");
  }

  if (isPrivateIpAddress(hostname)) {
    throw new Error("Validation Error: private or internal URLs are blocked.");
  }

  const resolvedAddresses = await lookupFn(hostname);
  if (resolvedAddresses.some((address) => isPrivateIpAddress(address))) {
    throw new Error("Validation Error: private or internal URLs are blocked.");
  }

  return parsed.toString();
}

function extractFirecrawlMarkdown(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as {
    markdown?: unknown;
    data?: { markdown?: unknown } | null;
  };

  if (typeof candidate.markdown === "string") {
    return candidate.markdown;
  }

  if (candidate.data && typeof candidate.data.markdown === "string") {
    return candidate.data.markdown;
  }

  return null;
}

export async function fetchWebsiteMarkdown({
  url,
  firecrawlApiKey,
  fetchImpl = fetch,
  lookupFn,
}: {
  url: string;
  firecrawlApiKey?: string;
  fetchImpl?: WebsiteFetch;
  lookupFn?: WebsiteLookup;
}): Promise<WebsiteMarkdownResult> {
  const normalizedUrl = await assertPublicWebsiteUrl(url, lookupFn);

  try {
    const readerResponse = await fetchImpl(`https://r.jina.ai/${normalizedUrl}`);
    if (readerResponse.ok) {
      const markdown = normalizeMarkdown(await readerResponse.text());
      if (markdown.length > 0) {
        return {
          markdown,
          sourceVendor: "jina_reader",
          originalFormat: "markdown",
        };
      }
    }
  } catch {
    // fall through to the next provider
  }

  if (firecrawlApiKey) {
    try {
      const firecrawlResponse = await fetchImpl("https://api.firecrawl.dev/v2/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${firecrawlApiKey}`,
        },
        body: JSON.stringify({
          url: normalizedUrl,
          formats: ["markdown"],
          onlyMainContent: true,
        }),
      });

      if (firecrawlResponse.ok) {
        const payload = (await firecrawlResponse.json()) as unknown;
        const markdown = normalizeMarkdown(extractFirecrawlMarkdown(payload) ?? "");
        if (markdown.length > 0) {
          return {
            markdown,
            sourceVendor: "firecrawl",
            originalFormat: "markdown",
          };
        }
      }
    } catch {
      // fall through to the HTML fallback
    }
  }

  const htmlResponse = await fetchImpl(normalizedUrl);
  if (!htmlResponse.ok) {
    throw new Error(`Website fetch failed with status ${htmlResponse.status}`);
  }

  const html = await htmlResponse.text();
  const markdown = convertHtmlToMarkdown(html);
  if (!markdown) {
    throw new Error("Website fetch produced empty content after HTML normalization.");
  }

  return {
    markdown,
    sourceVendor: "cheerio",
    originalFormat: "html",
  };
}

type EmbeddingResponse = {
  embeddings?: Array<{
    values?: number[];
  }>;
};

type EmbeddingClient = {
  models: {
    embedContent(args: {
      model: string;
      contents: string | string[];
    }): Promise<EmbeddingResponse>;
  };
};

export async function embedTexts({
  texts,
  apiKey,
  embeddingClient,
}: {
  texts: string[];
  apiKey: string;
  embeddingClient?: EmbeddingClient;
}): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const client = embeddingClient ?? new GoogleGenAI({ apiKey });
  const response = await client.models.embedContent({
    model: KNOWLEDGE_EMBEDDING_MODEL,
    contents: texts,
  });

  const embeddings =
    response.embeddings?.map((embedding) => embedding.values ?? []) ?? [];

  if (embeddings.length !== texts.length || embeddings.some((values) => values.length === 0)) {
    throw new Error("Embedding generation returned an invalid response.");
  }

  return embeddings;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0;
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let index = 0; index < a.length; index += 1) {
    const valueA = a[index] ?? 0;
    const valueB = b[index] ?? 0;
    dotProduct += valueA * valueB;
    magnitudeA += valueA * valueA;
    magnitudeB += valueB * valueB;
  }

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

export function selectRelevantKnowledgeChunks(
  queryEmbedding: number[],
  chunks: KnowledgeSearchChunk[],
  {
    topK = 4,
    minimumScore = 0.15,
  }: {
    topK?: number;
    minimumScore?: number;
  } = {},
) {
  return chunks
    .map((chunk) => ({
      ...chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .filter((chunk) => chunk.score >= minimumScore)
    .sort((left, right) => right.score - left.score)
    .slice(0, topK);
}

export async function prepareKnowledgeSourceDraft({
  sourceType,
  title,
  content,
  url,
  embeddingApiKey,
  firecrawlApiKey,
  fetchImpl,
  lookupFn,
  embeddingClient,
}: {
  sourceType: "inline" | "website" | "pdf";
  title?: string;
  content?: string;
  url?: string;
  embeddingApiKey?: string;
  firecrawlApiKey?: string;
  fetchImpl?: WebsiteFetch;
  lookupFn?: WebsiteLookup;
  embeddingClient?: EmbeddingClient;
}): Promise<PreparedKnowledgeSourceDraft> {
  if (sourceType === "pdf") {
    return {
      title: deriveKnowledgeTitle("", undefined, title || "PDF source"),
      sourceType,
      sourceVendor: "pdf_deferred",
      originalFormat: "pdf",
      markdownContent: "",
      chunkCount: 0,
      status: "deferred",
      errorMessage: "PDF ingestion is intentionally deferred in phase 4.",
      chunks: [],
    };
  }

  let markdownContent = "";
  let sourceUrl: string | undefined;
  let sourceVendor: PreparedKnowledgeSourceDraft["sourceVendor"] = "inline";
  let originalFormat: PreparedKnowledgeSourceDraft["originalFormat"] = "plain_text";

  if (sourceType === "inline") {
    const inlineContent = normalizeMarkdown(content ?? "");
    if (!inlineContent) {
      throw new Error("Validation Error: inline knowledge content is required.");
    }

    markdownContent = inlineContent;
  }

  if (sourceType === "website") {
    if (!url || url.trim().length === 0) {
      throw new Error("Validation Error: website URL is required.");
    }

    const websiteResult = await fetchWebsiteMarkdown({
      url,
      firecrawlApiKey,
      fetchImpl,
      lookupFn,
    });
    markdownContent = websiteResult.markdown;
    sourceUrl = await assertPublicWebsiteUrl(url, lookupFn);
    sourceVendor = websiteResult.sourceVendor;
    originalFormat = websiteResult.originalFormat;
  }

  if (!embeddingApiKey) {
    throw new Error(
      "Knowledge ingestion requires GOOGLE_GENERATIVE_AI_API_KEY or a Google provider key.",
    );
  }

  const chunks = chunkMarkdown(markdownContent);
  if (chunks.length === 0) {
    throw new Error("Knowledge ingestion produced no chunks after normalization.");
  }

  const embeddings = await embedTexts({
    texts: chunks,
    apiKey: embeddingApiKey,
    embeddingClient,
  });

  return {
    title: deriveKnowledgeTitle(markdownContent, sourceUrl, title),
    sourceType,
    sourceUrl,
    sourceVendor,
    originalFormat,
    markdownContent,
    chunkCount: chunks.length,
    embeddingModel: KNOWLEDGE_EMBEDDING_MODEL,
    status: "ready",
    chunks: chunks.map((chunk, chunkIndex) => {
      const embedding = embeddings[chunkIndex];
      if (!embedding) {
        throw new Error("Embedding generation returned an invalid response.");
      }

      return {
        chunkIndex,
        text: chunk,
        embedding,
        tokenEstimate: estimateTokenCount(chunk),
      };
    }),
  };
}
