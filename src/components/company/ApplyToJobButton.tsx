"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { applyToJobPosting } from "@/actions/job-applications";
import { Link } from "@/i18n/navigation";

export function ApplyToJobButton({
  jobPostingId,
  isFreelancer,
  isLoggedIn = false,
  alreadyApplied = false,
}: {
  jobPostingId: string;
  isFreelancer: boolean;
  isLoggedIn?: boolean;
  alreadyApplied?: boolean;
}) {
  const t = useTranslations("company");
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "ok" | "already" | "error">(
    alreadyApplied ? "already" : "idle"
  );
  const [coverNote, setCoverNote] = useState("");
  const [showForm, setShowForm] = useState(false);

  if (!isFreelancer) {
    if (isLoggedIn) {
      return null;
    }
    return (
      <Button asChild variant="outline" size="sm">
        <Link href={`/login?redirect=${encodeURIComponent("/portal/freelancer")}`}>
          {t("loginToApply")}
        </Link>
      </Button>
    );
  }

  if (status === "ok") {
    return <p className="text-sm font-medium text-emerald-600">{t("applySuccess")}</p>;
  }

  if (status === "already") {
    return <p className="text-sm font-medium text-gray-500">{t("alreadyApplied")}</p>;
  }

  if (!showForm) {
    return (
      <Button type="button" size="sm" onClick={() => setShowForm(true)}>
        {t("apply")}
      </Button>
    );
  }

  return (
    <div className="w-full space-y-2">
      <textarea
        value={coverNote}
        onChange={(e) => setCoverNote(e.target.value)}
        placeholder={t("coverNote")}
        rows={3}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const result = await applyToJobPosting({
                jobPostingId,
                coverNote: coverNote.trim() || undefined,
              });
              if (result.error === "already_applied") {
                setStatus("already");
                return;
              }
              if (result.error) {
                setStatus("error");
                return;
              }
              setStatus("ok");
            });
          }}
        >
          {t("submitApplication")}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>
          Cancel
        </Button>
      </div>
      {status === "error" && (
        <p className="text-sm text-red-600">{t("errorGeneric")}</p>
      )}
    </div>
  );
}
