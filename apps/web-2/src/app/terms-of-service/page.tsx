import { legalDocuments } from '@/features/auth/components/auth-legal-content';
import { createPageMetadata } from '@/lib/metadata';

export const metadata = createPageMetadata({
  title: 'Terms of Service',
  description: legalDocuments.terms.summary,
  path: '/terms-of-service'
});

export default function TermsOfServicePage() {
  const termsDocument = legalDocuments.terms;

  return (
    <div className='min-h-screen px-4 py-12 sm:px-6 lg:px-8'>
      <div className='mx-auto max-w-3xl space-y-8'>
        <div className='text-center'>
          <h1 className='text-foreground text-3xl font-bold'>{termsDocument.title}</h1>
          <p className='text-muted-foreground mt-2 text-sm'>Last updated: {termsDocument.updatedAt}</p>
        </div>

        <p className='text-muted-foreground text-base leading-relaxed'>{termsDocument.summary}</p>

        {termsDocument.sections.map((section) => (
          <section key={section.title} className='space-y-3'>
            <h2 className='text-foreground text-xl font-semibold'>{section.title}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className='text-muted-foreground text-base leading-relaxed'>
                {paragraph}
              </p>
            ))}
          </section>
        ))}

        <section className='border-border border-t pt-4'>
          <p className='text-muted-foreground text-center text-sm'>{termsDocument.footer}</p>
        </section>
      </div>
    </div>
  );
}
