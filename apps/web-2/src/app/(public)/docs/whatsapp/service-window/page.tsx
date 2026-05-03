import { DocPageView } from '@/components/public/doc-page';
import { getDocPage } from '@/features/public-site/docs-content';
import { createPageMetadata } from '@/lib/metadata';

const page = getDocPage('/docs/whatsapp/service-window');

export const metadata = createPageMetadata({
  title: page.title,
  description: page.description,
  path: page.href
});

export default function ServiceWindowDocsPage() {
  return <DocPageView page={page} />;
}
