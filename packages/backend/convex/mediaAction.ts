"use node";

import { Buffer } from "node:buffer";
import { createHash, createHmac } from "node:crypto";
import { v } from "convex/values";
import { internal } from "./_generated/api.js";
import { internalAction, type ActionCtx } from "./_generated/server.js";
import { decryptSecret } from "./lib/crypto.js";

const MAX_INLINE_MEDIA_BYTES = 5 * 1024 * 1024;

function getGraphApiBaseUrl() {
  return (
    process.env.WHATSAPP_GRAPH_API_BASE_URL?.replace(/\/$/, "") ??
    "https://graph.facebook.com/v23.0"
  );
}

function sha256Hex(input: string | Buffer) {
  return createHash("sha256").update(input).digest("hex");
}

function hmac(key: Buffer | string, value: string) {
  return createHmac("sha256", key).update(value).digest();
}

function encodePathSegment(segment: string) {
  return encodeURIComponent(segment).replace(/%2F/g, "/");
}

function buildObjectKey(input: {
  organizationId: string;
  mediaId: string;
  mediaType: string;
  mimeType?: string;
}) {
  const extension =
    input.mimeType?.split("/")[1]?.replace(/[^a-zA-Z0-9]/g, "") ??
    (input.mediaType === "audio"
      ? "ogg"
      : input.mediaType === "image"
        ? "jpg"
        : "bin");

  return `whatsapp/${input.organizationId}/${input.mediaId}.${extension}`;
}

