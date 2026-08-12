"use client";

import { useActionState, useState, type FormEvent } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { resetPasswordWithToken } from "@/actions/password-reset";
import { Link } from "@/i18n/navigation";

type State = { ok: true } | { ok: false; error: string } | null;

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    resetPasswordWithToken,
    null as State
  );
  const [localError, setLocalError] = useState<string | undefined>();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    setLocalError(undefined);
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    if (password.length < 8) {
      e.preventDefault();
      setLocalError(t("stepPasswordMin"));
    }
  }

  if (state?.ok) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">{t("resetPasswordSuccess")}</p>
        <Button
          type="button"
          variant="primary"
          className="w-full"
          onClick={() => router.push("/login")}
        >
          {t("signIn")}
        </Button>
      </div>
    );
  }

  const errorKey = state && !state.ok ? state.error : undefined;
  const errorMessage =
    localError ||
    (errorKey === "invalid_or_expired"
      ? t("resetPasswordInvalid")
      : errorKey === "invalid_input"
        ? t("stepPasswordMin")
        : undefined);

  return (
    <form action={formAction} onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <Field>
        <FieldLabel htmlFor="password" required>
          {t("newPassword")}
        </FieldLabel>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder={t("passwordPlaceholder")}
          aria-invalid={Boolean(errorMessage)}
        />
        <FieldError error={errorMessage} />
      </Field>
      <Button type="submit" variant="primary" className="w-full" disabled={pending}>
        {pending ? t("savingPassword") : t("saveNewPassword")}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/forgot-password" className="text-siam-blue hover:underline">
          {t("requestNewResetLink")}
        </Link>
      </p>
    </form>
  );
}
