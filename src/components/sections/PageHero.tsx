interface PageHeroProps {
  title: string;
  description?: string;
  className?: string;
}

export function PageHero({ title, description, className = "" }: PageHeroProps) {
  return (
    <section className={`bg-siam-blue py-12 dark:bg-siam-blue-dark sm:py-16 md:py-20 ${className}`}>
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-display-md font-bold tracking-tight text-white opacity-0 animate-fade-in-up">
          {title}
        </h1>
        {description && (
          <p className="mx-auto mt-3 max-w-2xl text-lg text-white/90 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            {description}
          </p>
        )}
      </div>
    </section>
  );
}
