import { redirect } from "next/navigation";
import { SignupForm } from "./form";
import { InviteForm } from "./invite-form";
import { isFirstRun, isMultiUserMode } from "@/lib/server-db";
import { lookupInvite, readCurrentUser } from "@/lib/auth";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;

  // Already signed in → just go home.
  const current = await readCurrentUser();
  if (current) redirect("/");

  // Branch 1: invite redemption — anyone with a valid token can land here.
  if (invite) {
    const status = lookupInvite(invite);
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-10">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">tokenusage</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Invited to join — pick an email and password.
          </p>
        </div>
        {status.ok ? (
          <InviteForm invite={invite} />
        ) : (
          <p className="rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
            {status.reason === "used"
              ? "This invite has already been used."
              : status.reason === "expired"
                ? "This invite has expired. Ask the admin for a new one."
                : "Invalid invite link."}
          </p>
        )}
      </main>
    );
  }

  // Branch 2: first-run admin signup — only valid when there are no users.
  if (isMultiUserMode()) redirect("/login");
  if (!isFirstRun()) redirect("/");

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">tokenusage</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          First-run setup — create the admin account for this server.
        </p>
      </div>
      <SignupForm />
    </main>
  );
}
