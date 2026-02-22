import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "./LoginForm";
import { Link } from "@/i18n/navigation";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { locale } = await params;
  const { redirect: redirectTo } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-800">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-siam-blue">
          <span className="text-xl font-bold text-white">SZ</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("login")}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("loginSubtitle")}</p>
      </div>
      <LoginForm redirectTo={redirectTo} />
      <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
        {t("noAccount")}{" "}
        <Link href="/register" className="font-medium text-siam-blue hover:underline">
          {t("register")}
        </Link>
      </p>
    </div>
  );
}
