import { DashboardShell } from '@/components/layout/dashboard-shell';
import { cookies } from 'next/headers';

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true';

  return <DashboardShell defaultOpen={defaultOpen}>{children}</DashboardShell>;
}
