type ObservabilityEvent = {
  organizationId: string;
  provider: string;
  model: string;
  promptVersionId: string;
  guardrailTriggered: boolean;
  ragChunkCount: number;
  promptPreview: string;
  responsePreview: string;
};

function redactPreview(value: string) {
  return value.replace(/\b\d{8,}\b/g, "[redacted-number]").slice(0, 280);
}

export function buildObservabilityPayload(event: ObservabilityEvent) {
  return {
    organizationId: event.organizationId,
    provider: event.provider,
    model: event.model,
    promptVersionId: event.promptVersionId,
    guardrailTriggered: event.guardrailTriggered,
    ragChunkCount: event.ragChunkCount,
    promptPreview: redactPreview(event.promptPreview),
    responsePreview: redactPreview(event.responsePreview),
  };
}

export async function emitObservabilityEvent(event: ObservabilityEvent) {
  const payload = buildObservabilityPayload(event);

  if (process.env.AXIOM_API_TOKEN && process.env.AXIOM_DATASET) {
    try {
      await fetch(
        `https://api.axiom.co/v1/datasets/${process.env.AXIOM_DATASET}/ingest`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.AXIOM_API_TOKEN}`,
            "Content-Type": "application/json",
          },

          body: JSON.stringify([payload]),
        },
      );
      console.info("Berhasil nembak ke Axiom!");
      return { delivered: true, payload };
    } catch (error) {
      console.error("Gagal ngirim log ke Axiom:", error);
      return { delivered: false, payload };
    }
  }

  console.info("ai_observability_event (local only)", payload);
  return { delivered: false, payload };
}
