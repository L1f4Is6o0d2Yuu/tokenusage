export function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function formatUsd(n: number, opts: { precise?: boolean } = {}): string {
  if (opts.precise || n < 1) return `$${n.toFixed(4)}`;
  if (n < 100) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(0)}`;
}

export function formatInt(n: number): string {
  return n.toLocaleString("en-US");
}
