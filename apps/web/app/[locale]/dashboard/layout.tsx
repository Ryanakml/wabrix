import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";

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
  const { locale } = await localePromise;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-14 items-center justify-between border-b px-6">
        <div className="flex items-center gap-4">
          <span className="font-semibold">Dashboard</span>
          <OrganizationSwitcher 
            hidePersonal={true} 
            afterCreateOrganizationUrl={`/${locale}/dashboard`}
            afterLeaveOrganizationUrl={`/${locale}/onboarding`}
            afterSelectOrganizationUrl={`/${locale}/dashboard`} 
          />
        </div>
        <div>
          <UserButton />
        </div>
      </header>
      <main className="flex-1 overflow-auto bg-muted/20">
        {children}
      </main>
    </div>
  );
}
