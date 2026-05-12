// The agent version we currently ship. Bumped alongside the
// homebrew tap formula. The sidebar pulls this and compares against
// each user's last-reported `agent_version` to decide whether to
// show the "update available" badge.
//
// Two source of truths is regrettable but keeping it server-side
// means we can show a stale-client warning even if a user is on an
// old `tokenusage` binary that doesn't know about a newer one.
export const LATEST_AGENT_VERSION = "0.18.2";

// SemVer-ish comparison good enough for our X.Y.Z scheme. Returns
// negative if a < b, 0 if equal, positive if a > b. Treats missing
// components as 0 ("0.17" < "0.17.1").
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((x) => parseInt(x, 10) || 0);
  const pb = b.split(".").map((x) => parseInt(x, 10) || 0);
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da - db;
  }
  return 0;
}

export function isAgentOutdated(current: string | null | undefined): boolean {
  if (!current) return false; // unknown — don't false-alarm
  return compareVersions(current, LATEST_AGENT_VERSION) < 0;
}
