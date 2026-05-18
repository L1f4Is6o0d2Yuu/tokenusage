import { redirect } from "next/navigation";
import { readCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/app/auth-actions";

export const dynamic = "force-dynamic";

export default async function PendingPage() {
  const user = await readCurrentUser();
  if (!user) redirect("/login");
  // If the user is already activated, send them straight in.
  if (user.activatedAt != null) redirect("/dashboard");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-10">
      <div className="rounded-lg border border-border-subtle bg-bg-card p-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-fg-strong">
          Waiting for activation
        </h1>
        <p className="mt-3 text-sm text-fg-muted">
          You signed in as <span className="font-mono">{user.email ?? user.username}</span>.
          An admin needs to approve the account before you can access the dashboard.
        </p>
        <p className="mt-2 text-xs text-fg-muted">
          Once approved, your next visit lands you directly in the app — no extra steps.
        </p>
        <form action={logoutAction} className="mt-6">
          <button
            type="submit"
            className="w-full rounded-md border border-border-subtle bg-bg-input px-4 py-2 text-sm font-medium text-fg-strong transition hover:bg-bg-subtle"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
