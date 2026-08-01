import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Stacks label + control + messages with consistent spacing. */
}

const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    />
  )
);
Field.displayName = "Field";

export interface FieldLabelProps extends React.ComponentPropsWithoutRef<typeof Label> {
  required?: boolean;
}

const FieldLabel = React.forwardRef<HTMLLabelElement, FieldLabelProps>(
  ({ className, required, children, ...props }, ref) => (
    <Label ref={ref} className={cn(className)} {...props}>
      {children}
      {required ? (
        <span className="ml-0.5 text-destructive" aria-hidden>
          *
        </span>
      ) : null}
    </Label>
  )
);
FieldLabel.displayName = "FieldLabel";

export interface FieldDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {}

const FieldDescription = React.forwardRef<
  HTMLParagraphElement,
  FieldDescriptionProps
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-xs text-muted", className)}
    {...props}
  />
));
FieldDescription.displayName = "FieldDescription";

export interface FieldErrorProps extends React.HTMLAttributes<HTMLParagraphElement> {
  /** When false/empty, renders nothing. Pass a string or node from Zod/RHF. */
  error?: React.ReactNode;
}

const FieldError = React.forwardRef<HTMLParagraphElement, FieldErrorProps>(
  ({ className, error, children, ...props }, ref) => {
    const content = error ?? children;
    if (!content) return null;
    return (
      <p
        ref={ref}
        role="alert"
        className={cn("text-xs font-medium text-destructive", className)}
        {...props}
      >
        {content}
      </p>
    );
  }
);
FieldError.displayName = "FieldError";

export interface FieldHintProps extends React.HTMLAttributes<HTMLParagraphElement> {}

const FieldHint = React.forwardRef<HTMLParagraphElement, FieldHintProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-xs text-muted", className)}
      {...props}
    />
  )
);
FieldHint.displayName = "FieldHint";

export { Field, FieldLabel, FieldDescription, FieldError, FieldHint };
