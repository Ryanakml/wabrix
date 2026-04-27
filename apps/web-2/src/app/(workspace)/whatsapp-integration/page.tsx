import PageContainer from '@/components/layout/page-container';
import { WhatsAppIntegrationSettings } from '@/features/whatsapp/components/whatsapp-integration-settings';

export const metadata = {
  title: 'Dashboard: WhatsApp Integration'
};

export default function Page() {
  const hasConvexRuntime = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);
  const webhookUrl = `${
    process.env.NEXT_PUBLIC_INGRESS_URL ?? 'http://localhost:8787'
  }/webhooks/whatsapp`;

  return (
    <PageContainer
      pageTitle='WhatsApp Integration'
      pageDescription='Connect and configure your WhatsApp Business account.'
    >
      {hasConvexRuntime ? (
        <WhatsAppIntegrationSettings webhookUrl={webhookUrl} />
      ) : (
        <div className='rounded-lg border px-4 py-3 text-sm'>
          Convex runtime is not configured for this environment.
        </div>
      )}
    </PageContainer>
  );
}
