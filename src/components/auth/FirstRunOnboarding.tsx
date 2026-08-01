"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { completeFirstRunProfile } from "@/actions/auth";
import {
  FIRST_RUN_WELCOME_STORAGE_KEY,
  isRecentCustomer,
  needsFirstRunProfile,
  type FirstRunUserSnapshot,
} from "@/lib/auth-first-run";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldHint, FieldLabel } from "@/components/ui/field";
import { fadeInUp, motionTransition, scaleIn } from "@/components/ui/motion";
import { Link } from "@/i18n/navigation";

type Phase = "welcome" | "profile" | null;

export function FirstRunOnboarding({ user }: { user: FirstRunUserSnapshot }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<Phase>(null);
  const [name, setName] = useState(user.name ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [preferredLocale, setPreferredLocale] = useState<"en" | "th">(
    user.preferredLocale === "th" ? "th" : locale === "th" ? "th" : "en"
  );
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (user.role !== "customer") return;

    const forceWelcome = searchParams.get("welcome") === "1";
    let welcomeSeen = false;
    try {
      welcomeSeen = window.localStorage.getItem(FIRST_RUN_WELCOME_STORAGE_KEY) === "1";
    } catch {
      welcomeSeen = false;
    }

    const showWelcome =
      forceWelcome || ((!welcomeSeen && isRecentCustomer(user)) as boolean);
    const showProfile = needsFirstRunProfile(user);

    if (showWelcome) {
      setPhase("welcome");
    } else if (showProfile) {
      setPhase("profile");
    }
  }, [searchParams, user]);

  function markWelcomeSeen() {
    try {
      window.localStorage.setItem(FIRST_RUN_WELCOME_STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  function finishWelcome() {
    markWelcomeSeen();
    if (needsFirstRunProfile({ ...user, phone: phone || user.phone })) {
      setPhase("profile");
      return;
    }
    setPhase(null);
    clearWelcomeQuery();
  }

  function skipProfile() {
    markWelcomeSeen();
    setPhase(null);
    clearWelcomeQuery();
  }

  function clearWelcomeQuery() {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("welcome")) return;
    url.searchParams.delete("welcome");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
  }

  function submitProfile() {
    setError(undefined);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", name.trim());
      formData.set("phone", phone.trim());
      formData.set("preferredLocale", preferredLocale);
      const result = await completeFirstRunProfile(undefined, formData);
      if ("error" in result && result.error) {
        const msg =
          typeof result.error === "string"
            ? result.error
            : result.error.phone?.[0] ||
              result.error.name?.[0] ||
              result.error.preferredLocale?.[0] ||
              t("firstRunSaveFailed");
        setError(msg);
        return;
      }
      markWelcomeSeen();
      setPhase(null);
      clearWelcomeQuery();
    });
  }

  const open = phase !== null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && skipProfile()}>
      <DialogContent
        showClose
        onClose={skipProfile}
        className="max-w-md overflow-hidden"
      >
        <motion.div
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          transition={motionTransition}
        >
          <AnimatePresence mode="wait">
            {phase === "welcome" ? (
              <motion.div
                key="welcome"
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={motionTransition}
              >
                <DialogHeader>
                  <DialogTitle>{t("welcomeTitle", { name: user.name?.split(" ")[0] || "there" })}</DialogTitle>
                  <DialogDescription>{t("welcomeSubtitle")}</DialogDescription>
                </DialogHeader>
                <ul className="mt-4 space-y-2 text-sm text-foreground">
                  <li className="flex gap-2">
                    <span className="text-siam-blue" aria-hidden>
                      •
                    </span>
                    {t("welcomePointCases")}
                  </li>
                  <li className="flex gap-2">
                    <span className="text-siam-blue" aria-hidden>
                      •
                    </span>
                    {t("welcomePointBook")}
                  </li>
                  <li className="flex gap-2">
                    <span className="text-siam-blue" aria-hidden>
                      •
                    </span>
                    {t("welcomePointDocs")}
                  </li>
                </ul>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={skipProfile}>
                    {t("welcomeSkip")}
                  </Button>
                  <Button type="button" variant="primary" onClick={finishWelcome}>
                    {needsFirstRunProfile(user) ? t("welcomeContinue") : t("welcomeDone")}
                  </Button>
                </DialogFooter>
              </motion.div>
            ) : null}

            {phase === "profile" ? (
              <motion.div
                key="profile"
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={motionTransition}
              >
                <DialogHeader>
                  <DialogTitle>{t("firstRunTitle")}</DialogTitle>
                  <DialogDescription>{t("firstRunSubtitle")}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Field>
                    <FieldLabel htmlFor="first-run-name" required>
                      {t("name")}
                    </FieldLabel>
                    <Input
                      id="first-run-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="first-run-phone" required>
                      {t("phone")}
                    </FieldLabel>
                    <Input
                      id="first-run-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoComplete="tel"
                      placeholder={t("phonePlaceholder")}
                    />
                    <FieldHint>{t("firstRunPhoneHint")}</FieldHint>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="first-run-locale">{t("preferredLocale")}</FieldLabel>
                    <select
                      id="first-run-locale"
                      value={preferredLocale}
                      onChange={(e) =>
                        setPreferredLocale(e.target.value === "th" ? "th" : "en")
                      }
                      className="flex h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
                    >
                      <option value="en">{t("localeEnglish")}</option>
                      <option value="th">{t("localeThai")}</option>
                    </select>
                  </Field>
                  {error ? <FieldError error={error} /> : null}
                  <p className="text-xs text-muted">
                    {t("firstRunProfileLater")}{" "}
                    <Link href="/portal/profile" className="font-medium text-siam-blue hover:underline">
                      {t("firstRunProfileLink")}
                    </Link>
                  </p>
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={skipProfile} disabled={pending}>
                    {t("welcomeSkip")}
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={submitProfile}
                    disabled={pending}
                  >
                    {pending ? t("firstRunSaving") : t("firstRunSave")}
                  </Button>
                </DialogFooter>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
