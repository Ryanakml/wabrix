"use client";

import type { ChatCopy } from "../utils/types";
import { Messenger } from "./messenger";

interface ChatViewPageProps {
  translationLanguage: "en" | "id";
  copy: ChatCopy;
}

export default function ChatViewPage({ translationLanguage, copy }: ChatViewPageProps) {
  return (
    <div className="flex min-h-0 flex-1 px-4 py-2 md:px-6">
      <Messenger translationLanguage={translationLanguage} copy={copy} />
    </div>
  );
}
