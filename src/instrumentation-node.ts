// Node-runtime-only side of instrumentation. Loaded via dynamic import from
// instrumentation.ts so the Edge bundle never sees `process.on` /
// `process.exit`.

export {};

// Filter out client-disconnect noise. When a browser or agent aborts a
// streaming request mid-flight, Node emits `Error: aborted` (code
// ECONNRESET) on the underlying socket. Next.js's standalone server doesn't
// always attach an `error` listener to the streamed body, so it bubbles up
// as ⨯ uncaughtException — visually alarming but harmless. Drop those
// silently; let real errors crash as Node would by default.
const isClientAbort = (err: unknown): boolean => {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string };
  return e.code === "ECONNRESET" || e.message === "aborted";
};

process.on("uncaughtException", (err) => {
  if (isClientAbort(err)) return;
  console.error("uncaughtException:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  if (isClientAbort(reason)) return;
  console.error("unhandledRejection:", reason);
});
