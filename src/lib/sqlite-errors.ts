// SQLite error codes that mean "try again later, the disk/lock will free up"
// rather than "your request is malformed". Callers treat these as backoff
// signals (HTTP 503 + Retry-After + X-TU-Reason) so the agent can retry
// instead of exit(1).

export type RetryableSqliteError = {
  reason: "disk_full" | "busy" | "readonly";
  retryAfter: number; // seconds
};

export function classifySqliteError(e: unknown): RetryableSqliteError | null {
  if (!e || typeof e !== "object") return null;
  const code = (e as { code?: unknown }).code;
  if (typeof code !== "string") return null;
  if (code === "SQLITE_FULL" || code.startsWith("SQLITE_IOERR")) {
    return { reason: "disk_full", retryAfter: 60 };
  }
  if (code === "SQLITE_BUSY" || code === "SQLITE_LOCKED") {
    return { reason: "busy", retryAfter: 5 };
  }
  if (code === "SQLITE_READONLY") {
    return { reason: "readonly", retryAfter: 60 };
  }
  return null;
}

export function retryableErrorHeaders(
  retry: RetryableSqliteError
): Record<string, string> {
  return {
    "Retry-After": String(retry.retryAfter),
    "X-TU-Reason": retry.reason,
  };
}
