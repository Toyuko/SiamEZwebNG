"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ExternalLink, Plus, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import { normalizeSlug } from "@/lib/freelancer-profile";
import { updateFreelancerPublicProfile } from "@/actions/freelancer-profile";
import type { FreelancerServiceOffering } from "@/lib/freelancer-profile";
import { Link } from "@/i18n/navigation";

export type FreelancerProfileFormInitial = {
  slug: string | null;
  isPublic: boolean;
  title: string | null;
  bio: string | null;
  skills: string[];
  hourlyRate: number | null;
  services: FreelancerServiceOffering[];
  verificationStatus?: string;
};

type ServiceDraft = {
  title: string;
  description: string;
  priceBaht: string;
};

function toServiceDrafts(services: FreelancerServiceOffering[]): ServiceDraft[] {
  if (!services.length) return [{ title: "", description: "", priceBaht: "" }];
  return services.map((s) => ({
    title: s.title,
    description: s.description ?? "",
    priceBaht: s.price != null ? String(s.price / 100) : "",
  }));
}

export function FreelancerProfileForm({
  initial,
  userName,
}: {
  initial: FreelancerProfileFormInitial | null;
  userName: string | null;
}) {
  const t = useTranslations("freelancerProfile");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [isPublic, setIsPublic] = useState(initial?.isPublic ?? false);
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [hourlyRateBaht, setHourlyRateBaht] = useState(
    initial?.hourlyRate != null ? String(initial.hourlyRate / 100) : ""
  );
  const [skills, setSkills] = useState<string[]>(initial?.skills ?? []);
  const [skillInput, setSkillInput] = useState("");
  const [services, setServices] = useState<ServiceDraft[]>(() =>
    toServiceDrafts(initial?.services ?? [])
  );

  const publicUrl = useMemo(() => {
    const s = normalizeSlug(slug);
    return s ? `/freelancers/${s}` : null;
  }, [slug]);

  function addSkill() {
    const value = skillInput.trim();
    if (!value) return;
    if (skills.some((s) => s.toLowerCase() === value.toLowerCase())) {
      setSkillInput("");
      return;
    }
    if (skills.length >= 30) return;
    setSkills((prev) => [...prev, value]);
    setSkillInput("");
  }

  function removeSkill(skill: string) {
    setSkills((prev) => prev.filter((s) => s !== skill));
  }

  function updateService(index: number, patch: Partial<ServiceDraft>) {
    setServices((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addService() {
    if (services.length >= 20) return;
    setServices((prev) => [...prev, { title: "", description: "", priceBaht: "" }]);
  }

  function removeService(index: number) {
    setServices((prev) => {
      if (prev.length <= 1) return [{ title: "", description: "", priceBaht: "" }];
      return prev.filter((_, i) => i !== index);
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);

    const formData = new FormData();
    formData.set("isPublic", isPublic ? "true" : "false");
    formData.set("slug", slug);
    formData.set("title", title);
    formData.set("bio", bio);
    formData.set("hourlyRate", hourlyRateBaht);
    formData.set("skills", JSON.stringify(skills));
    formData.set(
      "services",
      JSON.stringify(
        services
          .filter((s) => s.title.trim())
          .map((s) => ({
            title: s.title.trim(),
            description: s.description.trim(),
            priceBaht: s.priceBaht.trim() ? Number(s.priceBaht) : null,
            currency: "THB",
          }))
      )
    );

    startTransition(async () => {
      const result = await updateFreelancerPublicProfile(null, formData);
      if (!result.ok) {
        setMessage({ kind: "err", text: result.error });
        return;
      }
      setMessage({ kind: "ok", text: t("saved") });
      if (result.profile.slug) setSlug(result.profile.slug);
      setIsPublic(result.profile.isPublic);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("visibilityTitle")}</CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t("visibilityHint")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-gray-300 text-siam-blue focus:ring-siam-blue"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            <span>
              <span className="block font-medium text-gray-900 dark:text-white">
                {t("listPublicly")}
              </span>
              <span className="mt-1 block text-sm text-gray-600 dark:text-gray-400">
                {t("listPubliclyHint")}
              </span>
            </span>
          </label>

          <div className="space-y-2">
            <Label htmlFor="slug">{t("slugLabel")}</Label>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-500">/freelancers/</span>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                onBlur={() => setSlug(normalizeSlug(slug))}
                placeholder={t("slugPlaceholder")}
                className="max-w-xs font-mono"
                required
                minLength={3}
                maxLength={48}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              />
            </div>
            <p className="text-xs text-gray-500">{t("slugHint")}</p>
            {publicUrl && isPublic && (
              <Link
                href={publicUrl}
                className="inline-flex items-center gap-1 text-sm font-medium text-siam-blue hover:underline"
                target="_blank"
              >
                {t("viewPublicProfile")}
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("detailsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t("titleLabel")}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("titlePlaceholder")}
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">{t("bioLabel")}</Label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t("bioPlaceholder", { name: userName ?? "you" })}
              maxLength={4000}
              rows={6}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-siam-blue focus:outline-none focus:ring-2 focus:ring-siam-blue/30 dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hourlyRate">{t("hourlyRateLabel")}</Label>
            <div className="flex max-w-xs items-center gap-2">
              <Input
                id="hourlyRate"
                type="number"
                min={0}
                step="0.01"
                value={hourlyRateBaht}
                onChange={(e) => setHourlyRateBaht(e.target.value)}
                placeholder="500"
              />
              <span className="text-sm text-gray-500">THB / hr</span>
            </div>
            {hourlyRateBaht && Number.isFinite(Number(hourlyRateBaht)) && (
              <p className="text-xs text-gray-500">
                {formatCurrency(Math.round(Number(hourlyRateBaht) * 100))} / hr
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("skillsTitle")}</CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t("skillsHint")}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 rounded-full bg-siam-blue/10 px-3 py-1 text-sm text-siam-blue"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  className="rounded-full p-0.5 hover:bg-siam-blue/20"
                  aria-label={t("removeSkill", { skill })}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
            {skills.length === 0 && (
              <p className="text-sm text-gray-500">{t("noSkillsYet")}</p>
            )}
          </div>
          <div className="flex max-w-md gap-2">
            <Input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSkill();
                }
              }}
              placeholder={t("skillPlaceholder")}
              maxLength={40}
            />
            <Button type="button" variant="outline" onClick={addSkill}>
              {t("addSkill")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("servicesTitle")}</CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t("servicesHint")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {services.map((service, index) => (
            <div
              key={index}
              className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("serviceItem", { n: index + 1 })}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeService(index)}
                  aria-label={t("removeService")}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                <Label>{t("serviceTitleLabel")}</Label>
                <Input
                  value={service.title}
                  onChange={(e) => updateService(index, { title: e.target.value })}
                  placeholder={t("serviceTitlePlaceholder")}
                  maxLength={120}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("serviceDescriptionLabel")}</Label>
                <textarea
                  value={service.description}
                  onChange={(e) => updateService(index, { description: e.target.value })}
                  placeholder={t("serviceDescriptionPlaceholder")}
                  maxLength={500}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-siam-blue focus:outline-none focus:ring-2 focus:ring-siam-blue/30 dark:border-gray-700 dark:bg-gray-900"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("servicePriceLabel")}</Label>
                <div className="flex max-w-xs items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={service.priceBaht}
                    onChange={(e) => updateService(index, { priceBaht: e.target.value })}
                    placeholder="5000"
                  />
                  <span className="text-sm text-gray-500">THB</span>
                </div>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addService} disabled={services.length >= 20}>
            <Plus className="h-4 w-4" />
            {t("addService")}
          </Button>
        </CardContent>
      </Card>

      {message && (
        <p
          className={cn(
            "rounded-lg px-4 py-3 text-sm",
            message.kind === "ok"
              ? "bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-200"
              : "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200"
          )}
          role="status"
        >
          {message.text}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? t("saving") : t("save")}
        </Button>
        {publicUrl && isPublic && (
          <Button type="button" variant="outline" onClick={() => router.push(publicUrl)}>
            {t("previewProfile")}
          </Button>
        )}
      </div>
    </form>
  );
}
