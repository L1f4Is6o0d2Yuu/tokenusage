"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { readCurrentUser, createInvite, revokeInvite } from "@/lib/auth";

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
