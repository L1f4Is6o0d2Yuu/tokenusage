"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  authenticate,
  createSession,
  createUser,
  destroySession,
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

export async function signupAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  // Signup is only allowed on a fresh server (no users yet). After the first
  // admin exists, additional accounts are created via /tokens or by editing
  // the DB directly. Keeps the public surface tight.
  if (!isFirstRun()) return { error: "signup is closed — server already has users" };
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) return { error: "username and password are required" };
  if (username.length < 2) return { error: "username too short" };
  if (password.length < 8) return { error: "password must be at least 8 characters" };
  const user = createUser(username, password);
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
