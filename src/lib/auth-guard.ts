import "server-only";
import { redirect } from "next/navigation";
import { isFirstRun, isMultiUserMode } from "./server-db";
import { readCurrentUser, type User } from "./auth";

// Server-component guard: ensures the request is allowed to view a protected
// page. Returns null when single-user mode is active (no auth needed).
//
// Multi-user mode: returns the current user, or redirects to /login (or
// /signup if the server is fresh and has no users).
export async function requireUser(): Promise<User | null> {
  if (!isMultiUserMode()) {
    if (isFirstRun()) {
      // server.db file may exist (created when checking) but no users yet.
      // Treat as single-user.
      return null;
    }
    return null;
  }
  const user = await readCurrentUser();
  if (!user) {
    redirect(isFirstRun() ? "/signup" : "/login");
  }
  return user;
}

export async function requireAdmin(): Promise<User | null> {
  const user = await requireUser();
  if (user && !user.isAdmin) redirect("/dashboard");
  return user;
}
