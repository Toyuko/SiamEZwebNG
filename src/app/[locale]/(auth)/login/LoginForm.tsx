"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { SocialAuthButtons, SocialAuthDivider } from "@/components/auth/SocialAuthButtons";
import type { AuthSocialProviders } from "@/lib/auth-providers";
import { hasAnySocialProvider } from "@/lib/auth-providers";
import { Link } from "@/i18n/navigation";

export function LoginForm({
  redirectTo,
  providers,
}: {
  redirectTo?: string;
  providers: AuthSocialProviders;
}) {
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const t = useTranslations("auth");
  const locale = useLocale();
  const callbackUrl = redirectTo ?? `/${locale}/portal`;
  const showSocial = hasAnySocialProvider(providers);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldError(undefined);
    setPending(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    const password = String(formData.get("password") ?? "");
    const redirectParam = formData.get("redirect");
    const safeRedirect =
      redirectParam &&
      typeof redirectParam === "string" &&
      redirectParam.startsWith("/") &&
      !redirectParam.startsWith("//");
    const destination = safeRedirect ? redirectParam : `/${locale}/portal`;

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: destination,
    });

    setPending(false);

    if (result?.error) {
      setFieldError(t("invalidCredentials"));
      return;
    }

    window.location.assign(destination);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {redirectTo && <input type="hidden" name="redirect" value={redirectTo} />}

      {showSocial && (
        <>
          <SocialAuthButtons providers={providers} callbackUrl={callbackUrl} />
          <SocialAuthDivider />
        </>
      )}

      <div className="space-y-4">
        <Field>
          <FieldLabel htmlFor="email" required>
            {t("email")}
          </FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            aria-invalid={Boolean(fieldError)}
          />
          <FieldError error={fieldError} />
        </Field>
        <Field>
          <FieldLabel htmlFor="password" required>
            {t("password")}
          </FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={Boolean(fieldError)}
          />
          <p className="text-sm text-muted-foreground">
            <Link href="/forgot-password" className="text-siam-blue hover:underline">
              {t("forgotPasswordLink")}
            </Link>
          </p>
        </Field>
        <Button type="submit" variant="primary" className="w-full" disabled={pending}>
          {pending ? t("signingIn") : t("signIn")}
        </Button>
      </div>
    </form>
  );
}
