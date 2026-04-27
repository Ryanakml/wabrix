import type { ReactNode } from 'react';
import { BotEmulatorPanel } from './bot-emulator-panel';

export function BotStudioShell({ children }: { children: ReactNode }) {
  return (
    <div className='grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]'>
      <div>{children}</div>
      <div className='xl:sticky xl:top-16 xl:self-start'>
        <BotEmulatorPanel />
      </div>
    </div>
  );
}
