"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { site } from "@/config/site";

type SubmitState = "idle" | "success" | "error";

export function DeleteAccountForm({ processingDays }: { processingDays: number }) {
  const t = useTranslations("accountDeletion");
  const locale = useLocale();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/account/deletion-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, confirmed, locale }),
        });
        const data = (await res.json()) as {
          success?: boolean;
          error?: string;
          data?: { message?: string };
        };
        if (!res.ok || !data.success) {
          setState("error");
          setError(
            res.status === 429
              ? t("errors.rateLimited")
              : data.error || t("errors.generic")
          );
          return;
        }
        setState("success");
      } catch {
        setState("error");
        setError(t("errors.generic"));
      }
    });
  }

  if (state === "success") {
    return (
      <div className="space-y-6 text-center">
        <h2 className="text-2xl font-semibold text-siam-blue">{t("success.title")}</h2>
        <p className="text-sm leading-7 text-muted-foreground">{t("success.body")}</p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/">{t("success.returnHome")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/privacy">{t("privacyPolicy")}</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/contact">{t("contactSupport")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex justify-end gap-2 text-sm">
        <Link
          href={pathname}
          locale="en"
          className={locale === "en" ? "font-semibold text-siam-blue" : "text-muted-foreground hover:text-foreground"}
        >
          English
        </Link>
        <span className="text-muted-foreground">|</span>
        <Link
          href={pathname}
          locale="th"
          className={locale === "th" ? "font-semibold text-siam-blue" : "text-muted-foreground hover:text-foreground"}
        >
          ไทย
        </Link>
      </div>

      <form onSubmit={onSubmit} className="mx-auto max-w-md space-y-5">
        <div>
          <Label htmlFor="deletion-email">{t("emailLabel")}</Label>
          <Input
            id="deletion-email"
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1"
            placeholder="you@example.com"
          />
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 text-sm leading-6 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          {t("warning")}
        </div>

        <label className="flex items-start gap-3 text-sm leading-6">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-gray-300"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            required
          />
          <span>{t("confirmation")}</span>
        </label>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}

        <Button
          type="submit"
          variant="outline"
          disabled={pending || !confirmed || !email.trim()}
          className="w-full border-red-400 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
        >
          {pending ? t("submitting") : t("submit")}
        </Button>
      </form>

      <div className="grid gap-8 border-t border-border pt-8 sm:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">{t("whatHappens.title")}</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
            <li>{t("whatHappens.account")}</li>
            <li>{t("whatHappens.profile")}</li>
            <li>{t("whatHappens.personal")}</li>
            <li>{t("whatHappens.retained")}</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">{t("timeframe.title")}</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {t("timeframe.body", { days: processingDays })}
          </p>
          <h2 className="pt-2 text-lg font-semibold text-foreground">{t("retention.title")}</h2>
          <p className="text-sm leading-6 text-muted-foreground">{t("retention.body")}</p>
        </section>
      </div>

      <section className="space-y-2 border-t border-border pt-6 text-sm text-muted-foreground">
        <p>
          {t("needHelp")}{" "}
          <a className="font-medium text-siam-blue hover:underline" href={`mailto:${site.email}`}>
            {site.email}
          </a>
          {" · "}
          <a className="font-medium text-siam-blue hover:underline" href={`tel:${site.phone.replace(/\s/g, "")}`}>
            {site.phone}
          </a>
        </p>
        <p>
          <Link href="/privacy" className="font-medium text-siam-blue hover:underline">
            {t("privacyPolicy")}
          </Link>
          {" · "}
          <Link href="/contact" className="font-medium text-siam-blue hover:underline">
            {t("contactSupport")}
          </Link>
          {" · "}
          <Link href="/portal/profile" className="font-medium text-siam-blue hover:underline">
            {t("signedInLink")}
          </Link>
        </p>
      </section>
    </div>
  );
}
