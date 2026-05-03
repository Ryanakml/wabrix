import { legalDocuments } from '@/features/auth/components/auth-legal-content';
import { createPageMetadata } from '@/lib/metadata';

export const metadata = createPageMetadata({
  title: 'Privacy Policy',
  description: legalDocuments.privacy.summary,
  path: '/privacy-policy'
});

export default function PrivacyPolicyPage() {
  const privacyDocument = legalDocuments.privacy;

  return (
    <div className='min-h-screen px-4 py-12 sm:px-6 lg:px-8'>
      <div className='mx-auto max-w-3xl space-y-8'>
        <div className='space-y-2'>
          <h1 className='text-foreground text-3xl font-bold'>{privacyDocument.title}</h1>
          <p className='text-muted-foreground text-base leading-relaxed'>{privacyDocument.summary}</p>
        </div>

        {privacyDocument.sections.map((section) => (
          <section key={section.title} className='space-y-3'>
            <h2 className='text-foreground text-xl font-semibold'>{section.title}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className='text-muted-foreground text-base leading-relaxed'>
                {paragraph}
              </p>
            ))}
          </section>
        ))}

        <div className='border-border border-t pt-4'>
          <p className='text-muted-foreground text-sm'>
            Last updated: {privacyDocument.updatedAt}
          </p>
          <p className='text-muted-foreground mt-2 text-sm'>{privacyDocument.footer}</p>
        </div>
      </div>
    </div>
  );
}
