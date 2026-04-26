import type { ReactNode } from "react";
import { PublicShell } from "@/components/marketing/public-shell";

export default function MarketingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <PublicShell>{children}</PublicShell>;
}
