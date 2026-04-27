"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@wabrix/backend/convex/_generated/api";
import { Button } from "@wabrix/ui/button";
import { toast } from "sonner";

type KnowledgeBaseClientProps = {
  copy: {
    loading: string;
    save: string;
    savePending: string;
    delete: string;
    deletePending: string;
    saveSuccess: string;
    sourceType: string;
    inline: string;
    website: string;
    pdf: string;
    title: string;
    titlePlaceholder: string;
    websiteUrl: string;
    websiteUrlPlaceholder: string;
    inlineContent: string;
    inlineContentPlaceholder: string;
    pdfDeferred: string;
    configureBotFirst: string;
    emptyState: string;
    sourceListTitle: string;
    previewTitle: string;
    recentUsageTitle: string;
    noPreview: string;
    chunkCount: string;
    usageEmpty: string;
    deleteSuccess: string;
    blockedPrivateOrInternalUrl: string;
  };
};

type SourceType = "inline" | "website" | "pdf";

type FormState = {
  sourceType: SourceType;
  title: string;
  url: string;
  content: string;
};

const emptyForm: FormState = {
  sourceType: "inline",
  title: "",
  url: "",
  content: "",
};

const isBlockedPrivateOrInternalUrlError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message
    .toLowerCase()
    .includes("private or internal urls are blocked");
};

