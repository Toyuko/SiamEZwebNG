import * as React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-skeleton-pulse rounded-md bg-border/80 dark:bg-border",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
