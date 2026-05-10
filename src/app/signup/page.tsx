import { redirect } from "next/navigation";
import { SignupForm } from "./form";
import { isFirstRun, isMultiUserMode } from "@/lib/server-db";

export default async function SignupPage() {
  if (!isMultiUserMode() && !isFirstRun()) redirect("/");
  if (isMultiUserMode()) redirect("/login");
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
