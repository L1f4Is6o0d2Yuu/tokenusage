// Client-safe twin of getPricing(). The server sends the active rules
// array down with the initial render; this looks up a model name against
// those rules with the same regex / order semantics, no filesystem.

import type { ModelPricing, Rule } from "@/lib/pricing";

export function findPricing(
  rules: Rule[],
  model: string | null | undefined
): ModelPricing | null {
  if (!model) return null;
  for (const r of rules) {
    if (new RegExp(r.match, "i").test(model)) {
      return {
        inputPerToken: r.input,
        outputPerToken: r.output,
        cacheReadPerToken: r.cacheRead,
        cacheWritePerToken: r.cacheWrite,
        reasoningPerToken: r.reasoning,
      };
    }
  }
  return null;
}
