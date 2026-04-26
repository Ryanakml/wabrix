import { cookies } from "next/headers";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const localePromise = params;

  return (
    // Server components can suspend on params in App Router.
    <DashboardLayoutInner localePromise={localePromise}>{children}</DashboardLayoutInner>
  );
}

async function DashboardLayoutInner({
  children,
  localePromise,
}: {
  children: React.ReactNode;
  localePromise: Promise<{ locale: string }>;
}) {
  await localePromise;
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <DashboardShell defaultOpen={defaultOpen}>
      {children}
    </DashboardShell>
  );
}
