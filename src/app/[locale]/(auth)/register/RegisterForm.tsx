"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { register } from "@/actions/auth";
import { resolvePostAuthRedirect } from "@/lib/auth-redirect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FieldErrors = {
  email?: string[];
  password?: string[];
  name?: string[];
  accountType?: string[];
};

function RegisterFormInner({
  state,
  prefillEmail,
  pending,
  providers,
  callbackUrl,
}: {
  state: { error?: FieldErrors };
  prefillEmail?: string;
  pending: boolean;
  callbackUrl: string;
  providers: {
    google: boolean;
    facebook: boolean;
    line: boolean;
  };
}) {
  const t = useTranslations("auth");
  const hasSocialProviders = providers.google || providers.facebook || providers.line;

  return (
    <>
      {hasSocialProviders && (
        <div className="space-y-3">
          {providers.google && (
            <button
              type="button"
              onClick={() => void signIn("google", { callbackUrl })}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-600 bg-red-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-red-700"
            >
              {t("continueWithGoogle")}
            </button>
          )}
          {providers.facebook && (
            <button
              type="button"
              onClick={() => void signIn("facebook", { callbackUrl })}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-[#1877F2] px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#166FE5]"
            >
              {t("continueWithFacebook")}
            </button>
          )}
          {providers.line && (
            <button
              type="button"
              onClick={() => void signIn("line", { callbackUrl })}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#00B900] bg-[#00B900] px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#009900]"
            >
              {t("continueWithLine")}
            </button>
          )}
        </div>
      )}

      {hasSocialProviders && (
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-300 dark:border-gray-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              {t("orContinueWithEmail")}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("accountType")}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2.5 text-sm has-[:checked]:border-siam-blue has-[:checked]:bg-siam-blue/5 dark:border-gray-600">
              <input
                type="radio"
                name="accountType"
                value="customer"
                defaultChecked
                className="text-siam-blue focus:ring-siam-blue"
              />
              <span>{t("accountTypeCustomer")}</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2.5 text-sm has-[:checked]:border-siam-blue has-[:checked]:bg-siam-blue/5 dark:border-gray-600">
              <input
                type="radio"
                name="accountType"
                value="freelancer"
                className="text-siam-blue focus:ring-siam-blue"
              />
              <span>{t("accountTypeFreelancer")}</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2.5 text-sm has-[:checked]:border-siam-blue has-[:checked]:bg-siam-blue/5 dark:border-gray-600">
              <input
                type="radio"
                name="accountType"
                value="company"
                className="text-siam-blue focus:ring-siam-blue"
              />
              <span>{t("accountTypeCompany")}</span>
            </label>
          </div>
        </div>
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("name")}
          </label>
          <Input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            placeholder="Your name"
            className={state?.error?.name ? "border-red-500" : ""}
          />
          {state?.error?.name && (
            <p className="mt-1 text-sm text-red-600">{state.error.name[0]}</p>
          )}
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("email")}
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            defaultValue={prefillEmail}
            className={state?.error?.email ? "border-red-500" : ""}
          />
          {state?.error?.email && (
            <p className="mt-1 text-sm text-red-600">{state.error.email[0]}</p>
          )}
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("password")}
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="At least 8 characters"
            className={state?.error?.password ? "border-red-500" : ""}
          />
          {state?.error?.password && (
            <p className="mt-1 text-sm text-red-600">{state.error.password[0]}</p>
          )}
        </div>
        <Button type="submit" variant="primary" className="w-full" disabled={pending}>
          {t("createAccount")}
        </Button>
      </div>
    </>
  );
}

export function RegisterForm({
  locale,
  prefillEmail,
  redirectTo,
  providers,
}: {
  locale: string;
  prefillEmail?: string;
  redirectTo?: string;
  providers: {
    google: boolean;
    facebook: boolean;
    line: boolean;
  };
}) {
  const [state, setState] = useState<{ error?: FieldErrors }>({});
  const [pending, setPending] = useState(false);
  const t = useTranslations("auth");
  const defaultCallbackUrl = resolvePostAuthRedirect(locale, redirectTo);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState({});
    setPending(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const accountType = String(formData.get("accountType") ?? "customer");
    const result = await register(undefined, formData);

    if ("error" in result && result.error) {
      setState({ error: result.error });
      setPending(false);
      return;
    }

    if (!("ok" in result) || !result.ok) {
      setPending(false);
      return;
    }

    const role = "role" in result && result.role ? result.role : accountType;
    const callbackUrl = resolvePostAuthRedirect(locale, redirectTo, role);

    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    const password = String(formData.get("password") ?? "");
    const signInResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setPending(false);

    if (signInResult?.error) {
      setState({ error: { email: [t("signInAfterRegisterFailed")] } });
      return;
    }

    window.location.assign(callbackUrl);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <RegisterFormInner
        state={state}
        prefillEmail={prefillEmail}
        pending={pending}
        callbackUrl={defaultCallbackUrl}
        providers={providers}
      />
    </form>
  );
}
