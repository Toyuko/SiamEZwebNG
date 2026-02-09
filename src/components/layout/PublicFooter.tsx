/**
 * ⚠️ FOOTER DESIGN IS LOCKED - DO NOT MODIFY ⚠️
 * 
 * This footer design is locked and must not be changed.
 * The design specifications are:
 * - Dark blue background (bg-siam-blue-dark) with white text
 * - 4-column grid layout (responsive)
 * - Columns: Branding, Contact, Quick Links, Legal
 * - Social media: Facebook, Instagram, LinkedIn, YouTube
 * 
 * If you need to restore the original design:
 * git checkout HEAD -- src/components/layout/PublicFooter.tsx
 * 
 * See .cursor/rules/footer-protection.mdc for full protection rules.
 */

"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { Mail, Phone, MessageCircle, Facebook, Instagram, Linkedin, Youtube } from "lucide-react";
import { site } from "@/config/site";
import { useTranslations } from "next-intl";

const footerQuickLinks = [
  { href: "/services" },
  { href: "/about" },
  { href: "/gallery" },
  { href: "/testimonials" },
  { href: "/contact" },
] as const;

const footerLegal = [
  { href: "/terms", key: "termsOfService" as const },
  { href: "/privacy", key: "privacyPolicy" as const },
  { href: "/refund", key: "refundPolicy" as const },
  { href: "/partner", key: "partnerProgram" as const },
] as const;

export function PublicFooter() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");
  const tSite = useTranslations("site");

  const quickLinkLabels = [tNav("services"), tNav("about"), tNav("gallery"), tNav("testimonials"), tNav("contact")];

  return (
    <footer className="border-t border-gray-200 bg-siam-blue-dark text-white">
      <div className="container mx-auto px-4 py-12 sm:py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <Link href="/" className="inline-block">
              <Image
                src="/images/logo.png"
                alt={site.name}
                width={100}
                height={36}
                className="h-8 w-auto brightness-0 invert opacity-95"
              />
            </Link>
            <p className="text-sm leading-relaxed text-white/85">
              {tSite("tagline")}. {tSite("taglineFull")}
            </p>
            <div className="flex gap-3">
              <a
                href={site.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="rounded-lg p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href={site.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="rounded-lg p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href={site.social.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="rounded-lg p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href={site.social.youtube}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="rounded-lg p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <Youtube className="h-5 w-5" />
              </a>
              <a
                href="https://api.whatsapp.com/send/?phone=66643438768&text&type=phone_number&app_absent=0"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="rounded-lg p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <MessageCircle className="h-5 w-5" />
              </a>
            </div>
          </div>
          <div>
            <h4 className="mb-4 font-semibold text-white">{t("contact")}</h4>
            <ul className="space-y-3">
              <li>
                <a
                  href={`mailto:${site.email}`}
                  className="flex items-center gap-2 text-sm text-white/85 transition hover:text-siam-yellow"
                >
                  <Mail className="h-4 w-4 shrink-0" />
                  {site.email}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${site.phone.replace(/\s/g, "")}`}
                  className="flex items-center gap-2 text-sm text-white/85 transition hover:text-siam-yellow"
                >
                  <Phone className="h-4 w-4 shrink-0" />
                  {site.phone}
                </a>
              </li>
              <li>
                <a
                  href={site.lineUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-white/85 transition hover:text-siam-yellow"
                >
                  <MessageCircle className="h-4 w-4 shrink-0" />
                  LINE: {site.line}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 font-semibold text-white">{t("quickLinks")}</h4>
            <ul className="space-y-2">
              {footerQuickLinks.map((link, i) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/85 transition hover:text-siam-yellow"
                  >
                    {quickLinkLabels[i]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-4 font-semibold text-white">{t("legal")}</h4>
            <ul className="space-y-2">
              {footerLegal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/85 transition hover:text-siam-yellow"
                  >
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-white/20 pt-8 text-center text-sm text-white/70">
          © {new Date().getFullYear()} {site.legal.companyName}. {tSite("allRightsReserved")}
        </div>
      </div>
    </footer>
  );
}
