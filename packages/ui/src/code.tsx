import type { PropsWithChildren } from "react";

export function Code({ children }: PropsWithChildren) {
  return (
    <code className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-current">
      {children}
    </code>
  );
}
