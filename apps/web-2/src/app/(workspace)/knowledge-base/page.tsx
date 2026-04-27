import PageContainer from '@/components/layout/page-container';
import { BotStudioShell } from '@/features/bot-studio/components/bot-studio-shell';
import { KnowledgeBaseManager } from '@/features/bot-studio/components/knowledge-base-manager';

export const metadata = {
  title: 'Dashboard: Knowledge Base'
};

export default function Page() {
  return (
    <PageContainer
      pageTitle='Knowledge Base'
      pageDescription='Manage the documents and data the bot uses.'
    >
      <BotStudioShell>
        <KnowledgeBaseManager />
      </BotStudioShell>
    </PageContainer>
  );
}
