"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeOverride, deleteOverride, type Rule } from "@/lib/pricing";

// Form input is $/M tokens (easier to read); we store per-token internally.
const PER_M = 1_000_000;

function parseNum(v: FormDataEntryValue | null): number | undefined {
  if (typeof v !== "string" || v.trim() === "") return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n / PER_M;
}

function requireNum(v: FormDataEntryValue | null): number | null {
  if (typeof v !== "string" || v.trim() === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return n / PER_M;
}

export async function savePricesAction(formData: FormData): Promise<void> {
  const rules: Rule[] = [];
  // FormData rule indices come from inputs named like rule[0].match etc.
  // We collect by scanning all keys that match the pattern.
  const indices = new Set<number>();
  for (const key of formData.keys()) {
    const m = /^rule\[(\d+)\]\./.exec(key);
    if (m) indices.add(Number(m[1]));
  }
  const sorted = [...indices].sort((a, b) => a - b);
  for (const i of sorted) {
    const match = String(formData.get(`rule[${i}].match`) ?? "").trim();
    if (!match) continue; // skip blank rows (user left "add new" empty)
    const input = requireNum(formData.get(`rule[${i}].input`));
    const output = requireNum(formData.get(`rule[${i}].output`));
    if (input == null || output == null) continue; // need at least input + output
    rules.push({
      match,
      input,
      output,
      cacheRead: parseNum(formData.get(`rule[${i}].cacheRead`)),
      cacheWrite: parseNum(formData.get(`rule[${i}].cacheWrite`)),
      reasoning: parseNum(formData.get(`rule[${i}].reasoning`)),
    });
  }

  writeOverride(rules);
  revalidatePath("/");
  revalidatePath("/prices");
  redirect("/prices?saved=1");
}

export async function resetPricesAction(): Promise<void> {
  deleteOverride();
  revalidatePath("/");
  revalidatePath("/prices");
  redirect("/prices?reset=1");
}
