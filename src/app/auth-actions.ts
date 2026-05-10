"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  authenticate,
  createSession,
  createUser,
  destroySession,
  redeemInvite as redeemInviteInternal,
  SESSION_COOKIE,
} from "@/lib/auth";
import { isFirstRun, isMultiUserMode } from "@/lib/server-db";

const ONE_MONTH = 60 * 60 * 24 * 30;

function setSessionCookie(token: string) {
  return cookies().then((c) =>
    c.set(SESSION_COOKIE, token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: ONE_MONTH,
    })
  );
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
  const token = createSession(user.id);
  await setSessionCookie(token);
  revalidatePath("/", "layout");
  redirect("/");
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
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
  if (password.length < 8) return { error: "password must be at least 8 characters" };
  const user = createUser({
    username,
    email: email || null,
    password,
    isAdmin: true,
  });
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
  if (!password || password.length < 8) return { error: "password must be at least 8 characters" };
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
  const token = createSession(user.id);
  await setSessionCookie(token);
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
