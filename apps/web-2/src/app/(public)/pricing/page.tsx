import { PricingPageView } from '@/features/public-site/pricing-page';
import { createPageMetadata } from '@/lib/metadata';

export const metadata = createPageMetadata({
  title: 'Pricing',
  description: 'Review Wabrix plans, switch billing country, and sign in before continuing to billing.',
  path: '/pricing'
});

export default function PricingPage() {
  return <PricingPageView />;
}
