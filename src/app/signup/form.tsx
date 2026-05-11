"use client";

import { useActionState } from "react";
import { signupAction } from "@/app/auth-actions";
import { PasswordField } from "@/components/password-field";

export function SignupForm({
  labels,
}: {
  labels: {
    username: string;
    emailOptional: string;
    password: string;
    policyHint: string;
    submit: string;
    submitting: string;
  };
}) {
  const [state, action, pending] = useActionState(signupAction, {});
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="text-xs text-fg-muted" htmlFor="username">
          {labels.username}
        </label>
        <input
          id="username"
          name="username"
          required
          autoFocus
          minLength={2}
          className="mt-1 w-full rounded border border-border-subtle bg-bg-input px-3 py-2 font-mono text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
      </div>
      <div>
        <label className="text-xs text-fg-muted" htmlFor="email">
          {labels.emailOptional}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          className="mt-1 w-full rounded border border-border-subtle bg-bg-input px-3 py-2 font-mono text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
      </div>
      <PasswordField label={labels.password} policyLabel={labels.policyHint} />
      {state.error && (
        <p className="rounded border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
      >
        {pending ? labels.submitting : labels.submit}
      </button>
    </form>
  );
}
