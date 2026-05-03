"use client";

import { useMemo, useState } from "react";
import { Icons } from "@/components/icons";
import { motion } from "motion/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Conversation } from "../utils/types";

const statusDotColor = {
  online: "bg-green-500",
  offline: "bg-red-500",
} as const;

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string;
  highlightedId?: string;
  onSelect: (id: string) => void;
}

export function ConversationList({
  conversations,
  selectedId,
  highlightedId,
  onSelect,
}: ConversationListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">(
    "all",
  );
  const [ownerFilter, setOwnerFilter] = useState<"all" | "bot" | "handoff">(
    "all",
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return conversations.filter((conversation) => {
      const matchesSearch =
        !search.trim() ||
        conversation.name.toLowerCase().includes(q) ||
        conversation.title.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "open" && conversation.serviceWindowOpen) ||
        (statusFilter === "closed" && !conversation.serviceWindowOpen);
      const matchesOwner =
        ownerFilter === "all" ||
        (ownerFilter === "handoff" && conversation.handoffRequested) ||
        (ownerFilter === "bot" && !conversation.handoffRequested);

      return matchesSearch && matchesStatus && matchesOwner;
    });
  }, [conversations, ownerFilter, search, statusFilter]);

  return (
    <div className="border-border/40 bg-background/75 hidden h-full flex-col gap-4 overflow-hidden rounded-2xl border p-3 backdrop-blur lg:col-start-1 lg:col-end-2 lg:flex lg:rounded-3xl lg:p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-foreground text-sm font-semibold">Messenger</p>
          <p className="text-muted-foreground text-xs">
            {conversations.length} active conversation
            {conversations.length === 1 ? "" : "s"}
          </p>
        </div>
        <Badge
          variant="outline"
          className="bg-primary/15 text-primary hover:bg-primary/15 hover:text-primary border-border/50 rounded-full border px-3 py-1 text-[0.7rem] tracking-[0.24em] uppercase"
        >
          Live
        </Badge>
      </div>

      <label htmlFor="messenger-search" className="sr-only">
        Search conversations
      </label>
      <div className="relative">
        <Icons.search
          className="text-muted-foreground/70 pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          id="messenger-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search conversations"
          className="border-border/40 bg-background/60 text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-primary/40 w-full rounded-2xl pl-10 text-sm focus-visible:ring-2"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as typeof statusFilter)
          }
          className="border-border/40 bg-background/60 rounded-xl border px-3 py-2 text-xs"
        >
          <option value="all">All windows</option>
          <option value="open">Open window</option>
          <option value="closed">Closed window</option>
        </select>
        <select
          value={ownerFilter}
          onChange={(event) =>
            setOwnerFilter(event.target.value as typeof ownerFilter)
          }
          className="border-border/40 bg-background/60 rounded-xl border px-3 py-2 text-xs"
        >
          <option value="all">Bot + handoff</option>
          <option value="bot">Bot active</option>
          <option value="handoff">Handoff</option>
        </select>
      </div>

      <div
        className="flex-1 space-y-2 overflow-y-auto pr-1"
        aria-label="Conversation list"
        role="list"
      >
        {filtered.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-xs">
            No conversations found
          </p>
        ) : null}
        {filtered.map((conversation) => {
          const isActive = conversation.id === selectedId;
          const isHighlighted = conversation.id === highlightedId;
          return (
            <motion.button
              key={conversation.id}
              type="button"
              onClick={() => onSelect(conversation.id)}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "focus-visible:ring-primary/50 group focus-visible:ring-offset-background relative flex w-full items-start gap-3 rounded-2xl border border-transparent p-3 text-left transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                isActive
                  ? "border-primary/40 bg-primary/10"
                  : "bg-background/70 hover:border-border/40 hover:bg-muted/40",
                isHighlighted &&
                  "ring-primary/30 shadow-primary/20 ring-2 shadow-lg",
              )}
              role="listitem"
            >
              <div className="relative shrink-0">
                <Avatar className="border-border/40 bg-background/80 text-foreground h-10 w-10 rounded-2xl border">
                  <AvatarFallback className="bg-primary/15 text-primary rounded-2xl text-sm font-medium">
                    {conversation.initials}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={cn(
                    "border-background absolute right-0 bottom-0 inline-flex h-3 w-3 rounded-full border-2",
                    statusDotColor[conversation.status],
                  )}
                  aria-label={
                    conversation.status === "online" ? "Online" : "Offline"
                  }
                />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground text-sm font-semibold">
                      {conversation.name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {conversation.title}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[0.65rem]",
                          conversation.serviceWindowOpen
                            ? "bg-emerald-500/15 text-emerald-700"
                            : "bg-rose-500/15 text-rose-700",
                        )}
                      >
                        {conversation.serviceWindowOpen
                          ? "Open window"
                          : "Closed window"}
                      </span>
                      <span className="bg-muted rounded-full px-2 py-0.5 text-[0.65rem]">
                        {conversation.handoffRequested
                          ? "Handoff"
                          : "Bot active"}
                      </span>
                    </div>
                  </div>
                  {conversation.lastMessageTimestamp && (
                    <span className="text-muted-foreground shrink-0 text-[0.65rem]">
                      {conversation.lastMessageTimestamp}
                    </span>
                  )}
                </div>
                {conversation.lastMessagePreview ? (
                  <p className="text-muted-foreground line-clamp-2 text-xs">
                    {conversation.lastMessagePreview}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    No messages yet
                  </p>
                )}
              </div>
              {conversation.unread > 0 && (
                <span className="bg-primary text-primary-foreground ml-2 inline-flex min-h-[1.5rem] min-w-[1.5rem] items-center justify-center rounded-full text-[0.7rem] font-semibold shadow-lg">
                  {conversation.unread}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
