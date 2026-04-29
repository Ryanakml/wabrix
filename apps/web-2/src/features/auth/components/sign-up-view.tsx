import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SignUp as ClerkSignUpForm } from '@clerk/nextjs';
import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { AuthLegalLinks } from './auth-legal-links';
import { InteractiveGridPattern } from './interactive-grid';

export const metadata: Metadata = {
  title: 'Sign Up',
  description: 'Create your Wabrix workspace and start configuring WhatsApp automation.'
};

export default function SignUpViewPage() {
  return (
    <div className='light relative flex min-h-screen flex-col items-center justify-center overflow-hidden md:grid lg:max-w-none lg:grid-cols-2 lg:px-0' data-theme="light">
      <Link
        href='/auth/sign-in'
        className={cn(
          buttonVariants({ variant: 'ghost' }),
          'absolute top-4 right-4 hidden md:top-8 md:right-8'
        )}
      >
        Sign In
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
              &ldquo;Launch a workspace built for WhatsApp automation, approved templates, and
              human handoff when the bot needs backup.&rdquo;
            </p>
            <footer className='text-sidebar-foreground/70 text-sm'>Wabrix platform</footer>
          </blockquote>
        </div>
      </div>
      <div className='flex min-h-screen items-center justify-center p-4 lg:p-8'>
        <div className='flex w-full max-w-md flex-col items-center justify-center space-y-6'>
          <ClerkSignUpForm
            initialValues={{
              emailAddress: 'your_mail+clerk_test@example.com'
            }}
            signInUrl='/auth/sign-in'
          />
          <div className='text-muted-foreground space-y-2 px-8 text-center text-xs leading-5'>
            <p>
              Create an account to configure inbox automation, customer knowledge, WhatsApp
              credentials, and the workflows that power your team replies.
            </p>
          </div>
          <AuthLegalLinks />
        </div>
      </div>
    </div>
  );
}
