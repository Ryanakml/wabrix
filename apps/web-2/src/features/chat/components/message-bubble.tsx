"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/icons";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { formatBotErrorForDisplay } from "@/lib/bot-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FilePreview } from "@/components/ui/file-preview";
import type { Message } from "../utils/types";

interface MessageBubbleProps {
  message: Message;
  isFocused?: boolean;
}

type FailureResolution = {
  title: string;
  summary: string;
  ctaLabel: string;
  href: string;
};

function resolveAudioSourceType(mimeType?: string | null) {
  if (!mimeType) {
    return "audio/ogg";
  }

  return mimeType === "audio/ogg" ? "audio/ogg; codecs=opus" : mimeType;
}

function resolveFailureResolution(rawFailure: string): FailureResolution {
  const normalized = rawFailure.trim().toLowerCase();
  const botError = formatBotErrorForDisplay(rawFailure);

  if (
    normalized.includes("public test numbers") ||
    normalized.includes("hello world templates can only be sent")
  ) {
    return {
      title: "Use a production template",
      summary:
        "Template hello_world hanya bisa dipakai dari Meta public test number. Gunakan template lain yang memang approved untuk nomor WhatsApp ini.",
      ctaLabel: "Manage templates",
      href: "/whatsapp-integration#manage-templates",
    };
  }

  if (
    normalized.includes("approval pending") ||
    normalized.includes("meta approval is still pending") ||
    normalized.includes("finish the whatsapp integration setup")
  ) {
    return {
      title: "Finish WhatsApp setup",
      summary:
        "Integration ini belum siap kirim template. Selesaikan approval dan setup WhatsApp Integration dulu.",
      ctaLabel: "Open WhatsApp integration",
      href: "/whatsapp-integration",
    };
  }

  if (
    normalized.includes("phone number") ||
    normalized.includes("verification") ||
    normalized.includes("access token") ||
    normalized.includes("authentication")
  ) {
    return {
      title: "Review sender configuration",
      summary:
        "Ada masalah di nomor pengirim atau credential WhatsApp. Cek phone number, verification, dan access token di WhatsApp Integration.",
      ctaLabel: "Open WhatsApp integration",
      href: "/whatsapp-integration",
    };
  }

  if (
    normalized.includes("template") &&
    (normalized.includes("approved") ||
      normalized.includes("rejected") ||
      normalized.includes("paused") ||
      normalized.includes("does not exist") ||
      normalized.includes("missing"))
  ) {
    return {
      title: "Check the template setup",
      summary:
        "Template yang dipilih belum siap dipakai. Sync template dari Meta dan pastikan statusnya approved untuk nomor ini.",
      ctaLabel: "Manage templates",
      href: "/whatsapp-integration#manage-templates",
    };
  }

  if (botError?.kind === "ai_tokens_exhausted") {
    return {
      title: "Upgrade workspace plan",
      summary:
        "Bot gagal kirim karena AI token workspace habis. Cek billing workspace lalu upgrade plan bila perlu.",
      ctaLabel: "Open billing",
      href: "/dashboard/billing",
    };
  }

  if (
    botError ||
    normalized.includes("bot") ||
    normalized.includes("model") ||
    normalized.includes("provider") ||
    normalized.includes("prompt") ||
    normalized.includes("knowledge")
  ) {
    return {
      title: "Review bot configuration",
      summary:
        "Ada error di jalur bot atau AI runtime. Cek Bot Configurations dan knowledge setup sebelum lanjut.",
      ctaLabel: "Open bot configuration",
      href: "/bot-configurations",
    };
  }

  return {
    title: "Check message delivery setup",
    summary:
      "Pesan gagal terkirim dari jalur outbound. Cek integration WhatsApp, template, dan status nomor pengirim.",
    ctaLabel: "Open WhatsApp integration",
    href: "/whatsapp-integration",
  };
}

