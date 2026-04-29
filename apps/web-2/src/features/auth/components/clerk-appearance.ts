import { dark } from '@clerk/themes';

const sharedClerkVariables = {
  colorPrimary: 'var(--primary)',
  colorTextOnPrimaryBackground: 'var(--primary-foreground)',
  colorText: 'var(--foreground)',
  colorTextSecondary: 'var(--muted-foreground)',
  colorBackground: 'var(--background)',
  colorInputBackground: 'var(--input)',
  colorInputText: 'var(--foreground)',
  colorShimmer: 'var(--accent)',
  colorNeutral: 'var(--muted)',
  colorMuted: 'var(--muted)',
  colorMutedForeground: 'var(--muted-foreground)',
  colorAlphaShade: 'var(--border)',
  colorDanger: 'var(--destructive)',
  colorSuccess: 'var(--primary)',
  colorWarning: 'var(--primary)',
  borderRadius: 'calc(var(--radius) * 1)',
  fontFamily: 'var(--font-sans)'
} as const;

const sharedClerkElements = {
  rootBox: 'w-full',
  cardBox: 'w-full',
  card: 'w-full rounded-xl border border-border bg-card/95 shadow-none',
  header: 'text-foreground',
  headerTitle: 'text-foreground',
  headerSubtitle: 'text-muted-foreground',
  main: 'text-foreground',
  form: 'text-foreground',
  formFieldLabel: 'text-foreground',
  formFieldHintText: 'text-muted-foreground',
  formFieldErrorText: 'text-destructive',
  formFieldInput:
      'border-border bg-input text-foreground placeholder:text-muted-foreground focus-visible:ring-ring',
  formButtonPrimary: 'bg-primary text-primary-foreground shadow-none hover:bg-primary/90',
  socialButtonsBlockButton:
      'border-border bg-background text-foreground shadow-none hover:bg-accent',
  socialButtonsBlockButtonText: 'text-foreground',
  dividerLine: 'bg-border',
  dividerText: 'text-muted-foreground',
  footerActionText: 'text-muted-foreground',
  footerActionLink: 'text-primary hover:text-primary/90',
  formHeaderTitle: 'text-foreground',
  formHeaderSubtitle: 'text-muted-foreground',
  formFieldSuccessText: 'text-primary',
  identityPreviewText: 'text-foreground',
  identityPreviewEditButton: 'text-primary hover:text-primary/90',
  formResendCodeLink: 'text-primary hover:text-primary/90',
  otpCodeFieldInput:
      'border-border bg-input text-foreground shadow-none focus-visible:ring-ring',
  otpCodeFieldInputText: 'text-foreground',
  alert: 'border-border bg-card text-foreground',
  alertText: 'text-foreground',
  formFieldWarningText: 'text-primary',
  navbar: 'border-border bg-card text-foreground',
  navbarButton: 'text-foreground hover:bg-accent hover:text-accent-foreground',
  pageScrollBox: 'bg-background text-foreground',
  page: 'bg-background text-foreground',
  pageContent: 'text-foreground',
  profileSectionTitleText: 'text-foreground',
  profileSectionContent: 'text-foreground',
  profileSectionPrimaryButton: 'bg-primary text-primary-foreground hover:bg-primary/90',
  profileSectionSecondaryButton: 'border-border bg-background text-foreground hover:bg-accent',
  formFieldAction: 'text-primary hover:text-primary/90',
  badge: 'border-border bg-muted text-muted-foreground',
  accordionTriggerButton:
    'text-foreground hover:bg-accent hover:text-accent-foreground rounded-md',
  accordionContent: 'text-foreground',
  menuButton: 'text-foreground hover:bg-accent hover:text-accent-foreground',
  menuList: 'border-border bg-popover text-popover-foreground',
  menuItem: 'text-foreground hover:bg-accent hover:text-accent-foreground',
  previewTextContainer: 'text-foreground',
  previewMainIdentifier: 'text-foreground',
  previewSecondaryIdentifier: 'text-muted-foreground',
  userButtonPopoverCard: 'border-border bg-popover text-popover-foreground',
  userPreviewMainIdentifier: 'text-foreground',
  userPreviewSecondaryIdentifier: 'text-muted-foreground'
} as const;

export function getClerkAppearance(theme: 'dark' | 'light') {
  return {
    baseTheme: theme === 'dark' ? dark : undefined,
    variables: sharedClerkVariables,
    elements: sharedClerkElements
  };
}
