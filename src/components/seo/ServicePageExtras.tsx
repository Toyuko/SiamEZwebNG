import { Link } from "@/i18n/navigation";
import { AskSiamEzButton } from "@/components/ai/AskSiamEzButton";
import { serviceDisplayNames, type ServiceSlug } from "@/config/services";
import { JsonLdScript } from "@/components/seo/JsonLd";
import { faqPageJsonLd } from "@/lib/seo/jsonld";

type ServicePageExtrasProps = {
  locale: string;
  slug: string;
  audience: string;
  areaServed: string;
  relatedSlugs: ServiceSlug[];
  relatedPaths: Array<{ href: string; label: string }>;
  faqs: Array<{ question: string; answer: string }>;
  /** Marriage (and similar) pages already render a visible FAQ. */
  showFaq?: boolean;
  labels: {
    whoFor: string;
    whereAvailable: string;
    related: string;
    faq: string;
    conciergeTitle: string;
    conciergeBody: string;
    conciergeButton: string;
    bookRelated: string;
  };
};

export function ServicePageExtras({
  locale,
  slug,
  audience,
  areaServed,
  relatedSlugs,
  relatedPaths,
  faqs,
  showFaq = true,
  labels,
}: ServicePageExtrasProps) {
  const faqLd = faqPageJsonLd(faqs);
  const conciergePrompt =
    locale === "th"
      ? `ฉันสนใจบริการ ${serviceDisplayNames[slug as ServiceSlug] ?? slug} ช่วยแนะนำขั้นตอนได้ไหม`
      : `I am interested in ${serviceDisplayNames[slug as ServiceSlug] ?? slug} in Thailand. What should I do next?`;

  return (
    <div className="mt-10 space-y-10">
      {faqLd ? <JsonLdScript data={faqLd} /> : null}

      <section className="grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{labels.whoFor}</h2>
          <p className="mt-2 text-base leading-relaxed text-gray-700 dark:text-gray-300">{audience}</p>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{labels.whereAvailable}</h2>
          <p className="mt-2 text-base leading-relaxed text-gray-700 dark:text-gray-300">{areaServed}</p>
        </div>
      </section>

      {(relatedSlugs.length > 0 || relatedPaths.length > 0) && (
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{labels.related}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {relatedSlugs.map((related) => (
              <li key={related}>
                <Link
                  href={`/services/${related}`}
                  className="inline-flex rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-siam-blue hover:border-siam-blue hover:bg-siam-blue/5 dark:border-gray-700 dark:bg-gray-800 dark:text-siam-blue-light"
                >
                  {serviceDisplayNames[related]}
                </Link>
              </li>
            ))}
            {relatedPaths.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-siam-blue hover:border-siam-blue hover:bg-siam-blue/5 dark:border-gray-700 dark:bg-gray-800 dark:text-siam-blue-light"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {showFaq && faqs.length > 0 ? (
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{labels.faq}</h2>
          <dl className="mt-4 space-y-4">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50"
              >
                <dt className="font-semibold text-gray-900 dark:text-gray-100">{faq.question}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <section className="rounded-2xl border border-siam-blue/20 bg-siam-blue/5 p-6 dark:border-siam-blue/40 dark:bg-siam-blue/10">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{labels.conciergeTitle}</h2>
        <p className="mt-2 text-base text-gray-700 dark:text-gray-300">{labels.conciergeBody}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <AskSiamEzButton label={labels.conciergeButton} prompt={conciergePrompt} />
          <Link
            href={`/book/${slug}`}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-siam-blue px-5 text-sm font-semibold text-white hover:bg-siam-blue-light"
          >
            {labels.bookRelated}
          </Link>
        </div>
      </section>
    </div>
  );
}
