"use client";

import React from "react";
import { OrganizationList, SignIn, useAuth } from "@clerk/nextjs";
import { useParams } from "next/navigation";

function OnboardingContent({ locale }: { locale: string }) {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return null;
  }

  return !isSignedIn ? (
    <>
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Sign in to Wabrix</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Join us to start managing your WhatsApp automation.
        </p>
      </div>
      <SignIn routing="hash" />
    </>
  ) : (
    <>
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Welcome!</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Please select or create an organization to continue.
        </p>
      </div>
      <OrganizationList
        hidePersonal={true}
        afterCreateOrganizationUrl={`/${locale}/dashboard`}
        afterSelectOrganizationUrl={`/${locale}/dashboard`}
      />
    </>
  );
}

export default function OnboardingPage() {
  const params = useParams<{ locale: string }>();
  const locale = params.locale ?? "en";

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20">
      <div className="flex flex-col items-center gap-6">
        <OnboardingContent locale={locale} />
      </div>
    </div>
  );
}