export function MessageBubble({
  message,
  isFocused = false,
}: MessageBubbleProps) {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const [isFailureDialogOpen, setIsFailureDialogOpen] = useState(false);
  const isUser = message.sender === "user";
  const isFailedOutbound = isUser && message.deliveryState === "failed";
  const failureReason =
    message.failureMessage ?? message.failureCode ?? "Message failed to send.";
  const failureResolution = useMemo(
    () => resolveFailureResolution(failureReason),
    [failureReason],
  );

  return (
    <>
      <motion.div
        data-message-id={message.id}
        initial={shouldReduceMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
        animate={
          shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }
        }
        exit={{ opacity: 0, y: 0 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className="flex flex-col gap-1"
        role="group"
        aria-label={message.author + " at " + message.timestamp}
      >
        <div
          className={cn(
            "flex items-end gap-2",
            isUser ? "justify-end" : "justify-start",
          )}
        >
          <div
            className={cn(
              "relative max-w-[85%] rounded-xl border px-3 py-2 text-xs leading-relaxed sm:max-w-[82%] sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm",
              isUser
                ? "border-primary/40 bg-primary text-primary-foreground ml-auto"
                : "bg-muted border-transparent",
              isFailedOutbound &&
                "border-destructive/75 bg-destructive/10 text-foreground shadow-[0_0_0_1px_rgba(220,38,38,0.08)]",
              isFocused && "ring-primary/40 shadow-primary/20 ring-2 shadow-xl",
            )}
          >
            {isFailedOutbound ? (
              <div className="bg-destructive absolute inset-x-4 top-0 h-0.5 rounded-full" />
            ) : null}
            <p
              className={cn(
                "font-medium sm:text-sm",
                isFailedOutbound
                  ? "text-foreground/80"
                  : isUser
                    ? "text-primary-foreground/80"
                    : "text-foreground/80",
              )}
            >
              {message.author}
            </p>
            {message.contentType === "image" && message.imageUrl ? (
              <a
                href={message.imageUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 block overflow-hidden rounded-xl border bg-background/60"
              >
                <img
                  src={message.imageUrl}
                  alt={message.mediaFileName ?? "Customer image"}
                  loading="lazy"
                  className="max-h-80 w-full object-cover"
                />
              </a>
            ) : null}
            {message.text && (
              <p
                className={cn(
                  "mt-1 break-words whitespace-pre-wrap text-[0.875rem] sm:text-[0.95rem]",
                  isFailedOutbound
                    ? "text-foreground"
                    : isUser
                      ? "text-primary-foreground/90"
                      : "text-foreground/90",
                )}
              >
                {message.text}
              </p>
            )}
            {message.contentType === "audio" && message.audioUrl ? (
              <div
                className={cn(
                  "mt-2 rounded-xl border px-3 py-2",
                  isUser
                    ? "border-primary-foreground/20 bg-primary-foreground/10"
                    : "bg-background/60",
                  isFailedOutbound &&
                    "border-destructive/20 bg-background/80",
                )}
              >
                <div className="mb-2 flex items-center gap-2 text-[0.75rem]">
                  <span>{message.mediaFileName ?? "Voice note"}</span>
                </div>
                <audio controls preload="metadata" className="h-10 w-full">
                  <source
                    src={message.audioUrl}
                    type={resolveAudioSourceType(message.audioMimeType)}
                  />
                </audio>
                <a
                  href={message.audioUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    "mt-2 inline-flex text-[0.75rem] underline underline-offset-2",
                    isFailedOutbound
                      ? "text-foreground/75"
                      : isUser
                        ? "text-primary-foreground/85"
                        : "text-foreground/75",
                  )}
                >
                  Open audio file
                </a>
              </div>
            ) : null}
            {message.attachments && message.attachments.length > 0 && (
              <FilePreview
                files={message.attachments.map((a) => ({
                  id: a.id,
                  name: a.name,
                  type: a.type,
                }))}
                variant={isUser ? "inverted" : "default"}
                className="mt-1 p-0"
              />
            )}
            <div className="mt-2 flex items-center justify-end gap-1.5 text-[0.65rem] sm:mt-3 sm:gap-2 sm:text-[0.7rem]">
              <span
                className={cn(
                  "text-muted-foreground",
                  !isFailedOutbound && isUser && "text-primary-foreground/80",
                )}
              >
                {message.timestamp}
              </span>
              {isFailedOutbound ? (
                <Icons.alertCircle
                  className="text-destructive h-3.5 w-3.5 sm:h-4 sm:w-4"
                  aria-hidden="true"
                />
              ) : isUser ? (
                <Icons.checks
                  className="text-primary-foreground/80 h-3 w-3 sm:h-3.5 sm:w-3.5"
                  aria-hidden="true"
                />
              ) : null}
            </div>
          </div>
          {isFailedOutbound ? (
            <div className="mb-7 shrink-0">
              <button
                type="button"
                className="border-destructive/50 text-destructive bg-background hover:bg-destructive/5 inline-flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition-colors"
                aria-label="Open message failure details"
                onClick={() => setIsFailureDialogOpen(true)}
              >
                <Icons.info
                  className="h-4 w-4 sm:h-[1.1rem] sm:w-[1.1rem]"
                  aria-hidden="true"
                />
              </button>
            </div>
          ) : null}
        </div>
        {isFailedOutbound ? (
          <div className="pr-11 text-right">
            <p className="text-destructive text-[0.72rem] font-medium sm:text-xs">
              Not delivered
            </p>
          </div>
        ) : null}
      </motion.div>

      <Dialog open={isFailureDialogOpen} onOpenChange={setIsFailureDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="bg-destructive/10 text-destructive inline-flex h-8 w-8 items-center justify-center rounded-full">
                <Icons.alertCircle className="h-4 w-4" aria-hidden="true" />
              </span>
              Message not delivered
            </DialogTitle>
            <DialogDescription>
              Pesan ini gagal terkirim ke WhatsApp. Buka detailnya lalu lanjut ke halaman yang relevan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="border-destructive/20 bg-destructive/5 rounded-2xl border p-4">
              <p className="text-foreground text-sm font-medium">
                {failureResolution.title}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                {failureResolution.summary}
              </p>
            </div>

            <div className="bg-muted/40 rounded-2xl border p-4">
              <p className="text-foreground text-sm font-medium">Error detail</p>
              <p className="text-muted-foreground mt-1 whitespace-pre-wrap text-sm">
                {failureReason}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsFailureDialogOpen(false)}
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={() => {
                setIsFailureDialogOpen(false);
                router.push(failureResolution.href);
              }}
            >
              {failureResolution.ctaLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
