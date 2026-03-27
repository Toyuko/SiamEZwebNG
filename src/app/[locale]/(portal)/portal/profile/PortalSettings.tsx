"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  User,
  Shield,
  Bell,
  Palette,
  Database,
  ExternalLink,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { LanguageSwitcher } from "@/components/portal/LanguageSwitcher";
import type { NotificationPreferences } from "@/lib/notification-preferences";
import {
  changePassword,
  deactivateAccount,
  updateNotificationSettings,
  updatePortalProfile,
} from "@/actions/portal-settings";

export type PortalSettingsUser = {
  name: string | null;
  email: string;
  phone: string | null;
  image: string | null;
  timezone: string | null;
  preferredLocale: string;
  lastLoginAt: string | null;
  notificationPreferences: NotificationPreferences;
  linkedProviders: string[];
};

const TIMEZONES = [
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Tokyo",
  "UTC",
  "Europe/London",
  "America/New_York",
];

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  facebook: "Facebook",
  line: "LINE",
};

type TabId = "profile" | "security" | "notifications" | "appearance" | "privacy";

interface PortalSettingsProps {
  user: PortalSettingsUser;
  hasPassword: boolean;
}

function formatFieldErrors(error: unknown): string | null {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const o = error as Record<string, string[] | undefined>;
    for (const arr of Object.values(o)) {
      if (Array.isArray(arr) && arr[0]) return arr[0];
    }
  }
  return null;
}

