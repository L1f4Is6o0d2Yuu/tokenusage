import { redirect } from "next/navigation";
import { SignupForm } from "./form";
import { InviteForm } from "./invite-form";
import { isFirstRun, isMultiUserMode } from "@/lib/server-db";
import { lookupInvite, readCurrentUser } from "@/lib/auth";
import { getDictionary } from "@/i18n";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;

  const current = await readCurrentUser();
  if (current) redirect("/dashboard");

  const t = (await getDictionary()).authForms;

  if (invite) {
    const status = await lookupInvite(invite);
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-10">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">tokenusage</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.inviteTitle}</p>
        </div>
        {status.ok ? (
          <InviteForm
            invite={invite}
            labels={{
              email: t.email,
              username: t.usernameOptionalWithDefault,
              password: t.passwordWith8Min,
              policyHint: t.policyHint,
              submit: t.join,
              submitting: t.joining,
            }}
          />
        ) : (
          <p className="rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
            {status.reason === "used"
              ? t.inviteUsed
              : status.reason === "expired"
                ? t.inviteExpired
                : t.inviteInvalid}
          </p>
        )}
      </main>
    );
  }

  // First-run admin signup (no users exist yet).
  if (await isFirstRun()) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-10">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-fg-strong">tokenusage</h1>
          <p className="mt-1 text-sm text-fg-muted">{t.signupTitle}</p>
        </div>
        <SignupForm
          labels={{
            username: t.username,
            emailOptional: t.emailOptional,
            password: t.passwordWith8Min,
            policyHint: t.policyHint,
            submit: t.createAdmin,
            submitting: t.creatingAdmin,
          }}
        />
      </main>
    );
  }

  if (!isMultiUserMode()) redirect("/dashboard");

  // Multi-user mode, no invite in URL → ask the user to paste their code.
  // Submitting the form pushes them to /signup?invite=… which hits the
  // redemption branch above. This is the "self-signup via invite" entry.
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-fg-strong">tokenusage</h1>
        <p className="mt-1 text-sm text-fg-muted">{t.inviteTitle}</p>
      </div>
      <form method="GET" action="/signup" className="space-y-4">
        <div>
          <label className="text-xs text-fg-muted" htmlFor="invite">
            {t.inviteCodeLabel}
          </label>
          <input
            id="invite"
            name="invite"
            required
            autoFocus
            placeholder={t.inviteCodePlaceholder}
            className="mt-1 w-full rounded border border-border-subtle bg-bg-input px-3 py-2 font-mono text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
        >
          {t.inviteCodeSubmit}
        </button>
      </form>
      <p className="mt-4 text-center text-xs text-fg-muted">
        <a href="/login" className="hover:text-fg-default">
          ← {t.loginTitle}
        </a>
      </p>
    </main>
  );
}
