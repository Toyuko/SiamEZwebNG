import { cn } from "@/lib/utils";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-8 text-card-foreground shadow-sm",
        className
      )}
    >
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-siam-blue">
          <span className="text-xl font-bold text-white">SZ</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        ) : null}
      </div>
      {children}
      {footer ? <div className="mt-6 text-center text-sm text-muted">{footer}</div> : null}
    </div>
  );
}
