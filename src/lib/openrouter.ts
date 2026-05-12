import "server-only";

// OpenRouter is the same API we use weekly in scripts/refresh-prices.mjs
// to keep our local rate table fresh, but the model list itself carries
// a lot more than price — context length, modality flags, deprecation
// markers, etc. — and we want to surface that in the dashboard's
// /models browser.
//
// Auth is optional. The public path (no header) works fine; an
// OPENROUTER_API_KEY env var unlocks the same data with higher rate
// limits and lets us layer in credit/generation endpoints later.
//
// Cached in-process for 6h — at the project's traffic level we can
// afford one outbound request every few hours. A server restart
// blows the cache, which is fine; first hit after redeploy reseeds.

const TTL_MS = 6 * 60 * 60 * 1000;

export type OpenRouterModel = {
  id: string; // e.g. "anthropic/claude-opus-4.7"
  name: string;
  description?: string;
  context_length?: number;
  architecture?: {
    modality?: string; // "text->text" | "text+image->text" | ...
    input_modalities?: string[];
    output_modalities?: string[];
  };
  pricing?: {
    prompt?: string;
    completion?: string;
    input_cache_read?: string;
    input_cache_write?: string;
    internal_reasoning?: string;
  };
  top_provider?: { is_moderated?: boolean };
};

type Cached = { data: OpenRouterModel[]; fetchedAt: number };
let cache: Cached | null = null;
let inFlight: Promise<OpenRouterModel[]> | null = null;

async function fetchModelsFresh(): Promise<OpenRouterModel[]> {
  const key = process.env.OPENROUTER_API_KEY;
  const res = await fetch("https://openrouter.ai/api/v1/models", {
    headers: {
      accept: "application/json",
      "user-agent": "tokenusage/openrouter-client",
      ...(key ? { authorization: `Bearer ${key}` } : {}),
    },
    // The catalog is rarely-changing public data — cache aggressively.
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`OpenRouter API ${res.status} ${res.statusText}`);
  const json = (await res.json()) as { data?: OpenRouterModel[] };
  return Array.isArray(json.data) ? json.data : [];
}

export async function getOpenRouterModels(): Promise<OpenRouterModel[]> {
  const fresh = cache && Date.now() - cache.fetchedAt < TTL_MS;
  if (fresh) return cache!.data;
  // Coalesce concurrent fetches — a dozen page-loads after a server
  // restart shouldn't fan out into a dozen OR API hits.
  if (inFlight) return inFlight;
  inFlight = fetchModelsFresh()
    .then((data) => {
      cache = { data, fetchedAt: Date.now() };
      return data;
    })
    .catch((err) => {
      // On failure, keep the stale cache if any so the page still
      // renders. Caller decides how to surface the error to the UI.
      if (cache) return cache.data;
      throw err;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export function modelVendorFromId(id: string): string {
  const slash = id.indexOf("/");
  if (slash < 0) return id;
  const author = id.slice(0, slash);
  return ({
    anthropic: "Anthropic",
    openai: "OpenAI",
    google: "Google",
    deepseek: "DeepSeek",
    xiaomi: "Xiaomi",
    qwen: "Alibaba",
    moonshotai: "Moonshot",
    "z-ai": "Zhipu",
    minimax: "MiniMax",
    baidu: "Baidu",
    tencent: "Tencent",
    stepfun: "Stepfun",
    mistralai: "Mistral",
    meta: "Meta",
    nvidia: "Nvidia",
  } as Record<string, string>)[author] ?? author;
}

// USD per million tokens, computed from OpenRouter's per-token strings.
export function perMillion(s: string | undefined | null): number | null {
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return n * 1_000_000;
}
