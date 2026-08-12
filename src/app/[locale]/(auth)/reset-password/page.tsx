import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  const { token } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <AuthShell
      title={t("resetPasswordTitle")}
      subtitle={t("resetPasswordSubtitle")}
      footer={
        <>
          <Link href="/login" className="font-medium text-siam-blue hover:underline">
            {t("backToSignIn")}
          </Link>
        </>
      }
    >
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">{t("resetPasswordInvalid")}</p>
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-siam-blue hover:underline"
          >
            {t("requestNewResetLink")}
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
