"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const sheetVariants = cva(
  "fixed z-50 flex flex-col gap-4 border-border bg-card text-card-foreground shadow-xl outline-none transition-transform duration-300 ease-out",
  {
    variants: {
      side: {
        right:
          "inset-y-0 right-0 h-full w-full max-w-md border-l data-[state=closed]:translate-x-full data-[state=open]:translate-x-0",
        left: "inset-y-0 left-0 h-full w-full max-w-md border-r data-[state=closed]:-translate-x-full data-[state=open]:translate-x-0",
        bottom:
          "inset-x-0 bottom-0 max-h-[90vh] w-full border-t data-[state=closed]:translate-y-full data-[state=open]:translate-y-0",
        top: "inset-x-0 top-0 max-h-[90vh] w-full border-b data-[state=closed]:-translate-y-full data-[state=open]:translate-y-0",
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
);

export interface SheetProps extends VariantProps<typeof sheetVariants> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  showClose?: boolean;
}

/**
 * Slide-over panel for filters, detail drawers, and mobile menus.
 */
function Sheet({
  open,
  onOpenChange,
  children,
  side = "right",
  className,
  title,
  description,
  showClose = true,
}: SheetProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-overlay"
        onClick={() => onOpenChange(false)}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "sheet-title" : undefined}
        aria-describedby={description ? "sheet-description" : undefined}
        data-state={open ? "open" : "closed"}
        className={cn(sheetVariants({ side }), "p-6", className)}
      >
        {(title || showClose) && (
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              {title ? (
                <h2 id="sheet-title" className="text-lg font-semibold">
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p id="sheet-description" className="text-sm text-muted">
                  {description}
                </p>
              ) : null}
            </div>
            {showClose ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export { Sheet, sheetVariants };
