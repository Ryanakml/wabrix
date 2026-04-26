import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { KnowledgeBaseClient } from "../features/knowledge-base/components/knowledge-base-client";

const ingestKnowledgeSource = vi.fn(async () => ({
  sourceId: "source_123",
  title: "Shipping FAQ",
  chunkCount: 2,
  sourceVendor: "inline",
  status: "ready",
  pdfDeferred: false,
}));
const deleteKnowledgeSource = vi.fn(async () => ({ deleted: true }));
const knowledgeBaseState = {
  canManage: true,
  botConfigured: true,
  sources: [],
  recentUsageLogs: [],
};

vi.mock("convex/react", () => ({
  useQuery: () => knowledgeBaseState,
  useAction: () => ingestKnowledgeSource,
  useMutation: () => deleteKnowledgeSource,
}));

vi.mock("@wabrix/backend/convex/_generated/api", () => ({
  api: {
    knowledge: {
      getKnowledgeBaseState: {},
      deleteKnowledgeSource: {},
    },
    knowledgeActions: {
      ingestKnowledgeSource: {},
    },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Knowledge Base", () => {
  it("submits inline knowledge for ingestion", async () => {
    render(
      <KnowledgeBaseClient
        copy={{
          loading: "Loading",
          save: "Save source",
          savePending: "Saving",
          delete: "Delete source",
          deletePending: "Deleting",
          saveSuccess: "Knowledge source saved",
          sourceType: "Source type",
          inline: "Inline note",
          website: "Website",
          pdf: "PDF",
          title: "Title",
          titlePlaceholder: "Optional title override",
          websiteUrl: "Website URL",
          websiteUrlPlaceholder: "https://example.com/faq",
          inlineContent: "Inline content",
          inlineContentPlaceholder: "Paste business knowledge",
          pdfDeferred: "PDF deferred",
          configureBotFirst: "Configure Bot Profile first",
          emptyState: "No sources",
          sourceListTitle: "Saved sources",
          previewTitle: "Markdown preview",
          recentUsageTitle: "Recent usage",
          noPreview: "No preview",
          chunkCount: "Chunks",
          usageEmpty: "No usage yet",
          deleteSuccess: "Knowledge source deleted",
          blockedPrivateOrInternalUrl:
            "This URL points to a private or internal address and is blocked for security reasons.",
        }}
      />,
    );

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Shipping FAQ" },
    });
    fireEvent.change(screen.getByLabelText("Inline content"), {
      target: { value: "Orders ship every weekday." },
    });
    fireEvent.click(screen.getByText("Save source"));

    await waitFor(() => {
      expect(ingestKnowledgeSource).toHaveBeenCalledWith({
        sourceType: "inline",
        title: "Shipping FAQ",
        content: "Orders ship every weekday.",
        url: undefined,
      });
    });
  });
});
