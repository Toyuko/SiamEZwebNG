import { revalidatePath } from "next/cache";
import { routing } from "@/i18n/routing";

/**
 * Refresh the public freelancer directory and profile pages after a save.
 * The mobile app writes through PUT /api/freelancer/me, and the website form
 * uses a server action. Both must invalidate the same locale-prefixed pages
 * or the app and the site can show different people.
 */
export function revalidatePublicFreelancers(slugs: Array<string | null | undefined> = []) {
  const unique = [
    ...new Set(
      slugs
        .map((slug) => slug?.trim().toLowerCase())
        .filter((slug): slug is string => Boolean(slug))
    ),
  ];

  revalidatePath("/freelancers");
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/freelancers`);
  }

  for (const slug of unique) {
    revalidatePath(`/freelancers/${slug}`);
    for (const locale of routing.locales) {
      revalidatePath(`/${locale}/freelancers/${slug}`);
    }
  }
}
