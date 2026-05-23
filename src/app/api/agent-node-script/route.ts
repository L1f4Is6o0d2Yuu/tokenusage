import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function GET(): Promise<Response> {
  const scriptPath = join(process.cwd(), "agent", "index.mjs");
  const script = await readFile(scriptPath, "utf8");
  return new Response(script, {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
