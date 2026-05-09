// Hardcoded model price table (USD per token). Used by adapters whose source
// data doesn't include pre-computed cost (e.g. codex sessions). Update as
// providers change pricing — these are estimates, not invoices.
//
// Cache-read is typically discounted ~10x vs input; reasoning is billed at the
// output rate by default unless we know better.

export type ModelPricing = {
  inputPerToken: number;
  outputPerToken: number;
  cacheReadPerToken?: number;
  cacheWritePerToken?: number;
  reasoningPerToken?: number;
};

const PRICES: Array<{ match: RegExp; price: ModelPricing }> = [
  // OpenAI / Codex models
  { match: /^gpt-5\.5/i, price: { inputPerToken: 5 / 1e6, outputPerToken: 20 / 1e6, cacheReadPerToken: 0.5 / 1e6 } },
  { match: /^gpt-5\.4/i, price: { inputPerToken: 3 / 1e6, outputPerToken: 12 / 1e6, cacheReadPerToken: 0.3 / 1e6 } },
  { match: /^gpt-5/i,    price: { inputPerToken: 3 / 1e6, outputPerToken: 12 / 1e6, cacheReadPerToken: 0.3 / 1e6 } },
  { match: /^o4-mini/i,  price: { inputPerToken: 1.1 / 1e6, outputPerToken: 4.4 / 1e6, cacheReadPerToken: 0.275 / 1e6 } },
  { match: /^o4/i,       price: { inputPerToken: 5 / 1e6, outputPerToken: 20 / 1e6, cacheReadPerToken: 1.25 / 1e6 } },
  // Anthropic
  { match: /opus/i,      price: { inputPerToken: 15 / 1e6, outputPerToken: 75 / 1e6, cacheReadPerToken: 1.5 / 1e6, cacheWritePerToken: 18.75 / 1e6 } },
  { match: /sonnet/i,    price: { inputPerToken: 3 / 1e6, outputPerToken: 15 / 1e6, cacheReadPerToken: 0.3 / 1e6, cacheWritePerToken: 3.75 / 1e6 } },
  { match: /haiku/i,     price: { inputPerToken: 0.8 / 1e6, outputPerToken: 4 / 1e6, cacheReadPerToken: 0.08 / 1e6, cacheWritePerToken: 1 / 1e6 } },
  // DeepSeek
  { match: /deepseek-reasoner/i, price: { inputPerToken: 0.55 / 1e6, outputPerToken: 2.19 / 1e6, cacheReadPerToken: 0.14 / 1e6 } },
  { match: /deepseek/i,  price: { inputPerToken: 0.27 / 1e6, outputPerToken: 1.1 / 1e6, cacheReadPerToken: 0.07 / 1e6 } },
  // Gemini
  { match: /gemini.*pro/i, price: { inputPerToken: 1.25 / 1e6, outputPerToken: 5 / 1e6, cacheReadPerToken: 0.3125 / 1e6 } },
];

export function getPricing(model: string | null | undefined): ModelPricing | null {
  if (!model) return null;
  for (const { match, price } of PRICES) {
    if (match.test(model)) return price;
  }
  return null;
}

export function estimateCost(
  model: string | null | undefined,
  tokens: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    reasoning: number;
  }
): number | null {
  const p = getPricing(model);
  if (!p) return null;
  return (
    tokens.input * p.inputPerToken +
    tokens.output * p.outputPerToken +
    tokens.cacheRead * (p.cacheReadPerToken ?? p.inputPerToken * 0.1) +
    tokens.cacheWrite * (p.cacheWritePerToken ?? p.inputPerToken * 1.25) +
    tokens.reasoning * (p.reasoningPerToken ?? p.outputPerToken)
  );
}
