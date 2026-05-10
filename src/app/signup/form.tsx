"use client";

import { useActionState } from "react";
import { signupAction } from "@/app/auth-actions";

export function SignupForm() {
  const [state, action, pending] = useActionState(signupAction, {});
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="text-xs text-muted-foreground" htmlFor="username">
          Username
        </label>
        <input
          id="username"
          name="username"
          required
          autoFocus
          minLength={2}
          className="mt-1 w-full rounded border bg-background px-3 py-2 font-mono text-sm"
        />
      </div>
      <div>
        <label className="text-xs text-muted-foreground" htmlFor="password">
          Password (min 8 chars)
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className="mt-1 w-full rounded border bg-background px-3 py-2 font-mono text-sm"
        />
      </div>
      {state.error && (
        <p className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create admin"}
      </button>
    </form>
  );
}
