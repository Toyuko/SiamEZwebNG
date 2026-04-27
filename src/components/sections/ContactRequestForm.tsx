"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FormState = {
  name: string;
  email: string;
  phone: string;
  service: string;
  message: string;
};

const INITIAL_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  service: "",
  message: "",
};

export function ContactRequestForm() {
  const t = useTranslations("contact");
  const tCommon = useTranslations("common");
  const tOptions = useTranslations("contactServiceOptions");
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus("idle");
    setErrorMessage("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        setStatus("error");
        setErrorMessage(json.error || t("submitFailed"));
        return;
      }
      setStatus("success");
      setForm(INITIAL_FORM);
    } catch {
      setStatus("error");
      setErrorMessage(t("submitFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-foreground">
          {t("fullName")}
        </label>
        <Input
          id="name"
          name="name"
          required
          minLength={2}
          maxLength={120}
          placeholder={t("yourName")}
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
        />
      </div>
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
          {t("emailAddress")}
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          maxLength={200}
          placeholder={t("emailPlaceholder")}
          value={form.email}
          onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
        />
      </div>
      <div>
        <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-foreground">
          {t("phoneNumber")}
        </label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          maxLength={40}
          placeholder={t("phonePlaceholder")}
          value={form.phone}
          onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
        />
      </div>
      <div>
        <label htmlFor="service" className="mb-1.5 block text-sm font-medium text-foreground">
          {t("serviceRequired")}
        </label>
        <select
          id="service"
          name="service"
          required
          value={form.service}
          onChange={(event) => setForm((prev) => ({ ...prev, service: event.target.value }))}
          className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-siam-blue focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-900 dark:ring-offset-gray-950"
        >
          <option value="">{t("selectService")}</option>
          <option value="marriage">{tOptions("marriage")}</option>
          <option value="translation">{tOptions("translation")}</option>
          <option value="driver">{tOptions("driver")}</option>
          <option value="police">{tOptions("police")}</option>
          <option value="visa">{tOptions("visa")}</option>
          <option value="construction">{tOptions("construction")}</option>
          <option value="vehicle">{tOptions("vehicle")}</option>
          <option value="transport">{tOptions("transport")}</option>
          <option value="driver-private">{tOptions("driver-private")}</option>
          <option value="event-planning">{tOptions("event-planning")}</option>
          <option value="other">{tOptions("other")}</option>
        </select>
      </div>
      <div>
        <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-foreground">
          {t("message")}
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          maxLength={2000}
          className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-siam-blue focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-900 dark:ring-offset-gray-950"
          placeholder={t("howCanWeHelp")}
          value={form.message}
          onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
        />
      </div>
      <Button type="submit" className="w-full sm:w-auto" size="lg" disabled={submitting}>
        {submitting ? t("submitting") : tCommon("submitRequest")}
      </Button>
      <p className="min-h-5 text-sm" role="status" aria-live="polite">
        {status === "success" && <span className="text-green-600 dark:text-green-400">{t("submitSuccess")}</span>}
        {status === "error" && <span className="text-red-600 dark:text-red-400">{errorMessage}</span>}
      </p>
    </form>
  );
}
