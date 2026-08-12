"use client";

import { dispatchOpenConcierge } from "@/lib/ai/concierge-events";
import { Button } from "@/components/ui/button";
import type { ButtonProps } from "@/components/ui/button";
import { MessageSquareText } from "lucide-react";

type Props = {
  label: string;
  prompt?: string;
  size?: ButtonProps["size"];
  className?: string;
  variant?: ButtonProps["variant"];
};

export function AskSiamEzButton({
  label,
  prompt,
  size = "lg",
  className,
  variant = "outline",
}: Props) {
  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={className}
      onClick={() => dispatchOpenConcierge(prompt)}
    >
      <MessageSquareText className="mr-2 h-4 w-4" aria-hidden />
      {label}
    </Button>
  );
}
