'use client';

import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { toast } from 'sonner';
import { api } from '@wabrix/backend/convex/_generated/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot
} from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

type WhatsAppIntegrationSettingsProps = {
  webhookUrl: string;
};

type FormState = {
  phoneNumberId: string;
  businessAccountId: string;
  accessToken: string;
  appSecret: string;
  verifyToken: string;
  enabled: boolean;
};

type OtpMethod = 'SMS' | 'VOICE';

type TemplateCategory = 'marketing' | 'utility' | 'authentication';

type TemplateFormState = {
  templateId?: string;
  name: string;
  languageCode: string;
  category: TemplateCategory;
  body: string;
};

type SanitizedIntegrationState = {
  phoneNumberId: string;
  businessAccountId: string;
  enabled: boolean;
  connectionStatus: string;
  webhookStatus: string;
  hasAccessToken: boolean;
  hasAppSecret: boolean;
  hasVerifyToken: boolean;
  approvalStatus: string;
  phoneVerificationStatus: string;
  businessProfileStatus: string;
  displayNameReviewStatus: string;
  messagingLimitTier: string | null;
  lastWebhookEventAt: number | null;
  lastLifecycleRefreshAt: number | null;
  lastLifecycleError: string | null;
};

const emptyForm: FormState = {
  phoneNumberId: '',
  businessAccountId: '',
  accessToken: '',
  appSecret: '',
  verifyToken: '',
  enabled: false
};

const emptyTemplateForm: TemplateFormState = {
  name: '',
  languageCode: 'en_US',
  category: 'utility',
  body: ''
};

const fallbackState: SanitizedIntegrationState = {
  phoneNumberId: '',
  businessAccountId: '',
  enabled: false,
  connectionStatus: 'disabled',
  webhookStatus: 'pending',
  hasAccessToken: false,
  hasAppSecret: false,
  hasVerifyToken: false,
  approvalStatus: 'pending',
  phoneVerificationStatus: 'missing',
  businessProfileStatus: 'pending',
  displayNameReviewStatus: 'pending',
  messagingLimitTier: null,
  lastWebhookEventAt: null,
  lastLifecycleRefreshAt: null,
  lastLifecycleError: null
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm'>
      <span className='text-muted-foreground'>{label}</span>
      <span className='text-right font-medium'>{value}</span>
    </div>
  );
}

