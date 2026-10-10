"use client";

export function ConfirmSubmit({
  action,
  confirmText,
  children,
  fields,
  className,
}: {
  action: (formData: FormData) => void | Promise<void>;
  confirmText: string;
  children: React.ReactNode;
  fields?: Record<string, string>;
  className?: string;
}) {
  return (
    <form
      action={action}
      className={className}
      onSubmit={(event) => {
        if (!window.confirm(confirmText)) event.preventDefault();
      }}
    >
      {fields
        ? Object.entries(fields).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))
        : null}
      <button type="submit" className="text-sm font-medium text-rose-700 underline-offset-2 hover:underline">
        {children}
      </button>
    </form>
  );
}
