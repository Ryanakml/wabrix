'use client';

import { FormEvent, useRef, useState } from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { FilePreview } from '@/components/ui/file-preview';
import type { Attachment, TemplateSuggestion } from '../utils/types';

interface MessageComposerProps {
  draft: string;
  onDraftChange: (text: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onSendTemplate: (templateId: string) => Promise<void>;
  onManageTemplates: () => void;
  contactName: string;
  quickReplies: string[];
  attachments: Attachment[];
  templateSuggestions: TemplateSuggestion[];
  onAddAttachments: (files: FileList) => void;
  onRemoveAttachment: (id: string) => void;
  templateOnlyMode?: boolean;
  disabled?: boolean;
  isSending?: boolean;
}

export function MessageComposer({
  draft,
  onDraftChange,
  onSubmit,
  onSendTemplate,
  onManageTemplates,
  contactName,
  quickReplies,
  attachments,
  templateSuggestions,
  onAddAttachments,
  onRemoveAttachment,
  templateOnlyMode = false,
  disabled = false,
  isSending = false
}: MessageComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [sendingTemplateId, setSendingTemplateId] = useState<string | null>(null);
  const composerLocked = disabled || isSending;
  const freeformDisabled = composerLocked || templateOnlyMode;
  const launcherDisabled = composerLocked || sendingTemplateId !== null;

  const handleTemplateSend = async (templateId: string) => {
    setSendingTemplateId(templateId);

    try {
      await onSendTemplate(templateId);
      setIsTemplateDialogOpen(false);
    } finally {
      setSendingTemplateId(null);
    }
  };

  return (
    <>
      <form onSubmit={onSubmit} className='space-y-2 sm:space-y-3' aria-label='Reply composer'>
        <label htmlFor='messenger-editor' className='sr-only'>
          Write a message
        </label>
        <div className='border-border/40 bg-background/80 flex items-end gap-2 rounded-2xl border p-3 backdrop-blur sm:gap-3 sm:rounded-3xl sm:p-4'>
          <div className='min-w-0 flex-1'>
            {attachments.length > 0 && (
              <FilePreview
                files={attachments.map((a) => ({
                  id: a.id,
                  name: a.name,
                  type: a.type
                }))}
                onRemove={onRemoveAttachment}
                className='mb-1 p-0'
              />
            )}
            <Textarea
              id='messenger-editor'
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              onKeyDown={(e) => {
                if (templateOnlyMode) {
                  return;
                }

                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (draft.trim()) {
                    const form = e.currentTarget.closest('form');
                    form?.requestSubmit();
                  }
                }
              }}
              placeholder={
                templateOnlyMode
                  ? 'Service window closed. Freeform replies are blocked. Use an approved template.'
                  : 'Message ' + contactName + ' (Enter to send, Shift+Enter for newline)'
              }
              rows={2}
              disabled={freeformDisabled}
              className='text-foreground placeholder:text-muted-foreground/70 min-h-[3rem] w-full resize-none border-none bg-transparent text-xs focus-visible:ring-0 focus-visible:outline-none sm:min-h-[4rem] sm:text-sm'
              aria-label={'Message ' + contactName}
            />
            {templateOnlyMode ? (
              <div className='mt-2 rounded-2xl border border-amber-500/20 bg-amber-500/8 px-3 py-2 text-[0.72rem] text-amber-700 dark:text-amber-200 sm:mt-3 sm:text-xs'>
                The 24-hour service window is closed. Freeform replies are blocked, so send an approved WhatsApp template instead.
              </div>
            ) : null}
            {!templateOnlyMode ? (
              <div className='mt-2 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2'>
                {quickReplies.map((reply) => (
                  <button
                    key={reply}
                    type='button'
                    onClick={() => onDraftChange(reply)}
                    className='border-border/50 bg-background/70 text-muted-foreground hover:border-primary/40 hover:text-foreground focus-visible:ring-primary/40 focus-visible:ring-offset-background rounded-full border px-2.5 py-0.5 text-[0.65rem] transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:px-3 sm:py-1 sm:text-xs'
                  >
                    {reply}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className='flex shrink-0 flex-col items-end gap-1.5 sm:w-24 sm:gap-2'>
            <input
              ref={fileInputRef}
              type='file'
              multiple
              className='hidden'
              onChange={(e) => {
                if (e.target.files?.length) {
                  onAddAttachments(e.target.files);
                }
                // Reset so same file can be re-selected
                e.target.value = '';
              }}
            />
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='border-border/40 bg-background/70 text-muted-foreground hover:bg-muted/50 focus-visible:ring-primary/40 focus-visible:ring-offset-background size-8 rounded-full border transition focus-visible:ring-2 focus-visible:ring-offset-2 sm:size-10'
              aria-label='Attach a file'
              disabled={composerLocked || templateOnlyMode}
              onClick={() => fileInputRef.current?.click()}
            >
              <Icons.paperclip className='h-3.5 w-3.5 sm:h-4 sm:w-4' />
            </Button>
            <Button
              type={templateOnlyMode ? 'button' : 'submit'}
              size='icon'
              className='bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary/40 focus-visible:ring-offset-background size-8 rounded-full shadow-lg transition focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:size-10'
              disabled={
                templateOnlyMode
                  ? launcherDisabled
                  : composerLocked || !draft.trim()
              }
              isLoading={!templateOnlyMode && isSending}
              aria-label={templateOnlyMode ? 'Choose template reply' : 'Send message'}
              onClick={
                templateOnlyMode ? () => setIsTemplateDialogOpen(true) : undefined
              }
            >
              {templateOnlyMode ? (
                <Icons.post className='h-3.5 w-3.5 sm:h-4 sm:w-4' aria-hidden='true' />
              ) : (
                <Icons.send className='h-3.5 w-3.5 sm:h-4 sm:w-4' aria-hidden='true' />
              )}
            </Button>
          </div>
        </div>
      </form>

      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className='border-border/60 bg-background/95 max-w-xl rounded-3xl p-0 backdrop-blur-xl'>
          <DialogHeader className='border-border/50 space-y-2 border-b px-6 pt-6 pb-4'>
            <DialogTitle className='flex items-center gap-2 text-base sm:text-lg'>
              <Icons.post className='text-primary h-4 w-4 sm:h-5 sm:w-5' />
              Send approved template
            </DialogTitle>
            <DialogDescription className='text-sm leading-6'>
              The 24-hour WhatsApp service window is closed. Freeform replies are blocked, so pick an approved template for {contactName}.
            </DialogDescription>
          </DialogHeader>

          <div className='max-h-[60vh] space-y-3 overflow-y-auto px-6 py-5'>
            {templateSuggestions.length === 0 ? (
              <div className='border-border/60 bg-muted/30 space-y-3 rounded-2xl border px-4 py-5 text-sm'>
                <div className='font-medium'>No approved templates available.</div>
                <p className='text-muted-foreground leading-6'>
                  Create or sync templates in WhatsApp Integration before sending messages outside the service window.
                </p>
                <Button type='button' variant='outline' onClick={onManageTemplates}>
                  Manage Templates
                </Button>
              </div>
            ) : (
              templateSuggestions.map((template) => (
                <div
                  key={template.id}
                  className='border-border/60 bg-background/70 space-y-3 rounded-2xl border px-4 py-4'
                >
                  <div className='flex flex-wrap items-start justify-between gap-3'>
                    <div className='min-w-0 flex-1 space-y-1'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <span className='text-sm font-semibold'>{template.title}</span>
                        <span className='bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px] uppercase tracking-wide'>
                          {template.language}
                        </span>
                      </div>
                      <p className='text-muted-foreground whitespace-pre-wrap text-sm leading-6'>
                        {template.body}
                      </p>
                    </div>
                    <Button
                      type='button'
                      size='sm'
                      isLoading={sendingTemplateId === template.id}
                      disabled={sendingTemplateId !== null}
                      onClick={() => void handleTemplateSend(template.id)}
                    >
                      Send
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter className='border-border/50 flex-row items-center justify-between border-t px-6 py-4'>
            <Button type='button' variant='ghost' onClick={onManageTemplates}>
              Manage Templates
            </Button>
            <Button
              type='button'
              variant='outline'
              onClick={() => setIsTemplateDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
