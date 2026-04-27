'use client';

import { useEffect, useMemo, useState, useTransition, type ReactNode } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { toast } from 'sonner';
import { api } from '@wabrix/backend/convex/_generated/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileUploader } from '@/components/file-uploader';

type SourceType = 'inline' | 'website' | 'pdf';

type FormState = {
  sourceType: SourceType;
  title: string;
  url: string;
  content: string;
  files: File[];
};

const emptyForm: FormState = {
  sourceType: 'inline',
  title: '',
  url: '',
  content: '',
  files: []
};

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className='space-y-1'>
      <Separator />
      <h3 className='text-muted-foreground pt-2 text-sm font-medium tracking-wide uppercase'>
        {children}
      </h3>
    </div>
  );
}

const sourceTypeOptions = [
  { value: 'inline', label: 'Inline Text' },
  { value: 'website', label: 'Website URL' },
  { value: 'pdf', label: 'Document Upload' }
] as const;

const blockedPrivateOrInternalUrl = (error: unknown) =>
  error instanceof Error &&
  error.message.toLowerCase().includes('private or internal urls are blocked');

export function KnowledgeBaseManager() {
  const knowledgeState = useQuery(api.knowledge.getKnowledgeBaseState, {});
  const ingestKnowledgeSource = useAction(api.knowledgeActions.ingestKnowledgeSource);
  const deleteKnowledgeSource = useMutation(api.knowledge.deleteKnowledgeSource);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [isDeleting, startDeleting] = useTransition();

  useEffect(() => {
    if (!knowledgeState?.sources.length) {
      setSelectedSourceId(null);
      return;
    }

    setSelectedSourceId((current) => {
      if (
        current &&
        knowledgeState.sources.some((source) => String(source.id) === current)
      ) {
        return current;
      }

      return String(knowledgeState.sources[0]?.id ?? '');
    });
  }, [knowledgeState]);

  const selectedSource =
    knowledgeState?.sources.find((source) => String(source.id) === selectedSourceId) ?? null;
  type SourceId = NonNullable<typeof selectedSource>['id'];

  const saveDisabled = useMemo(() => {
    if (!knowledgeState?.canManage || !knowledgeState.botConfigured || isSaving) {
      return true;
    }

    if (form.sourceType === 'website') {
      return form.url.trim().length === 0;
    }

    if (form.sourceType === 'pdf') {
      return form.files.length === 0;
    }

    return form.content.trim().length === 0;
  }, [form.content, form.files.length, form.sourceType, form.url, isSaving, knowledgeState]);

  const handleFieldChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  };

  const handleSave = () => {
    startSaving(async () => {
      try {
        const fileTitle = form.files[0]?.name.replace(/\.[^/.]+$/, '') ?? '';
        const result = await ingestKnowledgeSource({
          sourceType: form.sourceType,
          title: form.title.trim() || (form.sourceType === 'pdf' ? fileTitle : undefined),
          content: form.sourceType === 'inline' ? form.content : undefined,
          url: form.sourceType === 'website' ? form.url.trim() : undefined
        });

        toast.success(
          result.pdfDeferred
            ? 'Document queued. PDF ingestion is currently deferred.'
            : `Knowledge source saved (${result.chunkCount} chunks).`
        );
        setForm((current) => ({
          ...current,
          title: '',
          url: '',
          content: '',
          files: []
        }));
        setSelectedSourceId(String(result.sourceId));
      } catch (error) {
        if (blockedPrivateOrInternalUrl(error)) {
          toast.error('Private or internal URLs are not allowed.');
          return;
        }

        toast.error(error instanceof Error ? error.message : 'Failed to save knowledge source.');
      }
    });
  };

  const handleDelete = (sourceId: SourceId) => {
    startDeleting(async () => {
      try {
        await deleteKnowledgeSource({ sourceId });
        toast.success('Knowledge source deleted.');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to delete knowledge source.');
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-2xl font-bold'>Knowledge Base</CardTitle>
        <p className='text-muted-foreground text-sm'>
          Manage inline notes, website sources, and deferred document uploads for retrieval.
        </p>
      </CardHeader>
      <CardContent className='space-y-6'>
        {knowledgeState && !knowledgeState.botConfigured ? (
          <div className='rounded-lg border px-4 py-3 text-sm'>
            Configure the bot profile before adding knowledge sources.
          </div>
        ) : null}

        <SectionTitle>Source Input</SectionTitle>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <div className='space-y-2'>
            <Label htmlFor='source-type'>Source Type</Label>
            <select
              id='source-type'
              className='border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50'
              value={form.sourceType}
              onChange={(event) =>
                handleFieldChange('sourceType', event.target.value as FormState['sourceType'])
              }
            >
              {sourceTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='source-title'>Title</Label>
            <Input
              id='source-title'
              value={form.title}
              placeholder='Optional title'
              onChange={(event) => handleFieldChange('title', event.target.value)}
            />
          </div>
        </div>

        {form.sourceType === 'website' ? (
          <div className='space-y-2'>
            <Label htmlFor='source-url'>Website URL</Label>
            <Input
              id='source-url'
              type='url'
              value={form.url}
              placeholder='https://example.com/help-center'
              onChange={(event) => handleFieldChange('url', event.target.value)}
            />
          </div>
        ) : null}

        {form.sourceType === 'inline' ? (
          <div className='space-y-2'>
            <Label htmlFor='source-content'>Inline Text</Label>
            <Textarea
              id='source-content'
              rows={10}
              value={form.content}
              placeholder='Paste business knowledge in Markdown or plain text.'
              onChange={(event) => handleFieldChange('content', event.target.value)}
            />
          </div>
        ) : null}

        {form.sourceType === 'pdf' ? (
          <div className='space-y-2'>
            <Label>Document Upload</Label>
            <FileUploader
              value={form.files}
              onValueChange={(nextValue) => {
                const nextFiles =
                  typeof nextValue === 'function' ? nextValue(form.files) : nextValue;
                handleFieldChange('files', nextFiles);
              }}
              accept={{ 'application/pdf': ['.pdf'] }}
              maxFiles={1}
              maxSize={10 * 1024 * 1024}
            />
          </div>
        ) : null}

        <div className='flex justify-end'>
          <Button type='button' onClick={handleSave} isLoading={isSaving} disabled={saveDisabled}>
            Save Source
          </Button>
        </div>

        <SectionTitle>Source List</SectionTitle>

        <div className='space-y-3'>
          {!knowledgeState ? (
            <p className='text-muted-foreground text-sm'>Loading knowledge sources...</p>
          ) : knowledgeState.sources.length === 0 ? (
            <div className='rounded-lg border px-4 py-5 text-sm'>
              No knowledge sources yet. Add inline text, a website, or a document to get started.
            </div>
          ) : (
            knowledgeState.sources.map((source) => {
              const active = String(source.id) === selectedSourceId;

              return (
                <button
                  key={String(source.id)}
                  type='button'
                  className={`w-full rounded-lg border px-4 py-4 text-left transition ${
                    active ? 'bg-muted border-primary/40' : 'hover:bg-muted/60'
                  }`}
                  onClick={() => setSelectedSourceId(String(source.id))}
                >
                  <div className='flex flex-wrap items-center gap-2'>
                    <Badge variant='outline'>{source.sourceType}</Badge>
                    <Badge variant='secondary'>{source.status}</Badge>
                    <Badge variant='outline'>{source.chunkCount} chunks</Badge>
                  </div>
                  <div className='mt-3 flex items-start justify-between gap-3'>
                    <div className='min-w-0'>
                      <div className='font-medium'>{source.title}</div>
                      <p className='text-muted-foreground mt-1 line-clamp-2 text-sm'>
                        {source.sourceUrl ?? source.previewMarkdown}
                      </p>
                    </div>
                    {knowledgeState.canManage ? (
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        isLoading={isDeleting && active}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDelete(source.id);
                        }}
                      >
                        Delete
                      </Button>
                    ) : null}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <SectionTitle>Selected Preview</SectionTitle>

        <div className='bg-muted rounded-lg border p-4'>
          <pre className='max-h-80 overflow-auto text-sm whitespace-pre-wrap'>
            {selectedSource?.markdownContent ?? 'Select a source to preview its stored content.'}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
