import { requireUser } from "@/lib/auth-guard";
import {
  getOpenRouterModels,
  modelVendorFromId,
  perMillion,
  type OpenRouterModel,
} from "@/lib/openrouter";
import { PLAN_CATALOG } from "@/lib/subscriptions";
import { getDictionary, readLocale } from "@/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// "Models browser" — a catalog of every AI model OpenRouter knows about,
// grouped by vendor, with context length / modalities / current per-M
// pricing / which of our subscription plans nominally cover them.
//
// Surfaces info the user can't get from the dashboard's per-row pricing
// tooltip: full context window, multimodal flags, cache-write rates.
// Also handy for "which of my plans covers gpt-5.5?" — the plan badges
// resolve that without leaving the page.

// Curated vendors we have a real story for. Everything else is hidden
// behind a "more" disclosure so the page doesn't sprawl.
const FEATURED_VENDORS = [
  "Anthropic",
  "OpenAI",
  "Google",
  "DeepSeek",
  "Xiaomi",
  "Alibaba",
  "Moonshot",
  "Zhipu",
  "MiniMax",
  "Baidu",
  "Tencent",
  "Stepfun",
];

export default async function ModelsPage() {
  await requireUser();
  const locale = await readLocale();
  const dict = await getDictionary(locale);
  const t = dict.modelsPage;

  let models: OpenRouterModel[] = [];
  let fetchError: string | null = null;
  try {
    models = await getOpenRouterModels();
  } catch (e) {
    fetchError = e instanceof Error ? e.message : String(e);
  }

  // Group by vendor, then sort each vendor's models by id alphabetically.
  // OpenRouter returns ~360 entries; we keep them all but split into
  // "featured" / "other" so the eye lands on the curated set first.
  const byVendor = new Map<string, OpenRouterModel[]>();
  for (const m of models) {
    if (m.id.endsWith(":free")) continue; // skip free preview shims
    const vendor = modelVendorFromId(m.id);
    let arr = byVendor.get(vendor);
    if (!arr) {
      arr = [];
      byVendor.set(vendor, arr);
    }
    arr.push(m);
  }
  for (const arr of byVendor.values()) arr.sort((a, b) => a.id.localeCompare(b.id));

  const featured = FEATURED_VENDORS.filter((v) => byVendor.has(v));
  const other = [...byVendor.keys()].filter((v) => !FEATURED_VENDORS.includes(v)).sort();

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center border-b border-border-subtle bg-bg-app/85 px-6 py-3 backdrop-blur">
        <div>
          <h1 className="text-base font-medium tracking-tight text-fg-strong">
            {t.title}
          </h1>
          <p className="truncate text-[12px] text-fg-muted">{t.subtitle}</p>
        </div>
      </header>

      <div className="flex-1 px-6 py-5 space-y-6">
        {fetchError && (
          <div className="rounded-md border border-warning/40 bg-warning/5 px-4 py-3 text-xs text-warning">
            {t.fetchError}: {fetchError}
          </div>
        )}

        {featured.map((vendor) => (
          <VendorSection
            key={vendor}
            vendor={vendor}
            models={byVendor.get(vendor) ?? []}
            t={t}
          />
        ))}

        {other.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-fg-muted hover:text-fg-default">
              {t.otherVendors} ({other.length})
            </summary>
            <div className="mt-3 space-y-5">
              {other.map((vendor) => (
                <VendorSection
                  key={vendor}
                  vendor={vendor}
                  models={byVendor.get(vendor) ?? []}
                  t={t}
                />
              ))}
            </div>
          </details>
        )}
      </div>
    </>
  );
}

function VendorSection({
  vendor,
  models,
  t,
}: {
  vendor: string;
  models: OpenRouterModel[];
  t: ReturnType<typeof tShape>;
}) {
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg-strong">
        <span className="inline-block h-3 w-1 rounded-full bg-accent" />
        {vendor}
        <span className="text-xs font-normal text-fg-muted">· {models.length}</span>
      </h2>
      <div className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-3">
        {models.map((m) => (
          <ModelCard key={m.id} model={m} t={t} />
        ))}
      </div>
    </section>
  );
}

function ModelCard({
  model,
  t,
}: {
  model: OpenRouterModel;
  t: ReturnType<typeof tShape>;
}) {
  const input = perMillion(model.pricing?.prompt);
  const output = perMillion(model.pricing?.completion);
  const cacheRead = perMillion(model.pricing?.input_cache_read);
  const ctx = model.context_length;
  const modality = model.architecture?.modality ?? "text->text";
  const isMultimodal = /image|audio|video/i.test(modality);

  // Which of our subscription plans would cover usage of this model?
  // Surfaces "this model is covered by Claude Pro / Cursor Pro" so the
  // user knows what flat-fee bucket it falls under.
  const coveringPlans = PLAN_CATALOG.filter((p) =>
    p.models.some((rx) => rx.test(model.id.split("/").pop() ?? model.id))
  ).slice(0, 3); // cap to keep the card scannable

  return (
    <Card className="panel-hover">
      <CardHeader className="space-y-1 pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm">{model.id.split("/").pop()}</CardTitle>
          {isMultimodal && (
            <Badge variant="outline" className="text-[10px] text-accent">
              MM
            </Badge>
          )}
        </div>
        {model.description && (
          <CardDescription className="line-clamp-2 text-xs">
            {model.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono tabular-nums">
          {input != null && (
            <Stat label={t.colInput} value={`$${fmtRate(input)}/M`} />
          )}
          {output != null && (
            <Stat label={t.colOutput} value={`$${fmtRate(output)}/M`} />
          )}
          {cacheRead != null && (
            <Stat label={t.colCacheRead} value={`$${fmtRate(cacheRead)}/M`} />
          )}
          {ctx != null && (
            <Stat label={t.colContext} value={fmtCtx(ctx)} />
          )}
        </div>
        {coveringPlans.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            <span className="text-[10px] text-fg-faint">{t.coveredBy}:</span>
            {coveringPlans.map((p) => (
              <Badge key={p.id} variant="outline" className="text-[10px]">
                {p.name}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-[10px] uppercase tracking-wider text-fg-faint">
        {label}
      </span>
      <span className="text-fg-default">{value}</span>
    </div>
  );
}

function fmtRate(perM: number): string {
  if (perM === 0) return "0";
  if (perM < 0.01) return perM.toFixed(4);
  if (perM < 1) return perM.toFixed(3);
  return perM.toFixed(2);
}

function fmtCtx(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return String(n);
}

// Local helper for typing the `t` param without dragging the whole
// dictionary import into helpers.
function tShape() {
  return {} as {
    title: string;
    subtitle: string;
    otherVendors: string;
    fetchError: string;
    colInput: string;
    colOutput: string;
    colCacheRead: string;
    colContext: string;
    coveredBy: string;
  };
}