export function KnowledgeBaseClient({ copy }: KnowledgeBaseClientProps) {
  const knowledgeState = useQuery(api.knowledge.getKnowledgeBaseState, {});
  const ingestKnowledgeSource = useAction(
    api.knowledgeActions.ingestKnowledgeSource,
  );
  const deleteKnowledgeSource = useMutation(
    api.knowledge.deleteKnowledgeSource,
  );
  const [form, setForm] = useState<FormState>(emptyForm);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [isDeleting, startDeleting] = useTransition();

  useEffect(() => {
    if (!knowledgeState?.sources.length) {
      setSelectedSourceId(null);
      return;
    }

    setSelectedSourceId((current) => {
      if (
        current &&
        knowledgeState.sources.some((source) => String(source.id) === current)
      ) {
        return current;
      }

      const firstSource = knowledgeState.sources[0];
      return firstSource ? String(firstSource.id) : null;
    });
  }, [knowledgeState]);

  const selectedSource =
    knowledgeState?.sources.find(
      (source) => String(source.id) === selectedSourceId,
    ) ?? null;

  const saveDisabled = useMemo(() => {
    if (
      !knowledgeState?.canManage ||
      !knowledgeState.botConfigured ||
      isSaving
    ) {
      return true;
    }

    if (form.sourceType === "pdf") {
      return true;
    }

    if (form.sourceType === "website") {
      return form.url.trim().length === 0;
    }

    return form.content.trim().length === 0;
  }, [form.content, form.sourceType, form.url, isSaving, knowledgeState]);

  if (knowledgeState === undefined) {
    return <p className="text-sm text-stone-600">{copy.loading}</p>;
  }

  const onFieldChange = <K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSave = () => {
    startSaving(async () => {
      try {
        const result = await ingestKnowledgeSource({
          sourceType: form.sourceType,
          title: form.title || undefined,
          content: form.sourceType === "inline" ? form.content : undefined,
          url: form.sourceType === "website" ? form.url : undefined,
        });

        toast.success(
          result.pdfDeferred
            ? copy.pdfDeferred
            : `${copy.saveSuccess} (${result.chunkCount})`,
        );
        setForm((current) => ({
          ...current,
          title: "",
          url: "",
          content: "",
        }));
      } catch (error) {
        if (isBlockedPrivateOrInternalUrlError(error)) {
          toast.error(copy.blockedPrivateOrInternalUrl);
          return;
        }

        toast.error(error instanceof Error ? error.message : copy.emptyState);
      }
    });
  };

  const handleDelete = () => {
    if (!selectedSource) {
      return;
    }

    startDeleting(async () => {
      try {
        await deleteKnowledgeSource({ sourceId: selectedSource.id });
        toast.success(copy.deleteSuccess);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : copy.emptyState);
      }
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-[1.75rem] border border-stone-300/70 bg-white/90 p-6 shadow-[0_24px_70px_rgba(24,37,31,0.08)]">
        <div className="grid gap-5">
          {!knowledgeState.botConfigured ? (
            <div className="rounded-3xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-950">
              {copy.configureBotFirst}
            </div>
          ) : null}

          <label className="grid gap-2">
            <span className="text-sm font-medium text-stone-700">
              {copy.sourceType}
            </span>
            <select
              className="rounded-2xl border border-stone-300 px-4 py-3"
              value={form.sourceType}
              onChange={(event) =>
                onFieldChange("sourceType", event.target.value as SourceType)
              }
            >
              <option value="inline">{copy.inline}</option>
              <option value="website">{copy.website}</option>
              <option value="pdf">{copy.pdf}</option>
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-stone-700">
              {copy.title}
            </span>
            <input
              className="rounded-2xl border border-stone-300 px-4 py-3"
              value={form.title}
              placeholder={copy.titlePlaceholder}
              onChange={(event) => onFieldChange("title", event.target.value)}
            />
          </label>

          {form.sourceType === "website" ? (
            <label className="grid gap-2">
              <span className="text-sm font-medium text-stone-700">
                {copy.websiteUrl}
              </span>
              <input
                className="rounded-2xl border border-stone-300 px-4 py-3"
                value={form.url}
                placeholder={copy.websiteUrlPlaceholder}
                onChange={(event) => onFieldChange("url", event.target.value)}
              />
            </label>
          ) : null}

          {form.sourceType === "inline" ? (
            <label className="grid gap-2">
              <span className="text-sm font-medium text-stone-700">
                {copy.inlineContent}
              </span>
              <textarea
                className="min-h-48 rounded-3xl border border-stone-300 px-4 py-3"
                value={form.content}
                placeholder={copy.inlineContentPlaceholder}
                onChange={(event) =>
                  onFieldChange("content", event.target.value)
                }
              />
            </label>
          ) : null}

          {form.sourceType === "pdf" ? (
            <div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 px-4 py-5 text-sm leading-7 text-stone-600">
              {copy.pdfDeferred}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={saveDisabled} onClick={handleSave}>
              {isSaving ? copy.savePending : copy.save}
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-6">
        <div className="rounded-[1.75rem] border border-stone-300/70 bg-[#101921] p-6 text-white shadow-[0_24px_70px_rgba(16,24,22,0.2)]">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">{copy.sourceListTitle}</h2>
            <Button
              variant="secondary"
              disabled={
                !selectedSource || isDeleting || !knowledgeState.canManage
              }
              onClick={handleDelete}
            >
              {isDeleting ? copy.deletePending : copy.delete}
            </Button>
          </div>

          <div className="mt-5 grid gap-3">
            {knowledgeState.sources.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-5 text-sm leading-7 text-stone-300">
                {copy.emptyState}
              </div>
            ) : (
              knowledgeState.sources.map((source) => {
                const active = String(source.id) === selectedSourceId;

                return (
                  <button
                    key={String(source.id)}
                    type="button"
                    className={`rounded-3xl border px-4 py-4 text-left transition ${
                      active
                        ? "border-cyan-300 bg-cyan-300/10"
                        : "border-white/10 bg-white/5 hover:bg-white/8"
                    }`}
                    onClick={() => setSelectedSourceId(String(source.id))}
                  >
                    <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.24em] text-stone-400">
                      <span>{source.sourceType}</span>
                      <span>{source.sourceVendor}</span>
                      <span>{source.status}</span>
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-white">
                      {source.title}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-stone-300">
                      {copy.chunkCount}: {source.chunkCount}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-stone-300/70 bg-white/90 p-6 shadow-[0_24px_70px_rgba(24,37,31,0.08)]">
          <h2 className="text-xl font-semibold text-stone-950">
            {copy.previewTitle}
          </h2>
          <div className="mt-5 rounded-3xl border border-stone-200 bg-stone-50 p-4">
            <pre className="whitespace-pre-wrap text-sm leading-7 text-stone-700">
              {selectedSource?.markdownContent || copy.noPreview}
            </pre>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-stone-300/70 bg-white/90 p-6 shadow-[0_24px_70px_rgba(24,37,31,0.08)]">
          <h2 className="text-xl font-semibold text-stone-950">
            {copy.recentUsageTitle}
          </h2>
          <div className="mt-5 grid gap-3">
            {knowledgeState.recentUsageLogs.length === 0 ? (
              <p className="text-sm leading-7 text-stone-600">
                {copy.usageEmpty}
              </p>
            ) : (
              knowledgeState.recentUsageLogs.map((log) => (
                <div
                  key={String(log.id)}
                  className="rounded-3xl border border-stone-200 bg-stone-50 px-4 py-4"
                >
                  <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.24em] text-stone-500">
                    <span>{log.queryLanguage}</span>
                    <span>{log.retrievalStrategy}</span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-stone-700">
                    {copy.chunkCount}: {log.matchedChunkCount}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
