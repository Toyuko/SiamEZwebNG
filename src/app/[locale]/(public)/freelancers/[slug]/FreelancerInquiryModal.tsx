"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function FreelancerInquiryModal({
  open,
  onClose,
  slug,
  freelancerName,
}: {
  open: boolean;
  onClose: () => void;
  slug: string;
  freelancerName: string;
}) {
  const t = useTranslations("freelancersPublic");
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function handleClose() {
    onClose();
    setError(null);
    setSent(false);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/freelancers/inquiry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, name, email, phone, message }),
        });
        const json = await res.json();
        if (!json.success) {
          setError(json.error ?? t("inquiryError"));
          return;
        }
        setSent(true);
        setName("");
        setEmail("");
        setPhone("");
        setMessage("");
      } catch {
        setError(t("inquiryError"));
      }
    });
  }

  return (
    <Modal open={open} onClose={handleClose} title={t("inquiryTitle", { name: freelancerName })}>
      {sent ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">{t("inquirySuccess")}</p>
          <Button type="button" onClick={handleClose}>
            {t("close")}
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inquiry-name">{t("inquiryName")}</Label>
            <Input
              id="inquiry-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inquiry-email">{t("inquiryEmail")}</Label>
            <Input
              id="inquiry-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inquiry-phone">{t("inquiryPhone")}</Label>
            <Input
              id="inquiry-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={40}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inquiry-message">{t("inquiryMessage")}</Label>
            <textarea
              id="inquiry-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              minLength={10}
              maxLength={2000}
              rows={4}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-siam-blue focus:outline-none focus:ring-2 focus:ring-siam-blue/30 dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? t("inquirySending") : t("inquirySend")}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose}>
              {t("cancel")}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
