import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DocPage } from '@/features/public-site/docs-content';

export function DocPageView({ page }: { page: DocPage }) {
  return (
    <article className='space-y-10'>
      <header className='space-y-4 border-b border-gray-200 pb-8'>
        <p className='text-sm font-semibold tracking-[0.24em] text-violet-600 uppercase'>
          {page.eyebrow}
        </p>
        <div className='space-y-3'>
          <h1 className='text-4xl font-semibold tracking-tight text-gray-900'>{page.title}</h1>
          <p className='max-w-3xl text-lg leading-8 text-gray-600'>{page.intro}</p>
        </div>
      </header>

      <section className='grid gap-4 md:grid-cols-3'>
        {page.highlights.map((highlight) => (
          <Card key={highlight} className='border-gray-200 bg-white'>
            <CardHeader className='pb-3'>
              <CardTitle className='text-base leading-6 text-gray-900'>Key point</CardTitle>
            </CardHeader>
            <CardContent className='pt-0 text-sm leading-6 text-gray-600'>
              {highlight}
            </CardContent>
          </Card>
        ))}
      </section>

      <section className='space-y-8'>
        {page.sections.map((section) => (
          <div key={section.title} className='space-y-3'>
            <h2 className='text-2xl font-semibold tracking-tight text-gray-900'>{section.title}</h2>
            <div className='space-y-3 text-base leading-7 text-gray-600'>
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
        ))}
      </section>

      <div className='flex flex-wrap gap-3 border-t border-gray-200 pt-8'>
        <Button asChild variant='secondary'>
          <Link href='/pricing'>View pricing</Link>
        </Button>
        <Button asChild variant='outline'>
          <Link href='/auth/sign-in'>Open your workspace</Link>
        </Button>
      </div>
    </article>
  );
}
