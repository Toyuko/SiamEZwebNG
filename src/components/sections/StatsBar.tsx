import { site } from "@/config/site";

const defaultLabels: Record<keyof typeof site.stats, string> = {
  happyClients: "Happy Clients",
  yearsExperience: "Years Experience",
  successRate: "Success Rate",
};

interface StatsBarProps {
  labels?: Record<keyof typeof site.stats, string>;
}

export function StatsBar({ labels = defaultLabels }: StatsBarProps) {
  const entries = Object.entries(site.stats) as [keyof typeof site.stats, string][];
  return (
    <section className="border-y border-siam-blue-light/30 bg-siam-blue-dark/50">
      <div className="container mx-auto px-4 py-8 sm:py-10">
        <div className="grid grid-cols-3 gap-6 sm:gap-8">
          {entries.map(([key, value], i) => (
            <div
              key={key}
              className="text-center opacity-0 animate-fade-in-up"
              style={{ animationDelay: `${0.15 * (i + 1)}s` }}
            >
              <p className="text-2xl font-bold text-white sm:text-3xl md:text-4xl">
                {value}
              </p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-white/80 sm:text-sm">
                {labels[key]}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
