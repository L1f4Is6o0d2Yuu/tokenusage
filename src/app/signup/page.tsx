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
  if (current) redirect("/");

  const t = (await getDictionary()).authForms;

  if (invite) {
    const status = lookupInvite(invite);
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

  if (isMultiUserMode()) redirect("/login");
  if (!isFirstRun()) redirect("/");

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">tokenusage</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.signupTitle}</p>
      </div>
      <SignupForm
        labels={{
          username: t.username,
          emailOptional: t.emailOptional,
          password: t.passwordWith8Min,
          submit: t.createAdmin,
          submitting: t.creatingAdmin,
        }}
      />
    </main>
  );
}
