'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { billingPlanDefinitions, resolveBillingGatewayForCountry, type BillingCurrency } from '@wabrix/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { captureAnalyticsEvent } from '@/lib/analytics';

function formatPrice(currency: BillingCurrency, amount: number) {
  return new Intl.NumberFormat(currency === 'IDR' ? 'id-ID' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(amount / (currency === 'IDR' ? 1 : 100));
}

export function PricingPageView() {
  const [selectedCountry, setSelectedCountry] = useState('US');

  const presentation = useMemo(
    () => resolveBillingGatewayForCountry(selectedCountry),
    [selectedCountry]
  );

  return (
    <div className='px-4 pb-24 sm:px-6 lg:px-8'>
      <div className='mx-auto flex max-w-6xl flex-col gap-10 pt-40'>
        <header className='grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-end'>
          <div className='space-y-4'>
            <p className='text-sm font-semibold tracking-[0.24em] text-violet-600 uppercase'>
              Pricing
            </p>
            <h1 className='max-w-3xl text-4xl font-semibold tracking-tight text-gray-900 md:text-5xl'>
              Choose the plan that matches your WhatsApp operations.
            </h1>
            <p className='max-w-3xl text-lg leading-8 text-gray-600'>
              Pricing follows the billing country your team will use at checkout. Sign in first,
              then continue from the dashboard billing flow when your workspace is ready.
            </p>
          </div>

          <Card className='border-gray-200 bg-white'>
            <CardHeader>
              <CardTitle className='text-lg text-gray-900'>Billing country</CardTitle>
              <CardDescription>
                Indonesia uses IDR pricing. United States, Singapore, and Australia use USD pricing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className='w-full bg-white'>
                  <SelectValue placeholder='Select billing country' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ID'>Indonesia</SelectItem>
                  <SelectItem value='US'>United States</SelectItem>
                  <SelectItem value='SG'>Singapore</SelectItem>
                  <SelectItem value='AU'>Australia</SelectItem>
                </SelectContent>
              </Select>
              <p className='mt-3 text-sm text-gray-500'>
                Current currency: <span className='font-medium text-gray-900'>{presentation.currency}</span>
              </p>
            </CardContent>
          </Card>
        </header>

        <section className='grid gap-6 xl:grid-cols-3'>
          {billingPlanDefinitions.map((plan) => {
            const amount =
              presentation.currency === 'IDR' ? plan.monthlyPriceIdr : plan.monthlyPriceUsdCents;

            return (
              <Card key={plan.key} className='border-gray-200 bg-white'>
                <CardHeader className='space-y-3'>
                  <div className='space-y-1'>
                    <CardTitle className='text-2xl text-gray-900'>{plan.name}</CardTitle>
                    <CardDescription className='leading-6'>{plan.tagline}</CardDescription>
                  </div>
                  <div>
                    <p className='text-4xl font-semibold tracking-tight text-gray-900'>
                      {formatPrice(presentation.currency, amount)}
                    </p>
                    <p className='mt-1 text-sm text-gray-500'>per month</p>
                  </div>
                </CardHeader>
                <CardContent className='space-y-6'>
                  <div className='space-y-3 text-sm text-gray-600'>
                    <div className='flex items-center justify-between gap-4'>
                      <span>AI tokens</span>
                      <span className='font-medium text-gray-900'>
                        {plan.includedAiTokens.toLocaleString()}
                      </span>
                    </div>
                    <div className='flex items-center justify-between gap-4'>
                      <span>Outbound messages</span>
                      <span className='font-medium text-gray-900'>
                        {plan.includedOutboundMessages.toLocaleString()}
                      </span>
                    </div>
                    <div className='flex items-center justify-between gap-4'>
                      <span>Seats</span>
                      <span className='font-medium text-gray-900'>{plan.includedSeats}</span>
                    </div>
                  </div>

                  <Button asChild className='w-full'>
                    <Link
                      href='/auth/sign-in'
                      onClick={() =>
                        captureAnalyticsEvent('pricing_cta_clicked', {
                          planKey: plan.key,
                          billingCountry: selectedCountry,
                          currency: presentation.currency
                        })
                      }
                    >
                      Sign in to continue
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </section>
      </div>
    </div>
  );
}
