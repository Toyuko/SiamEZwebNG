"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  User,
  Shield,
  Bell,
  Palette,
  Database,
  ExternalLink,
  Wallet,
  IdCard,
  LifeBuoy,
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
  logoutAllDevices,
  updateNotificationSettings,
  updatePortalProfile,
} from "@/actions/portal-settings";

type InvoiceSummary = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
};

type PaymentSummary = {
  id: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  createdAt: string;
};

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
  invoices: InvoiceSummary[];
  payments: PaymentSummary[];
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

type TabId = "profile" | "security" | "notifications" | "appearance" | "privacy" | "payments" | "myInfo" | "support";

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

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount / 100);
}

export function PortalSettings({ user: initial, hasPassword }: PortalSettingsProps) {
  const t = useTranslations("portal.accountSettings");
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("profile");
  const [pushEnabled, setPushEnabled] = useState(initial.notificationPreferences.pushEnabled);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const tabs = useMemo(
    () =>
      [
        { id: "profile" as const, label: t("tabProfile"), icon: User },
        { id: "security" as const, label: t("tabSecurity"), icon: Shield },
        { id: "notifications" as const, label: t("tabNotifications"), icon: Bell },
        { id: "payments" as const, label: "Payments", icon: Wallet },
        { id: "myInfo" as const, label: "My information", icon: IdCard },
        { id: "support" as const, label: "Support", icon: LifeBuoy },
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
              <Label htmlFor="passportInfo">Passport info</Label>
              <Input
                id="passportInfo"
                name="passportInfo"
                className="mt-1"
                defaultValue={initial.notificationPreferences.passportInfo ?? ""}
                autoComplete="off"
                placeholder="Passport number and issuing country"
              />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                className="mt-1"
                defaultValue={initial.notificationPreferences.address ?? ""}
                autoComplete="street-address"
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
            <section className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Logout all devices</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                End the current session. Multi-device logout requires token-versioned auth and will be added next.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-4 border-siam-blue text-siam-blue"
                disabled={pending}
                onClick={() => {
                  clearMessage();
                  startTransition(async () => {
                    const r = await logoutAllDevices();
                    if (r && "ok" in r && r.ok) {
                      router.refresh();
                    } else if (r && "error" in r) {
                      setMessage({ kind: "err", text: typeof r.error === "string" ? r.error : t("genericError") });
                    }
                  });
                }}
              >
                {pending ? t("saving") : "Logout now"}
              </Button>
            </section>
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
                name="pushEnabled"
                checked={pushEnabled}
                onChange={(e) => setPushEnabled(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-siam-blue focus:ring-siam-blue"
              />
              <span>
                <span className="font-medium text-gray-900 dark:text-white">Push notifications</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  Master switch for case, payment, and document alerts.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-600">
              <input
                type="checkbox"
                name="emailCaseUpdates"
                defaultChecked={initial.notificationPreferences.emailCaseUpdates}
                disabled={!pushEnabled}
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
                disabled={!pushEnabled}
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
                disabled={!pushEnabled}
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

        {tab === "payments" && (
          <div className="space-y-6">
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Payment methods</h2>
              <ul className="mt-3 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li>Thai QR (PromptPay)</li>
                <li>Bank transfer</li>
                <li>Wise</li>
              </ul>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Payment history</h2>
              <div className="mt-3 space-y-2">
                {initial.payments.length === 0 ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400">No payments yet.</p>
                ) : (
                  initial.payments.map((payment) => (
                    <div key={payment.id} className="rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {formatMoney(payment.amount, payment.currency)} - {payment.method.toUpperCase()}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">
                        {payment.status} -{" "}
                        {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(payment.createdAt))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Invoice history</h2>
              <div className="mt-3 space-y-2">
                {initial.invoices.length === 0 ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400">No invoices yet.</p>
                ) : (
                  initial.invoices.map((invoice) => (
                    <div key={invoice.id} className="rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700">
                      <div className="font-medium text-gray-900 dark:text-white">{formatMoney(invoice.amount, invoice.currency)}</div>
                      <div className="text-gray-600 dark:text-gray-400">
                        {invoice.status} -{" "}
                        {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(invoice.createdAt))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}

        {tab === "myInfo" && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              clearMessage();
              const fd = new FormData(e.currentTarget);
              fd.append("preferredLocale", initial.preferredLocale === "th" ? "th" : "en");
              fd.append("image", initial.image ?? "");
              fd.append("timezone", initial.timezone ?? "");
              startTransition(async () => {
                const r = await updatePortalProfile(null, fd);
                if (r && "ok" in r && r.ok) {
                  setMessage({ kind: "ok", text: "Information saved." });
                  router.refresh();
                } else if (r && "error" in r) {
                  setMessage({ kind: "err", text: formatFieldErrors(r.error) ?? t("genericError") });
                }
              });
            }}
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">My information</h2>
            <div>
              <Label htmlFor="myInfoName">Name</Label>
              <Input id="myInfoName" name="name" className="mt-1" defaultValue={initial.name ?? ""} required />
            </div>
            <div>
              <Label htmlFor="myInfoPhone">Phone</Label>
              <Input id="myInfoPhone" name="phone" className="mt-1" defaultValue={initial.phone ?? ""} />
            </div>
            <div>
              <Label htmlFor="myInfoPassport">Passport info</Label>
              <Input
                id="myInfoPassport"
                name="passportInfo"
                className="mt-1"
                defaultValue={initial.notificationPreferences.passportInfo ?? ""}
              />
            </div>
            <div>
              <Label htmlFor="myInfoAddress">Address</Label>
              <Input
                id="myInfoAddress"
                name="address"
                className="mt-1"
                defaultValue={initial.notificationPreferences.address ?? ""}
              />
            </div>
            <Button type="submit" disabled={pending} className="bg-siam-blue hover:bg-siam-blue/90">
              {pending ? t("saving") : "Save information"}
            </Button>
          </form>
        )}

        {tab === "support" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Support</h2>
            <Link href="/contact" className="block rounded-lg border border-gray-200 p-3 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50">
              Contact support
            </Link>
            <a
              href="https://wa.me/66859047812"
              target="_blank"
              rel="noreferrer"
              className="block rounded-lg border border-gray-200 p-3 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50"
            >
              WhatsApp chat
            </a>
            <Link href="/services" className="block rounded-lg border border-gray-200 p-3 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50">
              FAQ
            </Link>
          </div>
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
