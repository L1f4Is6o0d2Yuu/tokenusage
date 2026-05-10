import { readCurrentUser, createApiToken } from "@/lib/auth";
import { getPublicUrl } from "@/lib/public-url";

// One-click install support: dashboard hits this endpoint, gets back a fresh
// API token + ready-to-paste install commands for both Homebrew (recommended
// for Mac) and curl|sh (works on any Mac/Linux).
export async function POST(): Promise<Response> {
  const user = await readCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ ok: false, message: "not signed in" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const { plaintext } = createApiToken(user.id, `agent ${stamp}`);
  const publicUrl = await getPublicUrl();

  const brewCommand =
    `brew install L1f4Is6o0d2Yuu/tap/tokenusage && ` +
    `tokenusage start --server ${publicUrl} --token ${plaintext}`;
  const curlCommand = `curl -fsSL "${publicUrl}/install.sh?token=${plaintext}" | sh`;

  return Response.json({
    ok: true,
    token: plaintext,
    commands: { brew: brewCommand, curl: curlCommand },
  });
}
