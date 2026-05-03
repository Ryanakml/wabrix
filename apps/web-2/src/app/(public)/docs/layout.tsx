import { DocsSidebarNav } from '@/components/public/docs-sidebar-nav';

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className='px-4 pb-24 sm:px-6 lg:px-8'>
      <div className='mx-auto max-w-6xl pt-36'>
        <div className='mb-8 lg:hidden'>
          <DocsSidebarNav mobile />
        </div>
        <div className='grid gap-10 lg:grid-cols-[280px_minmax(0,1fr)]'>
          <aside className='hidden lg:block'>
            <div className='sticky top-28'>
              <DocsSidebarNav />
            </div>
          </aside>
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
}
