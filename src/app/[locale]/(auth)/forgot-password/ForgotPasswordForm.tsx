"use client";

import { useActionState, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { requestPasswordReset } from "@/actions/password-reset";
import { Link } from "@/i18n/navigation";

type State =
  | { ok: true; message: string }
  | { ok: false; error: string }
  | null;

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    null as State
  );
  const [localError, setLocalError] = useState<string | undefined>();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    setLocalError(undefined);
    const email = new FormData(e.currentTarget).get("email");
    if (!email || typeof email !== "string" || !email.includes("@")) {
      e.preventDefault();
      setLocalError(t("stepEmailInvalid"));
    }
  }

  if (state?.ok) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">{t("forgotPasswordSent")}</p>
        <Link href="/login" className="text-sm font-medium text-siam-blue hover:underline">
          {t("backToSignIn")}
        </Link>
      </div>
    );
  }

  const errorKey = state && !state.ok ? state.error : undefined;
  const errorMessage =
    localError ||
    (errorKey === "rate_limited"
      ? t("forgotPasswordRateLimited")
      : errorKey === "invalid_email"
        ? t("stepEmailInvalid")
        : undefined);

  return (
    <form action={formAction} onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
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
          aria-invalid={Boolean(errorMessage)}
        />
        <FieldError error={errorMessage} />
      </Field>
      <Button type="submit" variant="primary" className="w-full" disabled={pending}>
        {pending ? t("sendingResetLink") : t("sendResetLink")}
      </Button>
    </form>
  );
}
