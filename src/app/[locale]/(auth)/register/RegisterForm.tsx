"use client";

import { ConversationalRegister } from "@/components/auth/ConversationalRegister";
import type { AuthSocialProviders } from "@/lib/auth-providers";

/** Stepped / conversational signup — same `register` server action as before. */
export function RegisterForm({
  locale,
  prefillEmail,
  redirectTo,
  providers,
}: {
  locale: string;
  prefillEmail?: string;
  redirectTo?: string;
  providers: AuthSocialProviders;
}) {
  return (
    <ConversationalRegister
      locale={locale}
      prefillEmail={prefillEmail}
      redirectTo={redirectTo}
      providers={providers}
    />
  );
}
