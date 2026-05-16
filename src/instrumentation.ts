// Runs once when each Next.js server instance starts.
// See node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation.md
//
// The Node-runtime body lives in a separate file so Turbopack's Edge
// bundling doesn't see `process.on` / `process.exit` and warn about
// unsupported APIs.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
