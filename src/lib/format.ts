export function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function formatUsd(n: number, opts: { precise?: boolean } = {}): string {
  // Sub-dollar amounts need more decimals or they round to nothing
  // (a $0.0091 model price → "$0.01" hides the actual cost). Keep 4
  // decimals there; tooltips with truly micro pricing can ask for
  // 6 via `precise: true`.
  if (n < 1) return `$${n.toFixed(opts.precise ? 6 : 4)}`;
  // Everywhere else: always 2 decimals with thousands separator.
  // "$1,587.51" reads cleaner than "$1587.5073" / "$1587.51".
  const fixed = n.toFixed(2);
  const [whole, frac] = fixed.split(".");
  return `$${Number(whole).toLocaleString("en-US")}.${frac}`;
}

export function formatInt(n: number): string {
  return n.toLocaleString("en-US");
}
