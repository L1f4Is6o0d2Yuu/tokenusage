"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { readCurrentUser } from "@/lib/auth";
import { setShowOnLeaderboard } from "@/lib/leaderboard";

export async function toggleLeaderboardVisibility(formData: FormData): Promise<void> {
  const user = await readCurrentUser();
  if (!user) redirect("/login");
  const show = formData.get("show") === "1";
  setShowOnLeaderboard(user.id, show);
  revalidatePath("/leaderboard");
}
