import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { legalDocuments } from '@/features/auth/components/auth-legal-content';
import { createPageMetadata } from '@/lib/metadata';

const privacySections = legalDocuments.privacy.sections;
const termsSections = legalDocuments.terms.sections;

const securityHighlights = [
  {
    title: 'Authentication and workspace access',
    body:
      'Wabrix uses Clerk for sign-in flows, and organizations are the access boundary for shared workspace features such as inbox, billing, and configuration.'
  },
  {
    title: 'Protected application routes',
    body:
      'Clerk middleware protects dashboard and workspace routes before app content is served, while docs, pricing, security, and legal pages remain intentionally public.'
  },
  {
    title: 'Operational traceability',
    body:
      'The product and backend already rely on operational logs, recent billing events, and audit-style records to keep support, billing, and workflow actions reviewable.'
  },
  {
    title: 'WhatsApp policy boundaries',
    body:
      'Service-window rules and template workflows are treated as operational constraints. When the window closes, outbound messaging must move to approved templates.'
  },
  {
    title: 'Data use is feature-scoped',
    body:
      'Workspace data is used to authenticate users, render inbox and dashboard views, run WhatsApp flows, configure bots, retrieve knowledge, and support the features your team actually enables.'
  },
  {
    title: 'Admin responsibility stays explicit',
    body:
      'Teams are expected to limit sensitive data, manage consent, rotate credentials, and control who can access the workspace or connected integrations.'
  }
];

export const metadata = createPageMetadata({
  title: 'Security',
  description: 'Review how Wabrix handles authentication, route protection, data use, and operational visibility.',
  path: '/security'
});

export default function SecurityPage() {
  return (
    <div className='px-4 pb-24 sm:px-6 lg:px-8'>
      <div className='mx-auto flex max-w-6xl flex-col gap-10 pt-40'>
        <header className='space-y-4 border-b border-gray-200 pb-8'>
          <p className='text-sm font-semibold tracking-[0.24em] text-violet-600 uppercase'>
            Security
          </p>
          <h1 className='max-w-4xl text-4xl font-semibold tracking-tight text-gray-900 md:text-5xl'>
            Practical safeguards for teams running WhatsApp operations.
          </h1>
          <p className='max-w-3xl text-lg leading-8 text-gray-600'>
            Wabrix is designed for operational clarity: authenticated access, protected workspace
            routes, auditable activity, and explicit limits around messaging policy and downstream
            processing.
          </p>
        </header>

        <section className='grid gap-4 xl:grid-cols-3'>
          {securityHighlights.map((item) => (
            <Card key={item.title} className='border-gray-200 bg-white'>
              <CardHeader className='pb-3'>
                <CardTitle className='text-lg text-gray-900'>{item.title}</CardTitle>
              </CardHeader>
              <CardContent className='pt-0 text-sm leading-6 text-gray-600'>
                {item.body}
              </CardContent>
            </Card>
          ))}
        </section>

        <section className='grid gap-6 lg:grid-cols-2'>
          <Card className='border-gray-200 bg-white'>
            <CardHeader>
              <CardTitle className='text-2xl text-gray-900'>Data handling</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4 text-base leading-7 text-gray-600'>
              {privacySections
                .filter((section) =>
                  ['Data We Collect', 'How We Use Data', 'Processors and Integrations'].includes(
                    section.title
                  )
                )
                .map((section) => (
                  <div key={section.title} className='space-y-2'>
                    <h2 className='text-lg font-semibold text-gray-900'>{section.title}</h2>
                    {section.body.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                ))}
            </CardContent>
          </Card>

          <Card className='border-gray-200 bg-white'>
            <CardHeader>
              <CardTitle className='text-2xl text-gray-900'>Messaging and platform responsibility</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4 text-base leading-7 text-gray-600'>
              {termsSections
                .filter((section) =>
                  ['Customer Consent and Messaging Rules', 'Templates and Service Windows'].includes(
                    section.title
                  )
                )
                .map((section) => (
                  <div key={section.title} className='space-y-2'>
                    <h2 className='text-lg font-semibold text-gray-900'>{section.title}</h2>
                    {section.body.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