export function PortalSettings({ user: initial, hasPassword }: PortalSettingsProps) {
  const t = useTranslations("portal.accountSettings");
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("profile");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const tabs = useMemo(
    () =>
      [
        { id: "profile" as const, label: t("tabProfile"), icon: User },
        { id: "security" as const, label: t("tabSecurity"), icon: Shield },
        { id: "notifications" as const, label: t("tabNotifications"), icon: Bell },
        { id: "appearance" as const, label: t("tabAppearance"), icon: Palette },
        { id: "privacy" as const, label: t("tabPrivacy"), icon: Database },
      ] as const,
    [t]
  );

  function clearMessage() {
    setMessage(null);
  }

  return (
    <div className="mt-8 max-w-3xl">
      <div
        className="flex flex-wrap gap-2 border-b border-gray-200 pb-2 dark:border-gray-700"
        role="tablist"
        aria-label={t("ariaTablist")}
      >
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              tab === id
                ? "bg-siam-blue text-white"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            )}
            onClick={() => {
              setTab(id);
              clearMessage();
            }}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900/40">
        {message && (
          <div
            className={cn(
              "mb-4 rounded-lg px-3 py-2 text-sm",
              message.kind === "ok"
                ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"
                : "bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200"
            )}
            role="status"
          >
            {message.text}
          </div>
        )}

        {tab === "profile" && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              clearMessage();
              const fd = new FormData(e.currentTarget);
              startTransition(async () => {
                const r = await updatePortalProfile(null, fd);
                if (r && "ok" in r && r.ok) {
                  setMessage({ kind: "ok", text: t("savedProfile") });
                  router.refresh();
                } else if (r && "error" in r) {
                  const err = r.error;
                  setMessage({
                    kind: "err",
                    text: formatFieldErrors(err) ?? t("genericError"),
                  });
                }
              });
            }}
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("personalInfo")}</h2>
            <div>
              <Label htmlFor="name">{t("fullName")}</Label>
              <Input
                id="name"
                name="name"
                className="mt-1"
                defaultValue={initial.name ?? ""}
                required
                autoComplete="name"
              />
            </div>
            <div>
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                value={initial.email}
                readOnly
                disabled
                className="mt-1 cursor-not-allowed bg-gray-100 dark:bg-gray-800"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t("emailReadOnlyHint")}</p>
            </div>
            <div>
              <Label htmlFor="phone">{t("phone")}</Label>
              <Input
                id="phone"
                name="phone"
                className="mt-1"
                defaultValue={initial.phone ?? ""}
                autoComplete="tel"
                placeholder={t("phonePlaceholder")}
              />
            </div>
            <div>
              <Label htmlFor="image">{t("profileImageUrl")}</Label>
              <Input
                id="image"
                name="image"
                className="mt-1"
                defaultValue={initial.image ?? ""}
                placeholder="https://"
                autoComplete="off"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t("profileImageHint")}</p>
            </div>
            <div>
              <Label htmlFor="timezone">{t("timezone")}</Label>
              <Select
                id="timezone"
                name="timezone"
                className="mt-1"
                defaultValue={initial.timezone ?? ""}
              >
                <option value="">{t("timezonePlaceholder")}</option>
                {TIMEZONES.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="preferredLocale">{t("preferredLocale")}</Label>
              <Select
                id="preferredLocale"
                name="preferredLocale"
                className="mt-1"
                defaultValue={initial.preferredLocale === "th" ? "th" : "en"}
                required
              >
                <option value="en">English</option>
                <option value="th">ไทย (Thai)</option>
              </Select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t("preferredLocaleHint")}</p>
            </div>
            <Button type="submit" disabled={pending} className="bg-siam-blue hover:bg-siam-blue/90">
              {pending ? t("saving") : t("saveProfile")}
            </Button>
          </form>
        )}

        {tab === "security" && (
          <div className="space-y-8">
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("signInMethods")}</h2>
              <ul className="mt-3 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                {initial.linkedProviders.length === 0 && !hasPassword && (
                  <li className="text-gray-500">{t("noLinkedProviders")}</li>
                )}
                {hasPassword && (
                  <li className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-siam-blue" />
                    {t("passwordSignInEnabled")}
                  </li>
                )}
                {initial.linkedProviders.map((p) => (
                  <li key={p} className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-siam-blue" />
                    {PROVIDER_LABELS[p] ?? p}
                  </li>
                ))}
              </ul>
            </section>

            {initial.lastLoginAt && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("lastSignIn")}</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {new Intl.DateTimeFormat(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(initial.lastLoginAt))}
                </p>
              </section>
            )}

            {hasPassword ? (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("changePassword")}</h2>
                <form
                  className="mt-4 max-w-md space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    clearMessage();
                    const fd = new FormData(e.currentTarget);
                    startTransition(async () => {
                      const r = await changePassword(null, fd);
                      if (r && "ok" in r && r.ok) {
                        setMessage({ kind: "ok", text: t("passwordChanged") });
                        (e.target as HTMLFormElement).reset();
                      } else if (r && "error" in r) {
                        const err = r.error;
                        setMessage({
                          kind: "err",
                          text: formatFieldErrors(err) ?? t("genericError"),
                        });
                      }
                    });
                  }}
                >
                  <div>
                    <Label htmlFor="currentPassword">{t("currentPassword")}</Label>
                    <Input
                      id="currentPassword"
                      name="currentPassword"
                      type="password"
                      className="mt-1"
                      autoComplete="current-password"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="newPassword">{t("newPassword")}</Label>
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      className="mt-1"
                      autoComplete="new-password"
                      required
                      minLength={8}
                    />
                  </div>
                  <Button type="submit" disabled={pending} variant="outline" className="border-siam-blue text-siam-blue">
                    {pending ? t("saving") : t("updatePassword")}
                  </Button>
                </form>
              </section>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400">{t("oauthOnlyPassword")}</p>
            )}

            <p className="text-xs text-gray-500 dark:text-gray-400">{t("securityTip")}</p>
          </div>
        )}

        {tab === "notifications" && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              clearMessage();
              const fd = new FormData(e.currentTarget);
              startTransition(async () => {
                const r = await updateNotificationSettings(null, fd);
                if (r && "ok" in r && r.ok) {
                  setMessage({ kind: "ok", text: t("savedNotifications") });
                  router.refresh();
                } else if (r && "error" in r) {
                  setMessage({ kind: "err", text: typeof r.error === "string" ? r.error : t("genericError") });
                }
              });
            }}
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("emailNotifications")}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t("notificationsIntro")}</p>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-600">
              <input
                type="checkbox"
                name="emailCaseUpdates"
                defaultChecked={initial.notificationPreferences.emailCaseUpdates}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-siam-blue focus:ring-siam-blue"
              />
              <span>
                <span className="font-medium text-gray-900 dark:text-white">{t("notifCaseUpdates")}</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">{t("notifCaseUpdatesDesc")}</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-600">
              <input
                type="checkbox"
                name="emailInvoiceReminders"
                defaultChecked={initial.notificationPreferences.emailInvoiceReminders}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-siam-blue focus:ring-siam-blue"
              />
              <span>
                <span className="font-medium text-gray-900 dark:text-white">{t("notifInvoices")}</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">{t("notifInvoicesDesc")}</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-600">
              <input
                type="checkbox"
                name="emailDocumentAlerts"
                defaultChecked={initial.notificationPreferences.emailDocumentAlerts}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-siam-blue focus:ring-siam-blue"
              />
              <span>
                <span className="font-medium text-gray-900 dark:text-white">{t("notifDocuments")}</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">{t("notifDocumentsDesc")}</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-600">
              <input
                type="checkbox"
                name="emailMarketing"
                defaultChecked={initial.notificationPreferences.emailMarketing}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-siam-blue focus:ring-siam-blue"
              />
              <span>
                <span className="font-medium text-gray-900 dark:text-white">{t("notifMarketing")}</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">{t("notifMarketingDesc")}</span>
              </span>
            </label>
            <Button type="submit" disabled={pending} className="bg-siam-blue hover:bg-siam-blue/90">
              {pending ? t("saving") : t("saveNotifications")}
            </Button>
          </form>
        )}

        {tab === "appearance" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("themeTitle")}</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("themeHint")}</p>
              <div className="mt-4 flex justify-start">
                <ThemeSwitcher variant="default" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("languageTitle")}</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("languageHint")}</p>
              <div className="mt-4">
                <LanguageSwitcher variant="default" />
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t("appearanceSidebarNote")}</p>
          </div>
        )}

        {tab === "privacy" && (
          <div className="space-y-6">
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("exportTitle")}</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("exportHint")}</p>
              <a
                href="/api/portal/export-data"
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-siam-blue hover:underline"
              >
                <Database className="h-4 w-4" />
                {t("downloadJson")}
                <ExternalLink className="h-3 w-3 opacity-70" />
              </a>
            </section>
            <section className="rounded-lg border border-red-200 bg-red-50/50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
              <h2 className="text-lg font-semibold text-red-900 dark:text-red-200">{t("dangerZone")}</h2>
              <p className="mt-1 text-sm text-red-800/90 dark:text-red-300/90">{t("deactivateHint")}</p>
              <form
                className="mt-4 max-w-md space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  clearMessage();
                  const fd = new FormData(e.currentTarget);
                  startTransition(async () => {
                    const r = await deactivateAccount(null, fd);
                    if (r && "error" in r) {
                      setMessage({ kind: "err", text: typeof r.error === "string" ? r.error : t("genericError") });
                    }
                  });
                }}
              >
                <div>
                  <Label htmlFor="confirmEmail">{t("confirmEmailLabel")}</Label>
                  <Input
                    id="confirmEmail"
                    name="confirmEmail"
                    type="email"
                    className="mt-1"
                    autoComplete="off"
                    placeholder={initial.email}
                    aria-label={t("confirmEmailLabel")}
                  />
                </div>
                <Button type="submit" variant="outline" disabled={pending} className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40">
                  {pending ? t("saving") : t("deactivateAccount")}
                </Button>
              </form>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
