import { Metadata } from 'next';
import SignInViewPage from '@/features/auth/components/sign-in-view';

export const metadata: Metadata = {
  title: 'Sign In | Wabrix',
  description: 'Access your Wabrix workspace.'
};

export default function Page() {
  return <SignInViewPage />;
}
