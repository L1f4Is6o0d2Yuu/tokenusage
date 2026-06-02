import { readCurrentUserD1, createApiTokenD1 } from "@/lib/cloudflare-auth";
import { getPublicUrl } from "@/lib/public-url";

export async function POST(): Promise<Response> {
  const user = await readCurrentUserD1();
  if (!user) {
    return new Response(JSON.stringify({ ok: false, message: "not signed in" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const { plaintext } = await createApiTokenD1(user.id, `agent ${stamp}`);
  const publicUrl = await getPublicUrl();

  const brewCommand =
    `{ command -v brew >/dev/null || /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"; } \\\n` +
    `  && eval "$(brew shellenv 2>/dev/null || /opt/homebrew/bin/brew shellenv 2>/dev/null || /usr/local/bin/brew shellenv 2>/dev/null || /home/linuxbrew/.linuxbrew/bin/brew shellenv 2>/dev/null)" \\\n` +
    `  && brew install L1f4Is6o0d2Yuu/tap/tokenusage \\\n` +
    `  && tokenusage start --server ${publicUrl} --token ${plaintext}`;
  const curlCommand = `curl -fsSL "${publicUrl}/install.sh?token=${plaintext}" | sh`;

  return Response.json({
    ok: true,
    token: plaintext,
    commands: { brew: brewCommand, curl: curlCommand },
  });
}
