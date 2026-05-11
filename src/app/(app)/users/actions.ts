"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  readCurrentUser,
  createInvite,
  revokeInvite,
  flagPasswordReset,
  updateInviteNote,
} from "@/lib/auth";

async function requireAdmin() {
  const user = await readCurrentUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/");
  return user;
}

export async function createInviteAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const note = String(formData.get("note") ?? "").trim() || null;
  const { plaintext } = createInvite(admin.id, note);
  revalidatePath("/users");
  redirect(`/users?new=${encodeURIComponent(plaintext)}`);
}

export async function revokeInviteAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return;
  revokeInvite(id);
  revalidatePath("/users");
}

// Edit the descriptive note on an invite. Empty input clears the note.
// We let admins edit even after redemption — the note is bookkeeping, not
// an authentication concern.
export async function updateInviteNoteAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const noteRaw = String(formData.get("note") ?? "").trim();
  if (!Number.isFinite(id)) return;
  updateInviteNote(id, noteRaw || null);
  revalidatePath("/users");
}

// Admin marks a user as eligible to reset their own password. The user can
// then walk through /forgot-password to pick a new one. Without this flag
// the reset page tells the user to ask the admin — there is no SMTP path.
export async function resetUserPasswordAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = Number(formData.get("userId"));
  if (!Number.isFinite(id) || id === admin.id) return;
  flagPasswordReset(id);
  revalidatePath("/users");
}
