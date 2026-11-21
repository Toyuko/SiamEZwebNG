"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface WizardStepRendererProps {
  stepKey: string;
  children: React.ReactNode;
}

/**
 * Lightweight step swap without opacity-0 entrances (those can leave content
 * invisible if the animation never settles). CSS transition only.
 */
export function WizardStepRenderer({ stepKey, children }: WizardStepRendererProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const id = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(id);
  }, [stepKey]);

  return (
    <div
      key={stepKey}
      className={cn(
        "transition-opacity duration-200 ease-out motion-reduce:transition-none",
        visible ? "opacity-100" : "opacity-100"
      )}
    >
      {children}
    </div>
  );
}
