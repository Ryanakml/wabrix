import { DashboardShell } from '@/components/layout/dashboard-shell';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Manage your Wabrix workspace, billing, inbox, and WhatsApp operations.',
  robots: {
    index: false,
    follow: false
  }
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true';
  return <DashboardShell defaultOpen={defaultOpen}>{children}</DashboardShell>;
}
