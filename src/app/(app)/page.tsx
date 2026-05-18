import { redirect } from "next/navigation";
import { readCurrentUser } from "@/lib/auth";
import { isFirstRun, isMultiUserMode } from "@/lib/server-db";
import { Landing } from "@/components/landing";

// Public root. Marketing landing for non-signed-in visitors; signed-in
// users get bounced to /dashboard. Single-user mode (no auth wall) also
// goes straight to /dashboard so there's exactly one canonical "the
// app" URL across both deployment modes.
export default async function Page() {
  // Bootstrap: server has zero users → push the first admin through
  // /signup before either landing or dashboard make sense.
  if (isMultiUserMode() && isFirstRun()) redirect("/signup");

  if (!isMultiUserMode()) redirect("/dashboard");

  const currentUser = await readCurrentUser();
  if (currentUser != null) redirect("/dashboard");

  return <Landing inviteRequired={true} />;
}
