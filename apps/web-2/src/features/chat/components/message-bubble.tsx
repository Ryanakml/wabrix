"use client";

import { Icons } from "@/components/icons";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { FilePreview } from "@/components/ui/file-preview";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Message } from "../utils/types";

interface MessageBubbleProps {
  message: Message;
  isFocused?: boolean;
}

function resolveAudioSourceType(mimeType?: string | null) {
  if (!mimeType) {
    return "audio/ogg";
  }

  return mimeType === "audio/ogg" ? "audio/ogg; codecs=opus" : mimeType;
}

export function MessageBubble({
  message,
  isFocused = false,
}: MessageBubbleProps) {
  const shouldReduceMotion = useReducedMotion();
  const isUser = message.sender === "user";
  const isFailedOutbound = isUser && message.deliveryState === "failed";
  const failureReason =
    message.failureMessage ?? message.failureCode ?? "Message failed to send.";

  return (
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
          "relative max-w-[85%] rounded-xl border px-3 py-2 text-xs leading-relaxed sm:max-w-[82%] sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm",
          isUser
            ? "border-primary/40 bg-primary text-primary-foreground ml-auto"
            : "bg-muted border-transparent",
          isFailedOutbound &&
            "border-destructive/70 bg-destructive/10 text-foreground",
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
              "break-words whitespace-pre-wrap mt-1 text-[0.875rem] sm:text-[0.95rem]",
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
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-destructive inline-flex items-center justify-center"
                  aria-label="Why the message failed"
                >
                  <Icons.info className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8} className="max-w-64 whitespace-pre-wrap">
                {failureReason}
              </TooltipContent>
            </Tooltip>
          ) : isUser ? (
            <Icons.checks
              className="text-primary-foreground/80 h-3 w-3 sm:h-3.5 sm:w-3.5"
              aria-hidden="true"
            />
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
