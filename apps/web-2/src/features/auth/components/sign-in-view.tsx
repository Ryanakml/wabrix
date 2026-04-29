import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SignIn as ClerkSignInForm } from '@clerk/nextjs';
import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { AuthLegalLinks } from './auth-legal-links';
import { InteractiveGridPattern } from './interactive-grid';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to Wabrix and continue managing WhatsApp conversations and automations.'
};

export default function SignInViewPage() {
  return (
    <div className='light relative flex min-h-screen flex-col items-center justify-center overflow-hidden md:grid lg:max-w-none lg:grid-cols-2 lg:px-0' data-theme="light">
      <Link
        href='/auth/sign-up'
        className={cn(
          buttonVariants({ variant: 'ghost' }),
          'absolute top-4 right-4 hidden md:top-8 md:right-8'
        )}
      >
        Sign Up
      </Link>
      <div className='relative hidden h-full flex-col p-10 lg:flex dark:border-r'>
        <div className='absolute inset-0 bg-sidebar' />
        <div className='text-sidebar-foreground relative z-20 flex items-center text-lg font-medium'>
          <Image
            src='/logo.png'
            alt='Wabrix logo'
            width={120}
            height={40}
            className='mr-2 h-auto w-32'
            priority
          />
        </div>
        <InteractiveGridPattern
          className={cn(
            'mask-[radial-gradient(400px_circle_at_center,white,transparent)]',
            'inset-x-0 inset-y-[0%] h-full skew-y-12'
          )}
        />
        <div className='text-sidebar-foreground relative z-20 mt-auto'>
          <blockquote className='space-y-2'>
            <p className='text-lg'>
              &ldquo;Keep every WhatsApp conversation compliant, context-aware, and ready for the
              next reply window without losing operational control.&rdquo;
            </p>
            <footer className='text-sidebar-foreground/70 text-sm'>Wabrix platform</footer>
          </blockquote>
        </div>
      </div>
      <div className='flex h-full items-center justify-center p-4 lg:p-8'>
        <div className='flex w-full max-w-md flex-col items-center justify-center space-y-6'>
          <ClerkSignInForm
            initialValues={{
              emailAddress: 'your_mail+clerk_test@example.com'
            }}
            signUpUrl='/auth/sign-up'
          />
          <div className='text-muted-foreground space-y-2 px-8 text-center text-xs leading-5'>
            <p>
              Sign in to access your shared inbox, bot configuration, knowledge base, and WhatsApp
              integration settings in one workspace.
            </p>
          </div>
          <AuthLegalLinks />
        </div>
      </div>
    </div>
  );
}
