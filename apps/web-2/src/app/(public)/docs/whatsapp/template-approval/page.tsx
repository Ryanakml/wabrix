import { DocPageView } from '@/components/public/doc-page';
import { getDocPage } from '@/features/public-site/docs-content';
import { createPageMetadata } from '@/lib/metadata';

const page = getDocPage('/docs/whatsapp/template-approval');

export const metadata = createPageMetadata({
  title: page.title,
  description: page.description,
  path: page.href
});

export default function TemplateApprovalDocsPage() {
  return <DocPageView page={page} />;
}
