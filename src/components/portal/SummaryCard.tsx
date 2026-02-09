"use client";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FolderOpen, CreditCard, FileText, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Icon mapping - only use icon names that are serializable
const iconMap: Record<string, LucideIcon> = {
  FolderOpen,
  CreditCard,
  FileText,
};

interface SummaryCardProps {
  iconName: string;
  title: string;
  description: string;
  count: number;
  href: string;
  buttonLabel: string;
  buttonVariant?: "default" | "outline";
  iconClassName?: string;
}

export function SummaryCard({
  iconName,
  title,
  description,
  count,
  href,
  buttonLabel,
  buttonVariant = "default",
  iconClassName,
}: SummaryCardProps) {
  const Icon = iconMap[iconName] || FolderOpen;
  // Format description with bold numbers using markdown-style **text**
  const formatDescription = (desc: string) => {
    const parts = desc.split(/(\*\*.*?\*\*)/);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return part;
    }).filter(Boolean);
  };

  return (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardContent className="p-6">
        <Icon className={cn("h-10 w-10 text-siam-blue", iconClassName)} />
        <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{formatDescription(description)}</p>
        <Button asChild variant={buttonVariant} className="mt-4 w-full" size="default">
          <Link href={href}>
            <span className="flex items-center justify-center gap-2">
              {buttonVariant === "default" && (
                <>
                  {buttonLabel}
                  <span>→</span>
                </>
              )}
              {buttonVariant === "outline" && (
                <>
                  {buttonLabel}
                  <Icon className="h-4 w-4" />
                </>
              )}
            </span>
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
