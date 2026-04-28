import { Metadata } from 'next';
import SignUpViewPage from '@/features/auth/components/sign-up-view';

export const metadata: Metadata = {
  title: 'Sign Up | Wabrix',
  description: 'Create your Wabrix account.'
};

export default function Page() {
  return <SignUpViewPage />;
}
