import { redirect } from "next/navigation";
import { LoginForm } from "./form";
import { isFirstRun, isMultiUserMode } from "@/lib/server-db";
import { readCurrentUser } from "@/lib/auth";
import { getDictionary } from "@/i18n";

export default async function LoginPage() {
  if (!isMultiUserMode()) redirect("/");
  if (isFirstRun()) redirect("/signup");
  const user = await readCurrentUser();
  if (user) redirect("/");
  const t = (await getDictionary()).authForms;
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">tokenusage</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.loginTitle}</p>
      </div>
      <LoginForm
        labels={{
          identifier: t.emailOrUsername,
          password: t.password,
          submit: t.signIn,
          submitting: t.signingIn,
        }}
      />
    </main>
  );
}
