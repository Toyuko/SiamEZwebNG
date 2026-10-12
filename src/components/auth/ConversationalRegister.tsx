"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { register } from "@/actions/auth";
import { resolvePostAuthRedirect } from "@/lib/auth-redirect";
import { withWelcomeQuery } from "@/lib/auth-first-run";
import type { AuthSocialProviders } from "@/lib/auth-providers";
import { hasAnySocialProvider } from "@/lib/auth-providers";
import { fadeInUp, motionTransition } from "@/components/ui/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldHint, FieldLabel } from "@/components/ui/field";
import { SocialAuthButtons, SocialAuthDivider } from "@/components/auth/SocialAuthButtons";
import { cn } from "@/lib/utils";

type AccountType = "customer" | "freelancer" | "company";
type StepId = "intent" | "name" | "email" | "password";

type FieldErrors = {
  email?: string[];
  password?: string[];
  name?: string[];
  accountType?: string[];
};

const STEPS: StepId[] = ["intent", "name", "email", "password"];

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
  const [stepIndex, setStepIndex] = useState(0);
  const [accountType, setAccountType] = useState<AccountType>("customer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(prefillEmail ?? "");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  const step = STEPS[stepIndex]!;
  const defaultCallbackUrl = resolvePostAuthRedirect(locale, redirectTo);
  const showSocial = hasAnySocialProvider(providers);

  function clearErrors() {
    setFieldErrors({});
    setFormError(undefined);
  }

  function goNext() {
    clearErrors();
    if (step === "intent") {
      setStepIndex(1);
      return;
    }
    if (step === "name") {
      if (!name.trim()) {
        setFieldErrors({ name: [t("stepNameRequired")] });
        return;
      }
      setStepIndex(2);
      return;
    }
    if (step === "email") {
      const trimmed = email.trim().toLowerCase();
      if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        setFieldErrors({ email: [t("stepEmailInvalid")] });
        return;
      }
      setEmail(trimmed);
      setStepIndex(3);
    }
  }

  function goBack() {
    clearErrors();
    setStepIndex((i) => Math.max(0, i - 1));
  }

  function onStepKeyDown(e: KeyboardEvent) {
    if (e.key !== "Enter") return;
    if (step === "password") return;
    e.preventDefault();
    goNext();
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (step !== "password") {
      goNext();
      return;
    }

    clearErrors();
    if (password.length < 8) {
      setFieldErrors({ password: [t("stepPasswordMin")] });
      return;
    }

    setPending(true);
    const formData = new FormData();
    formData.set("accountType", accountType);
    formData.set("name", name.trim());
    formData.set("email", email.trim().toLowerCase());
    formData.set("password", password);

    const result = await register(undefined, formData);

    if ("error" in result && result.error) {
      setFieldErrors(result.error);
      if (result.error.name) setStepIndex(1);
      else if (result.error.email) setStepIndex(2);
      else if (result.error.password) setStepIndex(3);
      setPending(false);
      return;
    }

    if (!("ok" in result) || !result.ok) {
      setPending(false);
      return;
    }

    const role = "role" in result && result.role ? result.role : accountType;
    let callbackUrl = resolvePostAuthRedirect(locale, redirectTo, role);
    if (role === "customer" && !redirectTo) {
      callbackUrl = withWelcomeQuery(callbackUrl);
    }

    const signInResult = await signIn("credentials", {
      email: email.trim().toLowerCase(),
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

  const accountTypes: { value: AccountType; label: string; hint: string }[] = [
    {
      value: "customer",
      label: t("accountTypeCustomer"),
      hint: t("accountTypeCustomerHint"),
    },
    {
      value: "freelancer",
      label: t("accountTypeFreelancer"),
      hint: t("accountTypeFreelancerHint"),
    },
    {
      value: "company",
      label: t("accountTypeCompany"),
      hint: t("accountTypeCompanyHint"),
    },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4" onKeyDown={onStepKeyDown}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-muted">
          {t("stepProgress", { current: stepIndex + 1, total: STEPS.length })}
        </p>
        <div className="flex gap-1.5" aria-hidden>
          {STEPS.map((id, i) => (
            <span
              key={id}
              className={cn(
                "h-1.5 w-6 rounded-full transition-colors",
                i <= stepIndex ? "bg-siam-blue" : "bg-border"
              )}
            />
          ))}
        </div>
      </div>

      {showSocial && step === "intent" && (
        <>
          <SocialAuthButtons providers={providers} callbackUrl={defaultCallbackUrl} />
          <SocialAuthDivider />
        </>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={motionTransition}
          className="space-y-4"
        >
          {step === "intent" && (
            <>
              <div>
                <p className="text-base font-semibold text-foreground">{t("stepIntentTitle")}</p>
                <p className="mt-1 text-sm text-muted">{t("stepIntentSubtitle")}</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {accountTypes.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAccountType(opt.value)}
                    className={cn(
                      "rounded-lg border px-4 py-3 text-left transition",
                      accountType === opt.value
                        ? "border-siam-blue bg-siam-blue/5 ring-1 ring-siam-blue"
                        : "border-border hover:border-siam-blue/40"
                    )}
                  >
                    <span className="block text-sm font-medium text-foreground">{opt.label}</span>
                    <span className="mt-0.5 block text-xs text-muted">{opt.hint}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === "name" && (
            <>
              <div>
                <p className="text-base font-semibold text-foreground">
                  {accountType === "company" ? t("stepNameTitleCompany") : t("stepNameTitle")}
                </p>
                <p className="mt-1 text-sm text-muted">{t("stepNameSubtitle")}</p>
              </div>
              <Field>
                <FieldLabel htmlFor="name" required>
                  {accountType === "company" ? t("companyName") : t("name")}
                </FieldLabel>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    accountType === "company"
                      ? t("companyNamePlaceholder")
                      : t("namePlaceholder")
                  }
                  aria-invalid={Boolean(fieldErrors.name)}
                />
                <FieldError error={fieldErrors.name?.[0]} />
              </Field>
            </>
          )}

          {step === "email" && (
            <>
              <div>
                <p className="text-base font-semibold text-foreground">{t("stepEmailTitle")}</p>
                <p className="mt-1 text-sm text-muted">{t("stepEmailSubtitle")}</p>
              </div>
              <Field>
                <FieldLabel htmlFor="email" required>
                  {t("email")}
                </FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  aria-invalid={Boolean(fieldErrors.email)}
                />
                <FieldError error={fieldErrors.email?.[0]} />
              </Field>
            </>
          )}

          {step === "password" && (
            <>
              <div>
                <p className="text-base font-semibold text-foreground">{t("stepPasswordTitle")}</p>
                <p className="mt-1 text-sm text-muted">{t("stepPasswordSubtitle")}</p>
              </div>
              <Field>
                <FieldLabel htmlFor="password" required>
                  {t("password")}
                </FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  autoFocus
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("passwordPlaceholder")}
                  aria-invalid={Boolean(fieldErrors.password)}
                />
                <FieldHint>{t("stepPasswordHint")}</FieldHint>
                <FieldError error={fieldErrors.password?.[0]} />
              </Field>
              {formError ? <FieldError error={formError} /> : null}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex gap-3 pt-2">
        {stepIndex > 0 ? (
          <Button type="button" variant="outline" className="flex-1" onClick={goBack} disabled={pending}>
            {t("back")}
          </Button>
        ) : null}
        {step === "password" ? (
          <Button type="submit" variant="primary" className="flex-1" disabled={pending}>
            {pending ? t("creatingAccount") : t("createAccount")}
          </Button>
        ) : (
          <Button type="button" variant="primary" className="flex-1" onClick={goNext}>
            {t("continue")}
          </Button>
        )}
      </div>
    </form>
  );
}
