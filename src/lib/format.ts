export function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  // Aggregate proration can produce fractional token counts (a session
  // that overlaps the period for 0.4 of its lifetime contributes 0.4 ×
  // tokens). Round to an integer here or the KPI card overflows with
  // "67.02608417784928" type strings.
  return String(Math.round(n));
}

export function formatUsd(
  n: number,
  _opts: { precise?: boolean } = {}
): string {
  // Sub-dollar amounts need more decimals or they round to nothing
  // (a $0.0091 model price → "$0.01" hides the actual cost). 4 is
  // the floor — enough for per-token pricing without going micro.
  // The `precise` opt used to bump to 6; we no longer honor it
  // because "$0.379280" reads worse than "$0.3793".
  if (n < 1) return `$${n.toFixed(4)}`;
  // Everywhere else: 2 decimals with thousands separator.
  // "$1,587.51" reads cleaner than "$1587.5073".
  const fixed = n.toFixed(2);
  const [whole, frac] = fixed.split(".");
  return `$${Number(whole).toLocaleString("en-US")}.${frac}`;
}

export function formatInt(n: number): string {
  return n.toLocaleString("en-US");
}
