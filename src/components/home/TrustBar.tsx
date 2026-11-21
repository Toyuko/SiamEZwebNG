import {
  Bolt,
  Headset,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

type TrustItem = {
  title: string;
  text: string;
  icon: LucideIcon;
};

type TrustBarProps = {
  items: [TrustItem["title"], TrustItem["text"]][];
};

const ICONS: LucideIcon[] = [Bolt, Users, ShieldCheck, Headset];

export function TrustBar({ items }: TrustBarProps) {
  return (
    <section className="relative z-[1] -mt-1 bg-white">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 gap-4 rounded-siam-xl border border-siam-surface-pale bg-white px-4 py-5 shadow-soft sm:gap-6 sm:px-6 md:grid-cols-4 lg:py-6">
          {items.map(([title, text], index) => {
            const Icon = ICONS[index] ?? Bolt;
            return (
              <div key={title} className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-siam-md bg-siam-surface text-siam-yellow-dark">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-bold text-siam-ink">{title}</p>
                  <p className="mt-0.5 text-xs text-siam-ink-muted sm:text-sm">{text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
