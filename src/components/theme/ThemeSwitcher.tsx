"use client";

import { useState } from "react";
import { Sun, Moon, CloudMoon, Monitor } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { cn } from "@/lib/utils";
import type { ThemeChoice } from "@/lib/theme";

const options: { value: ThemeChoice; label: string; icon: React.ElementType }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "night", label: "Night", icon: CloudMoon },
  { value: "auto", label: "Auto", icon: Monitor },
];

interface ThemeSwitcherProps {
  className?: string;
  variant?: "default" | "sidebar";
}

export function ThemeSwitcher({ className, variant = "default" }: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  if (variant === "sidebar") {
    return (
      <div className={cn("relative", className)}>
        <div className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 p-1 backdrop-blur-sm">
          {options.map((opt) => {
            const Icon = opt.icon;
            const active = theme === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value)}
                className={cn(
                  "flex items-center justify-center rounded-md p-2 text-white transition-colors",
                  active
                    ? "bg-white/20 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
                title={opt.label}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        aria-label="Theme"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="theme-listbox"
        id="theme-button"
        className="rounded-lg p-2 text-header-text-muted transition hover:bg-black/5 hover:text-header-text dark:hover:bg-white/10"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      >
        {options.find((o) => o.value === theme)?.icon ? (
          (() => {
            const Opt = options.find((o) => o.value === theme)!.icon;
            return <Opt className="h-5 w-5" />;
          })()
        ) : (
          <Sun className="h-5 w-5" />
        )}
      </button>
      {open && (
        <ul
          id="theme-listbox"
          role="listbox"
          aria-labelledby="theme-button"
          className="absolute right-0 top-full z-50 mt-1 min-w-[8rem] rounded-lg border border-border bg-card py-1 shadow-lg"
        >
          {options.map((opt) => {
            const Icon = opt.icon;
            const active = theme === opt.value;
            return (
              <li key={opt.value} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-card-foreground transition hover:bg-black/5 dark:hover:bg-white/10",
                    active && "bg-black/5 dark:bg-white/10 font-medium"
                  )}
                  onClick={() => {
                    setTheme(opt.value);
                    setOpen(false);
                  }}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {opt.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
