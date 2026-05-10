import path from "node:path";
import fs from "node:fs/promises";

// Serves the tokenusage CLI script (bash). Both the Homebrew formula and
// the curl|sh installer end up running this same file — the curl path
// downloads it into ~/.tokenusage/tokenusage, the brew path puts it in
// ~/usr/local/bin (or /opt/homebrew/bin) via the formula. Same code, two
// install routes.
export async function GET(): Promise<Response> {
  const filePath = path.join(process.cwd(), "agent", "tokenusage");
  const body = await fs.readFile(filePath, "utf8");
  return new Response(body, {
    headers: {
      "content-type": "text/x-shellscript; charset=utf-8",
      "content-disposition": 'attachment; filename="tokenusage"',
      "cache-control": "no-store",
    },
  });
}
