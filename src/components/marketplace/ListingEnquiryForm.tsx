"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createEnquiryAction } from "@/actions/listing-enquiries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ListingEnquiryFormProps = {
  listingType: "vehicle" | "property";
  listingId: string;
  listingTitle: string;
  defaultName?: string;
  defaultEmail?: string;
  defaultPhone?: string;
};

export function ListingEnquiryForm({
  listingType,
  listingId,
  listingTitle,
  defaultName = "",
  defaultEmail = "",
  defaultPhone = "",
}: ListingEnquiryFormProps) {
  const t = useTranslations("listingEnquiry");
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState(defaultPhone);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus("idle");

    const result = await createEnquiryAction({
      listingType,
      listingId,
      name,
      email,
      phone,
      message,
    });

    setSubmitting(false);
    if (!result.ok) {
      setStatus("error");
      return;
    }
    setStatus("success");
    setMessage("");
  }

  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t("title")}</p>
      <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
        {t("subtitle", { listing: listingTitle })}
      </p>
      <form className="mt-4 space-y-3" onSubmit={onSubmit} noValidate>
        <div>
          <label htmlFor={`enquiry-name-${listingId}`} className="mb-1 block text-xs font-medium">
            {t("name")}
          </label>
          <Input
            id={`enquiry-name-${listingId}`}
            required
            minLength={2}
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor={`enquiry-email-${listingId}`} className="mb-1 block text-xs font-medium">
            {t("email")}
          </label>
          <Input
            id={`enquiry-email-${listingId}`}
            type="email"
            required
            maxLength={200}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor={`enquiry-phone-${listingId}`} className="mb-1 block text-xs font-medium">
            {t("phone")}
          </label>
          <Input
            id={`enquiry-phone-${listingId}`}
            type="tel"
            maxLength={40}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div>
          <label
            htmlFor={`enquiry-message-${listingId}`}
            className="mb-1 block text-xs font-medium"
          >
            {t("message")}
          </label>
          <textarea
            id={`enquiry-message-${listingId}`}
            required
            minLength={10}
            maxLength={2000}
            rows={3}
            className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-siam-blue focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-900"
            placeholder={t("messagePlaceholder")}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? t("submitting") : t("submit")}
        </Button>
        <p className="min-h-5 text-xs" role="status" aria-live="polite">
          {status === "success" && (
            <span className="text-green-600 dark:text-green-400">{t("success")}</span>
          )}
          {status === "error" && (
            <span className="text-red-600 dark:text-red-400">{t("error")}</span>
          )}
        </p>
      </form>
    </div>
  );
}
