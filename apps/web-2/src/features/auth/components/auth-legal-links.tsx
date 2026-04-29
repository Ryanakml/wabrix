'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { legalDocuments, type LegalDocumentType } from './auth-legal-content';

export function AuthLegalLinks() {
  const [openDocument, setOpenDocument] = useState<LegalDocumentType | null>(null);
  const activeDocument = openDocument ? legalDocuments[openDocument] : null;

  return (
    <>
      <p className='text-muted-foreground px-8 text-center text-sm'>
        By clicking continue, you agree to our{' '}
        <button
          type='button'
          onClick={() => setOpenDocument('terms')}
          className='hover:text-primary underline underline-offset-4'
        >
          Terms of Service
        </button>{' '}
        and{' '}
        <button
          type='button'
          onClick={() => setOpenDocument('privacy')}
          className='hover:text-primary underline underline-offset-4'
        >
          Privacy Policy
        </button>
        .
      </p>

      <Dialog open={openDocument !== null} onOpenChange={(open) => !open && setOpenDocument(null)}>
        {activeDocument ? (
          <DialogContent className='border-border bg-card text-card-foreground max-h-[85vh] max-w-2xl overflow-hidden p-0 sm:max-w-2xl'>
            <DialogHeader className='border-border border-b px-6 pt-6 pb-4 text-left'>
              <DialogTitle>{activeDocument.title}</DialogTitle>
              <DialogDescription className='space-y-1'>
                <span className='block'>{activeDocument.summary}</span>
                <span className='text-muted-foreground/80 block text-xs'>
                  Last updated: {activeDocument.updatedAt}
                </span>
              </DialogDescription>
            </DialogHeader>

            <div className='max-h-[calc(85vh-8rem)] space-y-6 overflow-y-auto px-6 py-5'>
              {activeDocument.sections.map((section) => (
                <section key={section.title} className='space-y-2'>
                  <h3 className='text-base font-semibold'>{section.title}</h3>
                  {section.body.map((paragraph) => (
                    <p key={paragraph} className='text-muted-foreground text-sm leading-6'>
                      {paragraph}
                    </p>
                  ))}
                </section>
              ))}

              <div className='border-border text-muted-foreground border-t pt-4 text-sm leading-6'>
                {activeDocument.footer}
              </div>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
}
