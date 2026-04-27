import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { PageHero } from "@/components/sections/PageHero";
import { site } from "@/config/site";
import { Mail, Phone, MessageCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ContactRequestForm } from "@/components/sections/ContactRequestForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tCommon] = await Promise.all([
    getTranslations("contact"),
    getTranslations("common"),
  ]);

  return (
    <>
      <PageHero
        title={t("title")}
        description={t("description")}
      />
      <section className="container mx-auto px-4 py-12 sm:py-16">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="space-y-6">
            <a
              href={`mailto:${site.email}`}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition hover:border-siam-blue hover:shadow-md"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-siam-blue/10 text-siam-blue">
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{t("emailUs")}</p>
                <p className="text-siam-blue">{site.email}</p>
              </div>
            </a>
            <a
              href={`tel:${site.phone.replace(/\s/g, "")}`}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition hover:border-siam-blue hover:shadow-md"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-siam-blue/10 text-siam-blue">
                <Phone className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{t("callUs")}</p>
                <p className="text-siam-blue">{site.phone}</p>
              </div>
            </a>
            <a
              href={site.lineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition hover:border-siam-blue hover:shadow-md"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-siam-blue/10 text-siam-blue">
                <MessageCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{t("lineOfficial")}</p>
                <p className="text-siam-blue">{site.line}</p>
              </div>
            </a>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-semibold text-foreground">{t("bookService")}</h2>
            <ContactRequestForm />
          </div>
        </div>
        <p className="mt-8 text-center text-muted">
          {t("preferBookOnline")}{" "}
          <Link href="/portal" className="font-medium text-siam-blue hover:underline">
            {tCommon("goToClientPortal")}
          </Link>
        </p>
      </section>
    </>
  );
}
