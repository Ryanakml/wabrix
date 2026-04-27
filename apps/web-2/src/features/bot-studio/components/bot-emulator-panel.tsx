'use client';

import { useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { toast } from 'sonner';
import { api } from '@wabrix/backend/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const DEFAULT_PROMPT = 'A customer asks about pricing, onboarding, and support hours.';
const EMPTY_RESPONSE = 'Run the emulator to preview a bot response.';

export function BotEmulatorPanel() {
  const studioState = useQuery(api.configuration.getBotStudioState, {});
  const previewBotReply = useAction(api.ai.previewBotReply);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [response, setResponse] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [meta, setMeta] = useState<{
    ragContextUsed: boolean;
    ragChunkCount: number;
    knowledgeSourceTitles: string[];
  }>({
    ragContextUsed: false,
    ragChunkCount: 0,
    knowledgeSourceTitles: []
  });

  const handleRun = async () => {
    if (isRunning) {
      return;
    }

    const nextPrompt = prompt.trim();
    if (!nextPrompt) {
      toast.error('Enter a prompt before running the emulator.');
      return;
    }

    setIsRunning(true);
    try {
      const preview = await previewBotReply({
        latestUserMessage: nextPrompt,
        history: []
      });
      setResponse(preview.content);
      setMeta({
        ragContextUsed: preview.ragContextUsed,
        ragChunkCount: preview.ragChunkCount,
        knowledgeSourceTitles: preview.knowledgeSourceTitles
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message.replace(/Uncaught Error:\s*/gi, '') : 'Failed to run emulator.';
      setResponse(`Error: ${message}`);
      setMeta({
        ragContextUsed: false,
        ragChunkCount: 0,
        knowledgeSourceTitles: []
      });
      toast.error(message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bot Emulator</CardTitle>
        <p className='text-muted-foreground text-sm'>
          Test the active bot profile and knowledge retrieval without sending live messages.
        </p>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='space-y-2'>
          <label className='text-sm font-medium'>User Prompt</label>
          <Textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder='Ask the bot a question...'
            rows={6}
          />
        </div>

        <div className='flex items-center justify-between gap-3'>
          <Button
            type='button'
            onClick={handleRun}
            isLoading={isRunning}
            disabled={studioState === undefined}
          >
            Run
          </Button>
          <span className='text-muted-foreground text-xs'>
            {studioState?.state.modelId ?? 'Loading model...'}
          </span>
        </div>

        <Separator />

        <div className='space-y-3'>
          <div className='text-sm font-medium'>Response</div>
          <div className='bg-muted min-h-52 rounded-lg border p-4 text-sm whitespace-pre-wrap'>
            {response || EMPTY_RESPONSE}
          </div>
        </div>

        <div className='space-y-3'>
          <div className='flex items-center justify-between gap-3'>
            <div className='text-sm font-medium'>Knowledge Retrieval</div>
            <Badge variant={meta.ragContextUsed ? 'default' : 'secondary'}>
              {meta.ragContextUsed ? `${meta.ragChunkCount} chunks used` : 'No matches'}
            </Badge>
          </div>
          {meta.knowledgeSourceTitles.length > 0 ? (
            <div className='flex flex-wrap gap-2'>
              {meta.knowledgeSourceTitles.map((title) => (
                <Badge key={title} variant='outline'>
                  {title}
                </Badge>
              ))}
            </div>
          ) : (
            <p className='text-muted-foreground text-sm'>No knowledge sources were used.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
