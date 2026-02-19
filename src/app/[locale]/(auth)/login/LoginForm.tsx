"use client";

import { useFormState } from "react-dom";
import { login } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function LoginFormInner({
  state,
}: {
  state: { error?: { email?: string[]; password?: string[] } };
}) {
  return (
    <>
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          className={state?.error?.email ? "border-red-500" : ""}
        />
        {state?.error?.email && (
          <p className="mt-1 text-sm text-red-600">{state.error.email[0]}</p>
        )}
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={state?.error?.password ? "border-red-500" : ""}
        />
        {state?.error?.password && (
          <p className="mt-1 text-sm text-red-600">{state.error.password[0]}</p>
        )}
      </div>
      <Button type="submit" variant="primary" className="w-full">
        Sign in
      </Button>
    </>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState(login, undefined);
  return (
    <form action={formAction} className="space-y-4">
      <LoginFormInner state={state ?? {}} />
    </form>
  );
}