async function fetchMetaMediaMetadata(args: {
  providerMediaId: string;
  accessToken: string;
  fetchImpl?: typeof fetch;
}) {
  const response = await (args.fetchImpl ?? fetch)(
    `${getGraphApiBaseUrl()}/${args.providerMediaId}`,
    {
      headers: {
        Authorization: `Bearer ${args.accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Meta media metadata lookup failed with status ${response.status}`);
  }

  return (await response.json()) as {
    url?: string;
    mime_type?: string;
    file_size?: number;
    sha256?: string;
  };
}

async function downloadMetaMediaBinary(args: {
  mediaUrl: string;
  accessToken: string;
  fetchImpl?: typeof fetch;
}) {
  const response = await (args.fetchImpl ?? fetch)(args.mediaUrl, {
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Meta media download failed with status ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function uploadObjectStorage(args: {
  objectKey: string;
  body: Buffer;
  contentType: string;
  fetchImpl?: typeof fetch;
}) {
  const endpoint = process.env.MEDIA_STORAGE_ENDPOINT?.replace(/\/$/, "");
  const bucket = process.env.MEDIA_STORAGE_BUCKET;
  const accessKeyId = process.env.MEDIA_STORAGE_ACCESS_KEY_ID;
  const secretAccessKey = process.env.MEDIA_STORAGE_SECRET_ACCESS_KEY;
  const region = process.env.MEDIA_STORAGE_REGION ?? "auto";

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    return { configured: false as const, objectKey: undefined };
  }

  const baseUrl = new URL(endpoint);
  const canonicalUri = `${baseUrl.pathname.replace(/\/$/, "")}/${encodePathSegment(
    bucket,
  )}/${args.objectKey.split("/").map(encodePathSegment).join("/")}`;
  const targetUrl = new URL(`${baseUrl.origin}${canonicalUri}`);
  const host = targetUrl.host;
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(args.body);
  const canonicalHeaders =
    `content-type:${args.contentType}\n` +
    `host:${host}\n` +
    `x-amz-acl:public-read\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders =
    "content-type;host;x-amz-acl;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${secretAccessKey}`, dateStamp), region), "s3"),
    "aws4_request",
  );
  const signature = createHmac("sha256", signingKey)
    .update(stringToSign)
    .digest("hex");
  const authorization = [
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`,
  ].join(", ");

  const response = await (args.fetchImpl ?? fetch)(targetUrl, {
    method: "PUT",
    headers: {
      Authorization: authorization,
      "Content-Type": args.contentType,
      "X-Amz-Acl": "public-read",
      "X-Amz-Content-Sha256": payloadHash,
      "X-Amz-Date": amzDate,
    },
    body: new Uint8Array(args.body),
  });

  if (!response.ok) {
    throw new Error(`Object storage upload failed with status ${response.status}`);
  }

  return {
    configured: true as const,
    objectKey: args.objectKey,
  };
}

async function generateGeminiInlineText(args: {
  prompt: string;
  mimeType: string;
  body: Buffer;
  fetchImpl?: typeof fetch;
}) {
  const apiKey = process.env.GOOGLE_AI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey || args.body.length > MAX_INLINE_MEDIA_BYTES) {
    return null;
  }

  const cleanMimeType = args.mimeType.split(";")[0]?.trim() || args.mimeType;

  const envModel = (process.env.WHATSAPP_MEDIA_GEMINI_MODEL ?? "gemini-2.5-flash").trim();
  const rawModel = envModel.startsWith("models/") ? envModel.slice(7) : envModel;

  const requestBody = JSON.stringify({
    contents: [
      {
        role: "user",
        parts: [
          { text: args.prompt },
          {
            inlineData: {
              mimeType: cleanMimeType,
              data: args.body.toString("base64"),
            },
          },
        ],
      },
    ],
  });

  console.log(`[Gemini API] Sending payload to models/${rawModel}. MimeType: ${cleanMimeType}, Audio Base64 length: ${args.body.toString("base64").length}`);

  const response = await (args.fetchImpl ?? fetch)(
    `https://generativelanguage.googleapis.com/v1beta/models/${rawModel}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: requestBody,
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Gemini API failed with status ${response.status}: ${errorText}`);
    return null;
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("\n")
    .trim();

  return text || null;
}

function extractPlainText(body: Buffer, mimeType?: string) {
  if (!mimeType) {
    return null;
  }

  if (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/xml" ||
    mimeType === "text/csv"
  ) {
    return body.toString("utf8").trim().slice(0, 8_000) || null;
  }

  return null;
}

function buildFallbackInsight(args: {
  mediaType: "audio" | "image" | "document";
  mimeType?: string;
  fileName?: string;
  fallbackContent: string;
}) {
  if (args.mediaType === "audio") {
    return {
      transcript: `Voice note received (${args.mimeType ?? "unknown format"}).`,
      summary: undefined,
      extractedText: undefined,
    };
  }

  if (args.mediaType === "image") {
    return {
      transcript: undefined,
      summary:
        args.fallbackContent.trim() && !args.fallbackContent.startsWith("[")
          ? args.fallbackContent
          : `Image received (${args.mimeType ?? "unknown image"}).`,
      extractedText: undefined,
    };
  }

  return {
    transcript: undefined,
    summary: args.fileName
      ? `Document received: ${args.fileName}.`
      : `Document received (${args.mimeType ?? "unknown document"}).`,
    extractedText: undefined,
  };
}

async function processWhatsappMediaHandler(
  ctx: ActionCtx,
  args: {
    mediaId: string;
  },
) {
  const runtime = await ctx.runQuery(internal.media.getQueuedWhatsappMediaRuntime, {
    mediaId: args.mediaId as never,
  });

  if (!runtime || !runtime.accessTokenEncrypted) {
    return { status: "noop", reason: "missing_runtime" };
  }

  if (runtime.downloadDeadlineAt < Date.now()) {
    await ctx.runMutation(internal.media.applyFailedWhatsappMediaMutation, {
      mediaId: runtime.mediaId,
      error: "Media download deadline expired before processing.",
      expired: true,
    });

    return { status: "expired" as const };
  }

  try {
    const accessToken = await decryptSecret(runtime.accessTokenEncrypted);

    if (!accessToken) {
      throw new Error("WhatsApp media access token could not be decrypted.");
    }

    const metadata = await fetchMetaMediaMetadata({
      providerMediaId: runtime.providerMediaId,
      accessToken,
    });

    if (!metadata.url) {
      throw new Error("Meta media metadata did not include a download URL.");
    }

    const binary = await downloadMetaMediaBinary({
      mediaUrl: metadata.url,
      accessToken,
    });
    const mimeType = metadata.mime_type ?? "application/octet-stream";
    const objectKey = buildObjectKey({
      organizationId: runtime.organizationId.toString(),
      mediaId: runtime.mediaId.toString(),
      mediaType: runtime.mediaType,
      mimeType,
    });
    const upload = await uploadObjectStorage({
      objectKey,
      body: binary,
      contentType: mimeType,
    });

    let transcript: string | undefined;
    let summary: string | undefined;
    let extractedText: string | undefined;

    if (runtime.mediaType === "audio") {
      transcript =
        (await generateGeminiInlineText({
          prompt:
            "Transcribe this WhatsApp voice note. Reply only with the transcript in the original language.",
          mimeType,
          body: binary,
        })) ?? undefined;
    }

    if (runtime.mediaType === "image") {
      summary =
        (await generateGeminiInlineText({
          prompt:
            "Summarize this WhatsApp customer image for a support agent in one short paragraph. Mention visible products, receipts, screenshots, or order details when present.",
          mimeType,
          body: binary,
        })) ?? undefined;
    }

    if (runtime.mediaType === "document") {
      extractedText = extractPlainText(binary, mimeType) ?? undefined;
      if (!extractedText) {
        summary =
          (await generateGeminiInlineText({
            prompt:
              "Summarize this WhatsApp customer document for a support agent. Mention important names, amounts, dates, SKUs, or troubleshooting details if visible.",
            mimeType,
            body: binary,
          })) ?? undefined;
      }
    }

    if (!transcript && !summary && !extractedText) {
      const fallback = buildFallbackInsight({
        mediaType: runtime.mediaType,
        mimeType,
        fileName: runtime.fileName,
        fallbackContent: runtime.transcriptFallbackContent,
      });
      transcript = fallback.transcript;
      summary = fallback.summary;
      extractedText = fallback.extractedText;
    }

    await ctx.runMutation(internal.media.applyProcessedWhatsappMediaMutation, {
      mediaId: runtime.mediaId,
      mimeType,
      fileName: runtime.fileName,
      fileSizeBytes: metadata.file_size,
      storageObjectKey: upload.objectKey,
      storageProvider: upload.configured ? "s3_compatible" : undefined,
      mediaSha256: metadata.sha256,
      transcript,
      summary,
      extractedText,
      storageConfigured: upload.configured,
    });

    return {
      status: "processed" as const,
      storageConfigured: upload.configured,
      hasTranscript: Boolean(transcript),
      hasSummary: Boolean(summary || extractedText),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const expired = message.toLowerCase().includes("deadline");

    await ctx.runMutation(internal.media.applyFailedWhatsappMediaMutation, {
      mediaId: runtime.mediaId,
      error: message,
      expired,
    });

    return {
      status: "failed" as const,
      error: message,
    };
  }
}

export const processWhatsappMedia = internalAction({
  args: {
    mediaId: v.id("whatsappMedia"),
  },
  handler: processWhatsappMediaHandler,
});
