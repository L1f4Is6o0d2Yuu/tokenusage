import { redirect } from "next/navigation";
import { readCurrentUser } from "@/lib/auth";
import { isFirstRun, isMultiUserMode } from "@/lib/server-db";
import { Landing } from "@/components/landing";
import { SmoothScrollProvider } from "@/components/smooth-scroll-provider";

// Public root. The landing page stays reachable for everyone —
// signed-in users included — so people can revisit the pitch and the
// dashboard previews after they've registered. Auth state only swaps
// the CTAs ("开撸" → "回看板"); it doesn't change whether / renders.
//
// Two redirects survive:
//   - First-run (zero users in the server DB): bootstrap admin needs
//     to land in /signup before either marketing or dashboard make
//     sense.
//   - Single-user deployment (no auth at all): collapse to /dashboard
//     since the marketing page has no audience to convert.
export default async function Page() {
  if (isMultiUserMode() && isFirstRun()) redirect("/signup");
  if (!isMultiUserMode()) redirect("/dashboard");

  const currentUser = await readCurrentUser();
  return (
    <>
      <SmoothScrollProvider />
      <Landing
        inviteRequired={true}
        signedInAs={currentUser?.username ?? null}
      />
    </>
  );
}
