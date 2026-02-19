"use client";

import { useFormState } from "react-dom";
import { register } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function RegisterFormInner({
  state,
}: {
  state: { error?: { email?: string[]; password?: string[]; name?: string[] } };
}) {
  return (
    <>
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Full name
        </label>
        <Input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          placeholder="Your name"
          className={state?.error?.name ? "border-red-500" : ""}
        />
        {state?.error?.name && (
          <p className="mt-1 text-sm text-red-600">{state.error.name[0]}</p>
        )}
      </div>
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
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="At least 8 characters"
          className={state?.error?.password ? "border-red-500" : ""}
        />
        {state?.error?.password && (
          <p className="mt-1 text-sm text-red-600">{state.error.password[0]}</p>
        )}
      </div>
      <Button type="submit" variant="primary" className="w-full">
        Create account
      </Button>
    </>
  );
}

export function RegisterForm() {
  const [state, formAction] = useFormState(register, undefined);
  return (
    <form action={formAction} className="space-y-4">
      <RegisterFormInner state={state ?? {}} />
    </form>
  );
}
