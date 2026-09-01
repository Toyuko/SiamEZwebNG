"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { register } from "@/actions/auth";
import { resolvePostAuthRedirect } from "@/lib/auth-redirect";
import { withWelcomeQuery } from "@/lib/auth-first-run";
import type { AuthSocialProviders } from "@/lib/auth-providers";
import { hasAnySocialProvider } from "@/lib/auth-providers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldHint, FieldLabel } from "@/components/ui/field";
import { SocialAuthButtons, SocialAuthDivider } from "@/components/auth/SocialAuthButtons";

type FieldErrors = {
  email?: string[];
  password?: string[];
  name?: string[];
};

export function ConversationalRegister({
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
  const t = useTranslations("auth");
  const [email, setEmail] = useState(prefillEmail ?? "");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  const defaultCallbackUrl = resolvePostAuthRedirect(locale, redirectTo);
  const showSocial = hasAnySocialProvider(providers);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    setFormError(undefined);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setFieldErrors({ email: [t("stepEmailInvalid")] });
      return;
    }
    if (password.length < 8) {
      setFieldErrors({ password: [t("stepPasswordMin")] });
      return;
    }

    setPending(true);
    const formData = new FormData();
    formData.set("email", trimmedEmail);
    formData.set("password", password);

    const result = await register(undefined, formData);

    if ("error" in result && result.error) {
      setFieldErrors(result.error);
      setPending(false);
      return;
    }

    if (!("ok" in result) || !result.ok) {
      setPending(false);
      return;
    }

    const callbackUrl = withWelcomeQuery(
      resolvePostAuthRedirect(locale, redirectTo, "customer")
    );

    const signInResult = await signIn("credentials", {
      email: trimmedEmail,
      password,
      redirect: false,
      callbackUrl,
    });

    setPending(false);

    if (signInResult?.error) {
      setFormError(t("signInAfterRegisterFailed"));
      return;
    }

    window.location.assign(callbackUrl);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {showSocial && (
        <>
          <SocialAuthButtons providers={providers} callbackUrl={defaultCallbackUrl} />
          <SocialAuthDivider />
        </>
      )}

      <Field>
        <FieldLabel htmlFor="email" required>
          {t("email")}
        </FieldLabel>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus={!prefillEmail}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          aria-invalid={Boolean(fieldErrors.email)}
        />
        <FieldError error={fieldErrors.email?.[0]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="password" required>
          {t("password")}
        </FieldLabel>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("passwordPlaceholder")}
          required
          aria-invalid={Boolean(fieldErrors.password)}
        />
        <FieldHint>{t("stepPasswordHint")}</FieldHint>
        <FieldError error={fieldErrors.password?.[0]} />
      </Field>

      {formError ? <FieldError error={formError} /> : null}

      <Button type="submit" variant="primary" className="w-full" disabled={pending}>
        {pending ? t("creatingAccount") : t("createAccount")}
      </Button>
    </form>
  );
}
