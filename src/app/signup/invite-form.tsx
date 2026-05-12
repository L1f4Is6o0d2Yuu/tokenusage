"use client";

import { useActionState } from "react";
import { redeemInviteAction } from "@/app/auth-actions";
import { PasswordField } from "@/components/password-field";

export function InviteForm({
  invite,
  labels,
}: {
  invite: string;
  labels: {
    email: string;
    username: string;
    password: string;
    policyHint: string;
    submit: string;
    submitting: string;
  };
}) {
  const [state, action, pending] = useActionState(redeemInviteAction, {});
  return (
    <form action={action} className="space-y-4">
      {/* Invite code is auto-filled from the URL and intentionally
          read-only — once you've clicked an invite link, the code is
          locked in. We still surface it so the user can sanity-check
          which invite they're redeeming. */}
      <div className="rounded-md border border-border-subtle bg-bg-panel-2/40 p-3 text-center">
        <div className="text-[10px] uppercase tracking-wider text-fg-muted">
          invite code
        </div>
        <div className="mt-1 font-mono text-xl font-semibold tracking-[0.2em] text-fg-strong">
          {invite}
        </div>
      </div>
      <input type="hidden" name="invite" value={invite} />
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
      <div>
        <label className="text-xs text-fg-muted" htmlFor="username">
          {labels.username}
        </label>
        <input
          id="username"
          name="username"
          minLength={2}
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
