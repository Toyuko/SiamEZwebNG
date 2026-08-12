"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { sendAdminTestEmail } from "@/actions/admin-email";

type Status = {
  configured: boolean;
  from: string;
  replyTo: string;
  opsTo: string;
  usingResendDev: boolean;
  webhookConfigured: boolean;
};

type State =
  | { ok: true; id: string }
  | { ok: false; error: string }
  | null;

export function EmailSettingsCard({
  status,
  defaultTo,
}: {
  status: Status;
  defaultTo: string;
}) {
  const [state, formAction, pending] = useActionState(
    sendAdminTestEmail,
    null as State
  );

  return (
    <div className="mt-8 max-w-xl rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">Email</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Transactional mail via Resend (bookings, contact, password reset, jobs).
      </p>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Status</dt>
          <dd className={status.configured ? "font-medium text-emerald-600" : "font-medium text-amber-600"}>
            {status.configured ? "Configured" : "Not configured"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">From</dt>
          <dd className="text-right text-foreground">{status.from}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Ops inbox</dt>
          <dd className="text-right text-foreground">{status.opsTo}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Webhook bridge</dt>
          <dd className="text-right text-foreground">
            {status.webhookConfigured ? "Enabled" : "Off"}
          </dd>
        </div>
      </dl>

      {status.usingResendDev && status.configured ? (
        <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
          Using Resend&apos;s onboarding sender. Verify <code>siam-ez.com</code> and set{" "}
          <code>EMAIL_FROM</code> for production delivery to any recipient.
        </p>
      ) : null}

      {!status.configured ? (
        <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
          Set <code>RESEND_API_KEY</code> (and preferably <code>EMAIL_FROM</code>) in Vercel
          env, then redeploy.
        </p>
      ) : null}

      <form action={formAction} className="mt-5 space-y-3">
        <Field>
          <FieldLabel htmlFor="email-test-to">Send test email</FieldLabel>
          <Input
            id="email-test-to"
            name="to"
            type="email"
            required
            defaultValue={defaultTo}
            placeholder="you@example.com"
          />
          <FieldError
            error={
              state && !state.ok
                ? state.error === "not_configured"
                  ? "RESEND_API_KEY is not set."
                  : state.error === "invalid_email"
                    ? "Enter a valid email."
                    : state.error
                : undefined
            }
          />
        </Field>
        <Button type="submit" variant="secondary" disabled={pending || !status.configured}>
          {pending ? "Sending…" : "Send test"}
        </Button>
        {state?.ok ? (
          <p className="text-sm text-emerald-600">Sent (id: {state.id})</p>
        ) : null}
      </form>
    </div>
  );
}
