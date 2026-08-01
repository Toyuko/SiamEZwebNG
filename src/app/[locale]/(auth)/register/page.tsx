import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { RegisterForm } from "./RegisterForm";
import { Link } from "@/i18n/navigation";
import { safeRedirectQueryParam } from "@/lib/auth-redirect";
import { getConfiguredSocialProviders } from "@/lib/auth-providers";
import { AuthShell } from "@/components/auth/AuthShell";

export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ email?: string; redirect?: string }>;
}) {
  const { locale } = await params;
  const { email, redirect: redirectRaw } = await searchParams;
  const redirectTo = safeRedirectQueryParam(redirectRaw);
  const loginHref = redirectTo
    ? `/login?redirect=${encodeURIComponent(redirectTo)}`
    : "/login";
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  const providers = getConfiguredSocialProviders();

  return (
    <AuthShell
      title={t("register")}
      subtitle={t("registerSubtitle")}
      footer={
        <>
          {t("hasAccount")}{" "}
          <Link href={loginHref} className="font-medium text-siam-blue hover:underline">
            {t("login")}
          </Link>
        </>
      }
    >
      <RegisterForm
        locale={locale}
        prefillEmail={email ?? undefined}
        redirectTo={redirectTo}
        providers={providers}
      />
    </AuthShell>
  );
}
