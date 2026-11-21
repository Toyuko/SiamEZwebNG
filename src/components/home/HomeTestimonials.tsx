import { Link } from "@/i18n/navigation";
import { Star } from "lucide-react";
import type { GoogleTestimonial } from "@/content/google-testimonials";

type HomeTestimonialsProps = {
  title: string;
  viewAllLabel: string;
  reviews: GoogleTestimonial[];
};

export function HomeTestimonials({ title, viewAllLabel, reviews }: HomeTestimonialsProps) {
  const featured = reviews.filter((r) => r.quote.length > 40).slice(0, 3);

  if (featured.length === 0) return null;

  return (
    <section className="bg-white py-12 sm:py-14">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-bold text-siam-ink sm:text-3xl">{title}</h2>
          <Link
            href="/testimonials"
            className="text-sm font-semibold text-siam-blue hover:text-siam-blue-mid"
          >
            {viewAllLabel}
          </Link>
        </div>
        <ul className="grid gap-4 md:grid-cols-3">
          {featured.map((review) => (
            <li
              key={review.id}
              className="rounded-siam-xl border border-siam-surface-pale bg-siam-surface/40 p-5 shadow-soft"
            >
              <div className="mb-3 flex gap-0.5" aria-label={`${review.stars} stars`}>
                {Array.from({ length: review.stars }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-siam-yellow text-siam-yellow"
                    aria-hidden
                  />
                ))}
              </div>
              <p className="text-sm leading-relaxed text-siam-ink line-clamp-4">
                &ldquo;{review.quote}&rdquo;
              </p>
              <p className="mt-4 text-sm font-semibold text-siam-ink">{review.author}</p>
              <p className="text-xs text-siam-ink-muted">{review.service}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
