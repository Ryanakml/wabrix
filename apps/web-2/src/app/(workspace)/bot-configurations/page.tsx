import PageContainer from '@/components/layout/page-container';
import { BotStudioShell } from '@/features/bot-studio/components/bot-studio-shell';
import { BotProfileForm } from '@/features/bot-studio/components/bot-profile-form';

export const metadata = {
  title: 'Dashboard: Bot Configuration'
};

export default function Page() {
  return (
    <PageContainer
      pageTitle='Bot Configuration'
      pageDescription='Configure the AI bot behavior and settings.'
    >
      <BotStudioShell>
        <BotProfileForm />
      </BotStudioShell>
    </PageContainer>
  );
}
