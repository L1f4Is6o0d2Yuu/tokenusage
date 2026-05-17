import type { NextRequest } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { getPublicUrl } from "@/lib/public-url";

// Generates the install script. The token is taken from the query string
// and baked into the bash output so users can `curl … | sh` in one step.
//
// We don't validate the token's existence here — the token is verified
// when the agent first calls /api/upload or /api/sync-wait. Returning a
// "valid-looking" install script for a non-existent token is harmless;
// the agent will just log auth errors until the token is real.
export async function GET(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  if (!/^tu_[a-f0-9]{4,}$/.test(token)) {
    return new Response(
      "# Missing or malformed token. Generate one at /tokens and use:\n" +
        "#   curl -fsSL '<server>/install.sh?token=tu_…' | sh\n",
      { status: 400, headers: { "content-type": "text/x-shellscript; charset=utf-8" } }
    );
  }

  const server = await getPublicUrl();
  // Optional direct-upload endpoint. Prefer an explicit env var; fall
  // back to deriving https://${TOKENUSAGE_DIRECT_DOMAIN} so a single
  // entry in .env wires both Caddy routing and install-command output.
  // Empty when neither is set — the agent then uses $SERVER for uploads.
  const uploadServer =
    process.env.TOKENUSAGE_UPLOAD_SERVER ||
    (process.env.TOKENUSAGE_DIRECT_DOMAIN
      ? `https://${process.env.TOKENUSAGE_DIRECT_DOMAIN}`
      : "");
  const tmplPath = path.join(process.cwd(), "agent", "install.sh.template");
  const tmpl = await fs.readFile(tmplPath, "utf8");
  const body = tmpl
    .replace(/__SERVER__/g, server)
    .replace(/__TOKEN__/g, token)
    .replace(/__UPLOAD_SERVER__/g, uploadServer);

  return new Response(body, {
    headers: {
      "content-type": "text/x-shellscript; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
