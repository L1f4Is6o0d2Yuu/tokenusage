import path from "node:path";
import fs from "node:fs/promises";

// Serves the long-running agent loop script (bash). Downloaded once by
// install.sh into ~/.tokenusage/agent.sh and then executed forever as a
// launchd / systemd service.
export async function GET(): Promise<Response> {
  const filePath = path.join(process.cwd(), "agent", "agent.sh");
  const body = await fs.readFile(filePath, "utf8");
  return new Response(body, {
    headers: {
      "content-type": "text/x-shellscript; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
