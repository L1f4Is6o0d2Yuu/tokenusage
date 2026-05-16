import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "./form";
import { isFirstRun, isMultiUserMode } from "@/lib/server-db";
import { readCurrentUser } from "@/lib/auth";
import { googleConfigured } from "@/lib/oauth-google";
import { getDictionary } from "@/i18n";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  oauth_no_account: "no account with that Google address — ask an admin for an invite",
  oauth_email_unverified: "Google says this address is unverified",
  oauth_state_mismatch: "session got out of sync — try again",
  oauth_expired: "sign-in link expired — try again",
  oauth_exchange_failed: "couldn't reach Google — try again",
  oauth_missing_code: "Google didn't return a code — try again",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!isMultiUserMode()) redirect("/");
  if (isFirstRun()) redirect("/signup");
  const user = await readCurrentUser();
  if (user) redirect("/");
  const t = (await getDictionary()).authForms;
  const { error } = await searchParams;
  const oauthError = error ? OAUTH_ERROR_MESSAGES[error] ?? error : null;
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-fg-strong">tokenusage</h1>
        <p className="mt-1 text-sm text-fg-muted">{t.loginTitle}</p>
      </div>
      {oauthError && (
        <p className="mb-3 rounded border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          {oauthError}
        </p>
      )}
      <LoginForm
        labels={{
          identifier: t.emailOrUsername,
          password: t.password,
          submit: t.signIn,
          submitting: t.signingIn,
        }}
      />
      {googleConfigured() && (
        <>
          <div className="my-4 flex items-center gap-3 text-xs text-fg-muted">
            <span className="h-px flex-1 bg-border-subtle" />
            <span>or</span>
            <span className="h-px flex-1 bg-border-subtle" />
          </div>
          <a
            href="/auth/oauth/google/start"
            className="flex w-full items-center justify-center gap-2 rounded-md border border-border-subtle bg-bg-input px-4 py-2 text-sm font-medium text-fg-strong transition hover:bg-bg-subtle"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
              />
            </svg>
            Sign in with Google
          </a>
        </>
      )}
      <div className="mt-4 flex items-center justify-between text-xs">
        <Link
          href="/forgot-password"
          className="text-fg-muted transition-colors hover:text-fg-default"
        >
          {t.forgotPasswordLink}
        </Link>
        <p className="text-fg-muted">
          {t.noAccount}{" "}
          <Link
            href="/signup"
            className="text-accent transition-colors hover:text-fg-default"
          >
            {t.signUpNow}
          </Link>
        </p>
      </div>
    </main>
  );
}
