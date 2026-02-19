"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { SessionUser } from "@/lib/auth";

interface ProfileFormProps {
  user: SessionUser;
}

export function ProfileForm({ user }: ProfileFormProps) {
  const [name, setName] = useState(user.name ?? "");
  const [email] = useState(user.email); // read-only for now

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium">
          Full name
        </label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
        />
      </div>
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium">
          Email
        </label>
        <Input
          id="email"
          type="email"
          value={email}
          readOnly
          disabled
          className="cursor-not-allowed bg-gray-100 dark:bg-gray-800"
        />
        <p className="mt-1 text-xs text-gray-500">
          Email cannot be changed. Contact support if needed.
        </p>
      </div>
      <Button disabled>Save changes (coming soon)</Button>
    </div>
  );
}
