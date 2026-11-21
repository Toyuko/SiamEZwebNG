import {
  Bolt,
  HeartHandshake,
  Headset,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

type WhyChooseStripProps = {
  title: string;
  subtitle: string;
  items: { title: string; text: string }[];
};

const ICONS: LucideIcon[] = [Bolt, ShieldCheck, Headset, HeartHandshake];

export function WhyChooseStrip({ title, subtitle, items }: WhyChooseStripProps) {
  return (
    <section className="bg-hero-gradient py-10 text-white sm:py-12">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>
          <p className="mt-2 text-sm text-white/85 sm:text-base">{subtitle}</p>
        </div>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, index) => {
            const Icon = ICONS[index] ?? Bolt;
            return (
              <li key={item.title} className="flex flex-col items-center text-center">
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-siam-yellow text-siam-navy shadow-soft">
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                <p className="font-bold">{item.title}</p>
                <p className="mt-1 text-sm text-white/80">{item.text}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
