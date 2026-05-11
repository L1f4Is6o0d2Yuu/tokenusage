"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  authenticate,
  createSession,
  createUser,
  destroySession,
  redeemInvite as redeemInviteInternal,
  lookupPasswordReset,
  completePasswordReset,
  recordUserIp,
  SESSION_COOKIE,
} from "@/lib/auth";
import { isFirstRun, isMultiUserMode } from "@/lib/server-db";
import { cookieOptions } from "@/lib/cookie-opts";
import { isValidEmail, checkPasswordPolicy } from "@/lib/auth-validation";

const ONE_MONTH = 60 * 60 * 24 * 30;

function setSessionCookie(token: string) {
  return cookies().then((c) =>
    c.set(SESSION_COOKIE, token, cookieOptions(ONE_MONTH))
  );
}

// Pull the real client IP out of the request. Caddy sets X-Forwarded-For;
// for direct connections (rare) we fall back to X-Real-IP. The XFF can
// be a chain — `clientIp, proxy1, proxy2` — so we take the first hop.
async function clientIpFromHeaders(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? "";
  return h.get("x-real-ip")?.trim() ?? "";
}

export type AuthFormState = { error?: string };

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) return { error: "username and password are required" };
  const user = authenticate(username, password);
  if (!user) return { error: "invalid username or password" };
  recordUserIp(user.id, await clientIpFromHeaders());
  recordUserIp(user.id, await clientIpFromHeaders());
  const token = createSession(user.id);
  await setSessionCookie(token);
  revalidatePath("/", "layout");
  redirect("/");
}

function passwordError(password: string): string | null {
  const p = checkPasswordPolicy(password);
  if (p.ok) return null;
  if (p.reason === "too-short") return "password must be at least 8 characters";
  if (p.reason === "missing-letter") return "password must contain a letter";
  if (p.reason === "missing-digit") return "password must contain a digit";
  return "password does not meet the policy";
}

export async function signupAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  // First-run admin signup only — after the first user exists, additional
  // accounts go through /signup?invite=... (the redemption flow below).
  if (!isFirstRun()) return { error: "signup is closed — use an invite link instead" };
  const username = String(formData.get("username") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) return { error: "username and password are required" };
  if (username.length < 2) return { error: "username too short" };
  if (email && !isValidEmail(email)) return { error: "email looks invalid" };
  const pwErr = passwordError(password);
  if (pwErr) return { error: pwErr };
  const user = createUser({
    username,
    email: email || null,
    password,
    isAdmin: true,
  });
  recordUserIp(user.id, await clientIpFromHeaders());
  const token = createSession(user.id);
  await setSessionCookie(token);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function redeemInviteAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const invite = String(formData.get("invite") ?? "");
  const username = String(formData.get("username") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!invite) return { error: "missing invite token" };
  if (!email || !isValidEmail(email)) return { error: "valid email is required" };
  const pwErr = passwordError(password);
  if (pwErr) return { error: pwErr };
  const finalUsername = username || email.split("@")[0];
  if (finalUsername.length < 2) return { error: "username too short" };
  let user;
  try {
    user = redeemInviteInternal(invite, finalUsername, email, password);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "could not redeem invite";
    if (msg.includes("UNIQUE constraint") && msg.includes("email")) {
      return { error: "an account with that email already exists" };
    }
    if (msg.includes("UNIQUE constraint") && msg.includes("username")) {
      return { error: "that username is taken — choose another" };
    }
    return { error: msg };
  }
  recordUserIp(user.id, await clientIpFromHeaders());
  const token = createSession(user.id);
  await setSessionCookie(token);
  revalidatePath("/", "layout");
  redirect("/");
}

// Step 1 of forgot-password: confirm an admin has flagged the user's account
// for reset. If yes, send the user to the new-password form. If no, show the
// "ask the admin" message — we don't email a link because the server has no
// SMTP path configured.
export type ForgotPasswordLookupState = {
  error?: string;
  notFlagged?: boolean;
};

export async function forgotPasswordLookupAction(
  _prev: ForgotPasswordLookupState,
  formData: FormData
): Promise<ForgotPasswordLookupState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email || !isValidEmail(email)) return { error: "valid email is required" };
  const lookup = lookupPasswordReset(email);
  if (!lookup.ok) {
    // Tell the user "not reset" identically whether they typed a wrong email
    // or a real one without the admin flag. That way enumeration via this
    // form leaks nothing about which emails are registered.
    return { notFlagged: true };
  }
  redirect(`/forgot-password?step=reset&email=${encodeURIComponent(email)}`);
}

// Step 2: actually swap the password. Re-checks the flag inside the txn so
// an admin who unflagged the user between step 1 and step 2 still wins.
export async function forgotPasswordCompleteAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !isValidEmail(email)) return { error: "valid email is required" };
  const pwErr = passwordError(password);
  if (pwErr) return { error: pwErr };
  const ok = completePasswordReset(email, password);
  if (!ok) return { error: "reset is no longer available — ask the admin to flag your account again" };
  // Log the user in directly: the admin already vouched for them.
  const auth = authenticate(email, password);
  if (auth) {
    recordUserIp(auth.id, await clientIpFromHeaders());
    const token = createSession(auth.id);
    await setSessionCookie(token);
  }
  revalidatePath("/", "layout");
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (token) destroySession(token);
  c.delete(SESSION_COOKIE);
  revalidatePath("/", "layout");
  redirect(isMultiUserMode() ? "/login" : "/");
}
