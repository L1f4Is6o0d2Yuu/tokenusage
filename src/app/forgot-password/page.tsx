import Link from "next/link";
import { redirect } from "next/navigation";
import { readCurrentUser, lookupPasswordReset } from "@/lib/auth";
import { isMultiUserMode } from "@/lib/server-db";
import { getDictionary } from "@/i18n";
import { LookupForm, ResetForm } from "./form";

// Two-step flow rendered on a single route:
//   Step 1 (no query)    → ask for the email, server checks admin flag.
//   Step 2 (?step=reset) → admin flagged the account; user picks new password.
// We re-check the flag here so a user can't bookmark step-2 and skip step-1.
export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; email?: string }>;
}) {
  const current = await readCurrentUser();
  if (current) redirect("/");
  if (!isMultiUserMode()) redirect("/");

  const { step, email } = await searchParams;
  const dict = await getDictionary();
  const t = dict.forgotPassword;

  // Step 2: gate behind a live flag check. If the admin unflagged the user
  // between step 1 and step 2 (or someone hand-crafted the URL), bounce
  // back to step 1 with a stale notice.
  if (step === "reset" && email) {
    const lookup = await lookupPasswordReset(email);
    if (lookup.ok) {
      return (
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-10">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-fg-strong">
              {t.resetTitle}
            </h1>
            <p className="mt-1 text-sm text-fg-muted">{t.resetSubtitle}</p>
          </div>
          <ResetForm
            email={email}
            labels={{
              email: t.email,
              password: t.newPassword,
              policyHint: t.policyHint,
              submit: t.submitReset,
              submitting: t.submittingReset,
            }}
          />
          <p className="mt-4 text-center text-xs text-fg-muted">
            <Link href="/login" className="hover:text-fg-default">
              {t.backToLogin}
            </Link>
          </p>
        </main>
      );
    }
    // fall through to step 1 with a stale-flag notice
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-fg-strong">
          {t.title}
        </h1>
        <p className="mt-1 text-sm text-fg-muted">{t.subtitle}</p>
      </div>
      <LookupForm
        labels={{
          email: t.email,
          submit: t.submitLookup,
          submitting: t.submittingLookup,
          notFlagged: t.notFlagged,
        }}
      />
      <p className="mt-4 text-center text-xs text-fg-muted">
        <Link href="/login" className="hover:text-fg-default">
          {t.backToLogin}
        </Link>
      </p>
    </main>
  );
}
