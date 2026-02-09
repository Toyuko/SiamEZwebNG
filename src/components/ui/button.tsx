"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-siam-blue text-white hover:bg-siam-blue-light focus-visible:ring-siam-blue",
        primary: "bg-siam-yellow text-siam-blue-dark hover:bg-siam-yellow-light focus-visible:ring-siam-yellow",
        outline: "border-2 border-siam-blue text-siam-blue bg-transparent hover:bg-siam-blue/10 focus-visible:ring-siam-blue",
        secondary: "bg-siam-gray text-white hover:bg-siam-gray-light focus-visible:ring-siam-gray",
        ghost: "hover:bg-siam-gray/10 focus-visible:ring-siam-gray",
        link: "text-siam-blue underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-3",
        default: "h-10 px-4",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    const comp = buttonVariants({ variant, size, className });
    if (asChild && React.isValidElement(props.children)) {
      return React.cloneElement(props.children as React.ReactElement<{ className?: string; ref?: React.Ref<unknown> }>, {
        className: cn((props.children as React.ReactElement).props?.className, comp),
        ref,
      });
    }
    return (
      <button
        className={comp}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
