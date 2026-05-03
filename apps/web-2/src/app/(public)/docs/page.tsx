import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createPageMetadata } from '@/lib/metadata';
import { docsPages } from '@/features/public-site/docs-content';

export const metadata = createPageMetadata({
  title: 'Docs',
  description: 'Get the setup steps and WhatsApp operational guides for Wabrix.',
  path: '/docs'
});

export default function DocsIndexPage() {
  const gettingStarted = docsPages.filter((page) => page.category === 'Getting started');
  const operations = docsPages.filter((page) => page.category === 'WhatsApp operations');

  return (
    <div className='space-y-10'>
      <header className='space-y-4 border-b border-gray-200 pb-8'>
        <p className='text-sm font-semibold tracking-[0.24em] text-violet-600 uppercase'>
          Documentation
        </p>
        <h1 className='text-4xl font-semibold tracking-tight text-gray-900'>Start fast, operate clearly.</h1>
        <p className='max-w-3xl text-lg leading-8 text-gray-600'>
          These guides focus on the parts that matter in production: workspace setup, WABA health,
          service-window rules, templates, and operational handoff.
        </p>
      </header>

      <section className='space-y-4'>
        <div className='space-y-2'>
          <h2 className='text-2xl font-semibold text-gray-900'>Getting started</h2>
          <p className='text-gray-600'>Use this first if your team is preparing the workspace.</p>
        </div>
        <div className='grid gap-4 md:grid-cols-2'>
          {gettingStarted.map((page) => (
            <Link key={page.href} href={page.href}>
              <Card className='h-full border-gray-200 bg-white transition hover:border-gray-300'>
                <CardHeader>
                  <CardTitle className='text-xl text-gray-900'>{page.title}</CardTitle>
                  <CardDescription className='leading-6'>{page.description}</CardDescription>
                </CardHeader>
                <CardContent className='pt-0 text-sm leading-6 text-gray-600'>
                  {page.intro}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className='space-y-4'>
        <div className='space-y-2'>
          <h2 className='text-2xl font-semibold text-gray-900'>WhatsApp operations</h2>
          <p className='text-gray-600'>
            Short references for approval state, service-window limits, and message-delivery prep.
          </p>
        </div>
        <div className='grid gap-4 xl:grid-cols-2'>
          {operations.map((page) => (
            <Link key={page.href} href={page.href}>
              <Card className='h-full border-gray-200 bg-white transition hover:border-gray-300'>
                <CardHeader>
                  <CardTitle className='text-xl text-gray-900'>{page.title}</CardTitle>
                  <CardDescription className='leading-6'>{page.description}</CardDescription>
                </CardHeader>
                <CardContent className='pt-0 text-sm leading-6 text-gray-600'>
                  {page.highlights[0]}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
