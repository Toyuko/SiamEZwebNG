import { Link } from "@/i18n/navigation";
import { AskSiamEzButton } from "@/components/ai/AskSiamEzButton";
import { site } from "@/config/site";

type NotFoundContentProps = {
  title: string;
  description: string;
  home: string;
  services: string;
  book: string;
  concierge: string;
};

export function NotFoundContent({
  title,
  description,
  home,
  services,
  book,
  concierge,
}: NotFoundContentProps) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-siam-blue">404</p>
      <h1 className="mt-3 text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">{title}</h1>
      <p className="mt-4 max-w-lg text-base text-gray-600 dark:text-gray-400">{description}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-lg bg-siam-blue px-5 text-sm font-semibold text-white hover:bg-siam-blue-light"
        >
          {home}
        </Link>
        <Link
          href="/services"
          className="inline-flex h-11 items-center rounded-lg border border-gray-300 px-5 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100"
        >
          {services}
        </Link>
        <Link
          href="/services"
          className="inline-flex h-11 items-center rounded-lg border border-gray-300 px-5 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100"
        >
          {book}
        </Link>
        <AskSiamEzButton label={concierge} />
      </div>
      <p className="mt-8 text-sm text-gray-500">
        {site.email} · {site.phone} · LINE {site.line}
      </p>
    </div>
  );
}
