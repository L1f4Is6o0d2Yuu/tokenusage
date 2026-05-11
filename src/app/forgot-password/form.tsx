"use client";

import { useActionState } from "react";
import {
  forgotPasswordLookupAction,
  forgotPasswordCompleteAction,
} from "@/app/auth-actions";
import { PasswordField } from "@/components/password-field";

export function LookupForm({
  labels,
}: {
  labels: {
    email: string;
    submit: string;
    submitting: string;
    notFlagged: string;
  };
}) {
  const [state, action, pending] = useActionState(forgotPasswordLookupAction, {});
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="text-xs text-fg-muted" htmlFor="email">
          {labels.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoFocus
          autoComplete="email"
          className="mt-1 w-full rounded border border-border-subtle bg-bg-input px-3 py-2 font-mono text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
      </div>
      {state.error && (
        <p className="rounded border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          {state.error}
        </p>
      )}
      {state.notFlagged && (
        <p className="rounded border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
          {labels.notFlagged}
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

export function ResetForm({
  email,
  labels,
}: {
  email: string;
  labels: {
    email: string;
    password: string;
    policyHint: string;
    submit: string;
    submitting: string;
  };
}) {
  const [state, action, pending] = useActionState(forgotPasswordCompleteAction, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="email" value={email} />
      <div>
        <label className="text-xs text-fg-muted">{labels.email}</label>
        <div className="mt-1 truncate rounded border border-border-subtle bg-bg-panel-2 px-3 py-2 font-mono text-sm text-fg-muted">
          {email}
        </div>
      </div>
      <PasswordField label={labels.password} policyLabel={labels.policyHint} autoFocus />
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
