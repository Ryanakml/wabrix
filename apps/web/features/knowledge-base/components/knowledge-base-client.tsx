"use client";

import * as React from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@wabrix/backend/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Separator />
      <h3 className="text-muted-foreground pt-2 text-sm font-medium tracking-wide uppercase">
        {children}
      </h3>
    </div>
  );
}

const isBlockedPrivateOrInternalUrlError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message
    .toLowerCase()
    .includes("private or internal urls are blocked");
};

function formatDate(value: number) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export function KnowledgeBaseClient({ copy }: KnowledgeBaseClientProps) {
  const knowledgeState = useQuery(api.knowledge.getKnowledgeBaseState, {});
  const ingestKnowledgeSource = useAction(api.knowledgeActions.ingestKnowledgeSource);
  const deleteKnowledgeSource = useMutation(api.knowledge.deleteKnowledgeSource);
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
      if (current && knowledgeState.sources.some((source) => String(source.id) === current)) {
        return current;
      }

      const firstSource = knowledgeState.sources[0];
      return firstSource ? String(firstSource.id) : null;
    });
  }, [knowledgeState]);

  const selectedSource =
    knowledgeState?.sources.find((source) => String(source.id) === selectedSourceId) ?? null;

  const saveDisabled = useMemo(() => {
    if (!knowledgeState?.canManage || !knowledgeState.botConfigured || isSaving) {
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
    return <p className="px-4 py-2 text-sm text-muted-foreground md:px-6">{copy.loading}</p>;
  }

  const onFieldChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
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
          result.pdfDeferred ? copy.pdfDeferred : `${copy.saveSuccess} (${result.chunkCount})`,
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
    <div className="flex flex-1 flex-col px-4 pt-2 pb-4 md:px-6 md:pt-4">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Knowledge Base</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Add inline notes or websites, review stored markdown, and track recent retrieval usage.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Basic Form</CardTitle>
            <CardDescription>
              A comprehensive form demo with all field types.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {!knowledgeState.botConfigured ? (
                <div className="rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-950">
                  {copy.configureBotFirst}
                </div>
              ) : null}

              <SectionTitle>Text Inputs</SectionTitle>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <Label>{copy.title}</Label>
                  <Input
                    value={form.title}
                    placeholder={copy.titlePlaceholder}
                    onChange={(event) => onFieldChange("title", event.target.value)}
                  />
                </label>

                {form.sourceType === "website" ? (
                  <label className="grid gap-2">
                    <Label>{copy.websiteUrl}</Label>
                    <Input
                      type="url"
                      value={form.url}
                      placeholder={copy.websiteUrlPlaceholder}
                      onChange={(event) => onFieldChange("url", event.target.value)}
                    />
                  </label>
                ) : (
                  <label className="grid gap-2">
                    <Label>{copy.websiteUrl}</Label>
                    <Input value="" placeholder={copy.websiteUrlPlaceholder} disabled />
                  </label>
                )}
              </div>

              <SectionTitle>Textarea</SectionTitle>

              {form.sourceType === "inline" ? (
                <label className="grid gap-2">
                  <Label>{copy.inlineContent}</Label>
                  <Textarea
                    value={form.content}
                    placeholder={copy.inlineContentPlaceholder}
                    onChange={(event) => onFieldChange("content", event.target.value)}
                    className="min-h-48 rounded-3xl"
                  />
                </label>
              ) : (
                <label className="grid gap-2">
                  <Label>{copy.inlineContent}</Label>
                  <Textarea
                    value=""
                    placeholder={copy.inlineContentPlaceholder}
                    disabled
                    className="min-h-48 rounded-3xl"
                  />
                </label>
              )}

              <SectionTitle>Select & Combobox</SectionTitle>

              <label className="grid gap-2 md:max-w-sm">
                <Label>{copy.sourceType}</Label>
                <select
                  className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-lg border bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px]"
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

              <SectionTitle>File Upload</SectionTitle>

              <div className="space-y-3">
                <div
                  className={cn(
                    "rounded-xl border border-dashed p-6 text-sm transition",
                    form.sourceType === "pdf"
                      ? "border-border bg-muted/40 text-foreground"
                      : "border-border/70 bg-muted/20 text-muted-foreground",
                  )}
                >
                  <div className="flex flex-col items-center justify-center gap-2 text-center">
                    <p className="font-medium">Profile Picture</p>
                    <p className="text-muted-foreground max-w-sm text-sm">
                      Drag & drop or click to upload (max 5MB)
                    </p>
                    <Button type="button" variant="outline" disabled>
                      Choose file
                    </Button>
                  </div>
                </div>
                {form.sourceType === "pdf" ? (
                  <p className="text-muted-foreground text-sm">{copy.pdfDeferred}</p>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Switch source type to PDF to enable this placeholder section.
                  </p>
                )}
              </div>

              <Separator />
              <div className="flex gap-4 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setForm(emptyForm)}
                  className="flex-1"
                >
                  Reset
                </Button>
                <Button
                  type="button"
                  disabled={saveDisabled}
                  onClick={handleSave}
                  className="flex-1"
                >
                  {isSaving ? copy.savePending : copy.save}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6 xl:sticky xl:top-16 xl:self-start">
          <Card>
            <CardHeader>
              <CardTitle>{copy.sourceListTitle}</CardTitle>
              <CardDescription>Select a saved source to inspect its stored markdown.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                type="button"
                variant="outline"
                disabled={!selectedSource || isDeleting || !knowledgeState.canManage}
                onClick={handleDelete}
                className="w-full"
              >
                {isDeleting ? copy.deletePending : copy.delete}
              </Button>

              {knowledgeState.sources.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  {copy.emptyState}
                </div>
              ) : (
                knowledgeState.sources.map((source) => {
                  const active = String(source.id) === selectedSourceId;

                  return (
                    <button
                      key={String(source.id)}
                      type="button"
                      className={cn(
                        "w-full rounded-xl border p-3 text-left transition",
                        active
                          ? "border-primary/40 bg-primary/10"
                          : "hover:bg-muted/40 bg-background",
                      )}
                      onClick={() => setSelectedSourceId(String(source.id))}
                    >
                      <div className="flex flex-wrap items-center gap-2 text-[0.65rem] uppercase tracking-[0.24em] text-muted-foreground">
                        <span>{source.sourceType}</span>
                        <span>{source.sourceVendor}</span>
                        <span>{source.status}</span>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-foreground">{source.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {copy.chunkCount}: {source.chunkCount}
                      </p>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{copy.previewTitle}</CardTitle>
              <CardDescription>Read-only markdown preview of the selected source.</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted max-h-[22rem] overflow-auto rounded-lg p-4 text-xs whitespace-pre-wrap text-foreground">
                {selectedSource?.markdownContent || copy.noPreview}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{copy.recentUsageTitle}</CardTitle>
              <CardDescription>Latest retrieval events recorded for this workspace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {knowledgeState.recentUsageLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">{copy.usageEmpty}</p>
              ) : (
                knowledgeState.recentUsageLogs.map((log) => (
                  <div key={String(log.id)} className="rounded-xl border bg-muted/30 p-3">
                    <div className="flex flex-wrap items-center gap-2 text-[0.65rem] uppercase tracking-[0.24em] text-muted-foreground">
                      <span>{log.queryLanguage}</span>
                      <span>{log.retrievalStrategy}</span>
                    </div>
                    <p className="mt-2 text-sm text-foreground">
                      {copy.chunkCount}: {log.matchedChunkCount}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(log.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
