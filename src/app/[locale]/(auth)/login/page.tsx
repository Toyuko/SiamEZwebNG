import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "./LoginForm";
import { Link } from "@/i18n/navigation";
import { safeRedirectQueryParam } from "@/lib/auth-redirect";
import { getConfiguredSocialProviders } from "@/lib/auth-providers";
import { AuthShell } from "@/components/auth/AuthShell";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { locale } = await params;
  const { redirect: redirectRaw } = await searchParams;
  const redirectTo = safeRedirectQueryParam(redirectRaw);
  const registerHref = redirectTo
    ? `/register?redirect=${encodeURIComponent(redirectTo)}`
    : "/register";
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  const providers = getConfiguredSocialProviders();

  return (
    <AuthShell
      title={t("login")}
      subtitle={t("loginSubtitle")}
      footer={
        <>
          {t("noAccount")}{" "}
          <Link href={registerHref} className="font-medium text-siam-blue hover:underline">
            {t("register")}
          </Link>
        </>
      }
    >
      <LoginForm redirectTo={redirectTo} providers={providers} />
    </AuthShell>
  );
}
