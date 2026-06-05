import type { ReactNode } from "react";
import { Clock, Globe, Landmark, MessageCircle, ShieldCheck, Zap } from "lucide-react";
import { site } from "@/config/site";

interface TrustItem {
  icon: ReactNode;
  title: string;
  text: string;
}

interface ServiceTrustSectionProps {
  title: string;
  subtitle: string;
  items: TrustItem[];
}

export function ServiceTrustSection({ title, subtitle, items }: ServiceTrustSectionProps) {
  return (
    <section className="border-t border-gray-200 bg-siam-blue py-12 text-white dark:border-gray-800 sm:py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">{title}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-white/90">{subtitle}</p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <div
              key={i}
              className="rounded-xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm"
            >
              <div className="mb-3 text-siam-yellow">{item.icon}</div>
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-white/85">{item.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-white/80">
          <MessageCircle className="mr-1 inline h-4 w-4" aria-hidden />
          LINE {site.line} · {site.phone}
        </p>
      </div>
    </section>
  );
}

export const trustIcons = {
  fast: <Zap className="h-6 w-6" aria-hidden />,
  reliable: <ShieldCheck className="h-6 w-6" aria-hidden />,
  transparent: <Clock className="h-6 w-6" aria-hidden />,
  bilingual: <Globe className="h-6 w-6" aria-hidden />,
  experience: <Landmark className="h-6 w-6" aria-hidden />,
  line: <MessageCircle className="h-6 w-6" aria-hidden />,
};