function normalizeStatusLabel(value: string | null | undefined) {
  if (!value) {
    return 'Not available';
  }

  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatTimestamp(value: number | null | undefined) {
  if (!value) {
    return 'Not yet';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(value);
}

function getStatusBadgeVariant(status: string) {
  const normalized = status.toLowerCase();

  if (
    normalized.includes('approved') ||
    normalized.includes('verified') ||
    normalized.includes('synced') ||
    normalized.includes('configured') ||
    normalized.includes('connected')
  ) {
    return 'default' as const;
  }

  if (
    normalized.includes('failed') ||
    normalized.includes('rejected') ||
    normalized.includes('disabled')
  ) {
    return 'destructive' as const;
  }

  if (normalized.includes('pending') || normalized.includes('missing')) {
    return 'secondary' as const;
  }

  return 'outline' as const;
}

function buildFormState(state: SanitizedIntegrationState): FormState {
  return {
    phoneNumberId: state.phoneNumberId,
    businessAccountId: state.businessAccountId,
    accessToken: '',
    appSecret: '',
    verifyToken: '',
    enabled: state.enabled
  };
}

function getTemplateBody(components: Array<{ type?: string } & Record<string, unknown>>) {
  return (
    (components.find((component) => component.type === 'BODY') as { text?: string } | undefined)
      ?.text ?? ''
  );
}

export function WhatsAppIntegrationSettings({
  webhookUrl
}: WhatsAppIntegrationSettingsProps) {
  const integrationState = useQuery(api.whatsapp.getWhatsAppIntegrationState, {});
  const saveWhatsAppIntegration = useMutation(api.whatsapp.saveWhatsAppIntegration);
  const saveWhatsAppTemplate = useMutation(api.whatsapp.saveWhatsAppTemplate);
  const archiveWhatsAppTemplate = useMutation(api.whatsapp.archiveWhatsAppTemplate);
  const refreshWhatsAppLifecycle = useAction(api.whatsappAction.refreshWhatsAppLifecycle);
  const requestPhoneVerificationCode = useAction(api.whatsappAction.requestPhoneVerificationCode);
  const verifyPhoneVerificationCode = useAction(api.whatsappAction.verifyPhoneVerificationCode);
  const syncWhatsAppTemplates = useAction(api.whatsappAction.syncWhatsAppTemplates);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [templateForm, setTemplateForm] = useState<TemplateFormState>(emptyTemplateForm);
  const [otpMethod, setOtpMethod] = useState<OtpMethod>('SMS');
  const [otpCode, setOtpCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [activeAction, setActiveAction] = useState<
    'refresh' | 'request-otp' | 'verify-otp' | 'sync-templates' | null
  >(null);
  const hydratedKeyRef = useRef<string | null>(null);

  const state = integrationState?.state ?? fallbackState;
  const lifecycleBlockers = integrationState?.blockers ?? ['configure_integration'];
  const canManage = integrationState?.canManage ?? false;
  const botConfigured = integrationState?.botConfigured ?? false;
  const linkedBotName = integrationState?.linkedBotName ?? 'Not configured';

  const stateKey = useMemo(
    () =>
      JSON.stringify({
        phoneNumberId: state.phoneNumberId,
        businessAccountId: state.businessAccountId,
        enabled: state.enabled
      }),
    [state.businessAccountId, state.enabled, state.phoneNumberId]
  );

  useEffect(() => {
    if (stateKey === hydratedKeyRef.current) {
      return;
    }

    setForm(buildFormState(state));
    hydratedKeyRef.current = stateKey;
  }, [state, stateKey]);

  const saveDisabled = useMemo(() => {
    if (isSaving || !canManage || !botConfigured) {
      return true;
    }

    if (!form.enabled) {
      return false;
    }

    if (!form.phoneNumberId.trim() || !form.businessAccountId.trim()) {
      return true;
    }

    if (!state.hasAccessToken && !form.accessToken.trim()) {
      return true;
    }

    if (!state.hasAppSecret && !form.appSecret.trim()) {
      return true;
    }

    if (!state.hasVerifyToken && !form.verifyToken.trim()) {
      return true;
    }

    return false;
  }, [botConfigured, canManage, form, isSaving, state]);

  const handleFieldChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  };

  const handleTemplateFieldChange = <K extends keyof TemplateFormState>(
    key: K,
    value: TemplateFormState[K]
  ) => {
    setTemplateForm((current) => ({
      ...current,
      [key]: value
    }));
  };

  const runAction = async (
    action: 'refresh' | 'request-otp' | 'verify-otp' | 'sync-templates',
    callback: () => Promise<unknown>,
    successMessage: string
  ) => {
    setActiveAction(action);
    try {
      await callback();
      toast.success(successMessage);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Action failed.');
      return false;
    } finally {
      setActiveAction(null);
    }
  };

  const handleSave = async () => {
    if (!botConfigured) {
      toast.error('Configure Bot Studio before saving WhatsApp integration.');
      return;
    }

    if (form.enabled && !form.phoneNumberId.trim()) {
      toast.error('Phone Number ID is required.');
      return;
    }

    if (form.enabled && !form.businessAccountId.trim()) {
      toast.error('Business Account ID is required.');
      return;
    }

    if (form.enabled && !state.hasAccessToken && !form.accessToken.trim()) {
      toast.error('Access Token is required before enabling the integration.');
      return;
    }

    if (form.enabled && !state.hasAppSecret && !form.appSecret.trim()) {
      toast.error('App Secret is required before enabling the integration.');
      return;
    }

    if (form.enabled && !state.hasVerifyToken && !form.verifyToken.trim()) {
      toast.error('Verify Token is required before enabling the integration.');
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveWhatsAppIntegration({
        phoneNumberId: form.phoneNumberId.trim(),
        businessAccountId: form.businessAccountId.trim(),
        accessToken: form.accessToken.trim() || undefined,
        appSecret: form.appSecret.trim() || undefined,
        verifyToken: form.verifyToken.trim() || undefined,
        enabled: form.enabled
      });

      toast.success(`WhatsApp integration saved (${normalizeStatusLabel(result.connectionStatus)}).`);
      setForm((current) => ({
        ...current,
        accessToken: '',
        appSecret: '',
        verifyToken: ''
      }));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save WhatsApp integration.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleTemplateSave = async () => {
    if (!canManage) {
      return;
    }

    if (!templateForm.name.trim()) {
      toast.error('Template name is required.');
      return;
    }

    if (!templateForm.languageCode.trim()) {
      toast.error('Template language code is required.');
      return;
    }

    if (!templateForm.body.trim()) {
      toast.error('Template body is required.');
      return;
    }

    setIsSavingTemplate(true);
    try {
      await saveWhatsAppTemplate({
        templateId: templateForm.templateId as never,
        name: templateForm.name.trim(),
        languageCode: templateForm.languageCode.trim(),
        category: templateForm.category,
        components: [
          {
            type: 'BODY',
            text: templateForm.body.trim()
          }
        ]
      });
      setTemplateForm(emptyTemplateForm);
      toast.success('WhatsApp template saved.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save template.');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleTemplateArchive = async (templateId: string) => {
    try {
      await archiveWhatsAppTemplate({
        templateId: templateId as never
      });
      toast.success('WhatsApp template archived.');
      setTemplateForm((current) =>
        current.templateId === templateId ? emptyTemplateForm : current
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to archive template.');
    }
  };

  return (
    <div className='grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]'>
      <div className='flex flex-col gap-6'>
        <Card>
          <CardHeader>
            <CardTitle className='text-2xl font-bold'>WhatsApp Integration Setup</CardTitle>
            <p className='text-muted-foreground text-sm'>
              Connect the active bot to your WhatsApp Business credentials and webhook.
            </p>
          </CardHeader>
          <CardContent className='space-y-6'>
            {!botConfigured ? (
              <div className='rounded-lg border px-4 py-3 text-sm'>
                Configure the bot profile before saving WhatsApp integration.
              </div>
            ) : null}

            <SectionTitle>Connection</SectionTitle>

            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='phone-number-id'>Phone Number ID</Label>
                <Input
                  id='phone-number-id'
                  value={form.phoneNumberId}
                  placeholder='Enter Phone Number ID'
                  onChange={(event) => handleFieldChange('phoneNumberId', event.target.value)}
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='business-account-id'>Business Account ID</Label>
                <Input
                  id='business-account-id'
                  value={form.businessAccountId}
                  placeholder='Enter Business Account ID'
                  onChange={(event) => handleFieldChange('businessAccountId', event.target.value)}
                />
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='webhook-url'>Webhook / Callback URL</Label>
              <Input id='webhook-url' value={webhookUrl} readOnly />
            </div>

            <SectionTitle>Secrets</SectionTitle>

            <div className='grid grid-cols-1 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='access-token'>Access Token</Label>
                <Input
                  id='access-token'
                  type='password'
                  autoComplete='off'
                  value={form.accessToken}
                  placeholder={
                    state.hasAccessToken
                      ? 'Leave blank to keep current access token'
                      : 'Paste access token'
                  }
                  onChange={(event) => handleFieldChange('accessToken', event.target.value)}
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='app-secret'>App Secret / API Key</Label>
                <Input
                  id='app-secret'
                  type='password'
                  autoComplete='off'
                  value={form.appSecret}
                  placeholder={
                    state.hasAppSecret
                      ? 'Leave blank to keep current app secret'
                      : 'Paste app secret'
                  }
                  onChange={(event) => handleFieldChange('appSecret', event.target.value)}
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='verify-token'>Verify Token</Label>
                <Input
                  id='verify-token'
                  type='password'
                  autoComplete='off'
                  value={form.verifyToken}
                  placeholder={
                    state.hasVerifyToken
                      ? 'Leave blank to keep current verify token'
                      : 'Paste verify token'
                  }
                  onChange={(event) => handleFieldChange('verifyToken', event.target.value)}
                />
              </div>
            </div>

            <SectionTitle>Activation</SectionTitle>

            <div className='flex items-center justify-between rounded-lg border px-4 py-3'>
              <div className='space-y-1'>
                <div className='text-sm font-medium'>Enable Integration</div>
                <p className='text-muted-foreground text-sm'>
                  Turn on message transport after the credentials are configured.
                </p>
              </div>
              <Switch
                checked={form.enabled}
                onCheckedChange={(checked) => handleFieldChange('enabled', checked)}
                disabled={!canManage}
              />
            </div>

            <div className='flex justify-end'>
              <Button type='button' onClick={handleSave} isLoading={isSaving} disabled={saveDisabled}>
                Save Integration
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <div>
                <CardTitle>Manage Templates</CardTitle>
                <p className='text-muted-foreground text-sm'>
                  Keep reply templates ready for conversations outside the service window.
                </p>
              </div>
              <Button
                type='button'
                variant='secondary'
                isLoading={activeAction === 'sync-templates'}
                disabled={!canManage || activeAction !== null}
                onClick={() =>
                  runAction(
                    'sync-templates',
                    () => syncWhatsAppTemplates({}),
                    'Templates synced from Meta.'
                  )
                }
              >
                Sync Templates
              </Button>
            </div>
          </CardHeader>
          <CardContent className='space-y-6'>
            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='template-name'>Template Name</Label>
                <Input
                  id='template-name'
                  value={templateForm.name}
                  placeholder='shipping_update'
                  onChange={(event) => handleTemplateFieldChange('name', event.target.value)}
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='template-language'>Language Code</Label>
                <Input
                  id='template-language'
                  value={templateForm.languageCode}
                  placeholder='en_US'
                  onChange={(event) =>
                    handleTemplateFieldChange('languageCode', event.target.value)
                  }
                />
              </div>

              <div className='space-y-2'>
                <Label>Category</Label>
                <Select
                  value={templateForm.category}
                  onValueChange={(value) =>
                    handleTemplateFieldChange('category', value as TemplateCategory)
                  }
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Select a category' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='utility'>utility</SelectItem>
                    <SelectItem value='marketing'>marketing</SelectItem>
                    <SelectItem value='authentication'>authentication</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2 md:col-span-2'>
                <Label htmlFor='template-body'>Template Body</Label>
                <Textarea
                  id='template-body'
                  rows={4}
                  value={templateForm.body}
                  placeholder='Hi {{1}}, your order is ready for pickup.'
                  onChange={(event) => handleTemplateFieldChange('body', event.target.value)}
                />
              </div>
            </div>

            <div className='flex gap-3'>
              <Button
                type='button'
                isLoading={isSavingTemplate}
                disabled={!canManage}
                onClick={handleTemplateSave}
              >
                {templateForm.templateId ? 'Update Template' : 'Save Template'}
              </Button>
              {templateForm.templateId ? (
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setTemplateForm(emptyTemplateForm)}
                >
                  Cancel Edit
                </Button>
              ) : null}
            </div>

            <div className='space-y-3'>
              {integrationState && integrationState.templates.length === 0 ? (
                <div className='rounded-lg border px-4 py-5 text-sm'>
                  No templates yet. Create or sync templates before sending after the service
                  window closes.
                </div>
              ) : null}

              {integrationState?.templates.map((template) => {
                const body = getTemplateBody(template.components);

                return (
                  <div key={String(template.id)} className='rounded-lg border px-4 py-4 text-sm'>
                    <div className='flex flex-wrap items-start justify-between gap-3'>
                      <div className='space-y-2'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <span className='font-medium'>
                            {template.name} · {template.languageCode}
                          </span>
                          <Badge variant='outline'>{template.category}</Badge>
                          <Badge variant={getStatusBadgeVariant(template.status)}>
                            {normalizeStatusLabel(template.status)}
                          </Badge>
                        </div>
                        <p className='text-muted-foreground whitespace-pre-wrap'>
                          {body || 'No BODY component.'}
                        </p>
                        {template.rejectionReason ? (
                          <p className='text-muted-foreground'>
                            Rejection Reason: {template.rejectionReason}
                          </p>
                        ) : null}
                      </div>

                      <div className='flex gap-2'>
                        <Button
                          type='button'
                          variant='secondary'
                          onClick={() =>
                            setTemplateForm({
                              templateId: String(template.id),
                              name: template.name,
                              languageCode: template.languageCode,
                              category: template.category,
                              body
                            })
                          }
                        >
                          Edit
                        </Button>
                        <Button
                          type='button'
                          variant='outline'
                          onClick={() => handleTemplateArchive(String(template.id))}
                        >
                          Archive
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className='space-y-6 xl:sticky xl:top-16 xl:self-start'>
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              <div className='flex flex-wrap gap-2'>
                <Badge variant={getStatusBadgeVariant(state.connectionStatus)}>
                  {normalizeStatusLabel(state.connectionStatus)}
                </Badge>
                <Badge variant={botConfigured ? 'default' : 'secondary'}>
                  {botConfigured ? 'Bot Linked' : 'Bot Required'}
                </Badge>
              </div>
              <Row label='Linked Bot' value={linkedBotName} />
              <Row label='Webhook Status' value={normalizeStatusLabel(state.webhookStatus)} />
              <Row label='Last Webhook Event' value={formatTimestamp(state.lastWebhookEventAt)} />
              <Row
                label='Last Lifecycle Refresh'
                value={formatTimestamp(state.lastLifecycleRefreshAt)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Secret Status</CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              <Row label='Access Token' value={state.hasAccessToken ? 'Configured' : 'Missing'} />
              <Row label='App Secret' value={state.hasAppSecret ? 'Configured' : 'Missing'} />
              <Row label='Verify Token' value={state.hasVerifyToken ? 'Configured' : 'Missing'} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lifecycle</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid gap-3'>
                <Row label='Approval' value={normalizeStatusLabel(state.approvalStatus)} />
                <Row
                  label='Phone Verification'
                  value={normalizeStatusLabel(state.phoneVerificationStatus)}
                />
                <Row
                  label='Business Profile'
                  value={normalizeStatusLabel(state.businessProfileStatus)}
                />
                <Row
                  label='Display Name Review'
                  value={normalizeStatusLabel(state.displayNameReviewStatus)}
                />
                <Row
                  label='Messaging Tier'
                  value={normalizeStatusLabel(state.messagingLimitTier ?? 'not_available')}
                />
              </div>

              <div className='rounded-lg border px-4 py-3 text-sm'>
                <span className='font-medium'>Blockers: </span>
                {lifecycleBlockers.length > 0
                  ? lifecycleBlockers.map((blocker) => normalizeStatusLabel(blocker)).join(', ')
                  : 'None'}
              </div>

              {state.lastLifecycleError ? (
                <div className='rounded-lg border px-4 py-3 text-sm'>
                  <span className='font-medium'>Last Error: </span>
                  {state.lastLifecycleError}
                </div>
              ) : null}

              <SectionTitle>OTP Verification</SectionTitle>

              <div className='space-y-2'>
                <Label>Delivery Method</Label>
                <Select
                  value={otpMethod}
                  onValueChange={(value) => setOtpMethod(value as OtpMethod)}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Select a method' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='SMS'>SMS</SelectItem>
                    <SelectItem value='VOICE'>Voice</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                type='button'
                variant='secondary'
                className='w-full'
                isLoading={activeAction === 'request-otp'}
                disabled={!canManage || activeAction !== null}
                onClick={() =>
                  runAction(
                    'request-otp',
                    () =>
                      requestPhoneVerificationCode({ method: otpMethod, languageCode: 'en_US' }),
                    `Verification code requested via ${otpMethod}.`
                  )
                }
              >
                Request Code
              </Button>

              <div className='space-y-2'>
                <Label>OTP Code</Label>
                <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                type='button'
                className='w-full'
                isLoading={activeAction === 'verify-otp'}
                disabled={!canManage || activeAction !== null || otpCode.trim().length !== 6}
                onClick={async () => {
                  const verified = await runAction(
                    'verify-otp',
                    () => verifyPhoneVerificationCode({ code: otpCode }),
                    'Phone verification completed.'
                  );
                  if (verified) {
                    setOtpCode('');
                  }
                }}
              >
                Verify Code
              </Button>

              <Button
                type='button'
                variant='outline'
                className='w-full'
                isLoading={activeAction === 'refresh'}
                disabled={!canManage || activeAction !== null}
                onClick={() =>
                  runAction(
                    'refresh',
                    () => refreshWhatsAppLifecycle({}),
                    'Lifecycle refreshed.'
                  )
                }
              >
                Refresh Lifecycle
              </Button>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
