// Renders the copy-paste install + run command for the agent. If `token` is
// provided, it's baked in; otherwise we emit a placeholder for the user to
// edit. Shared between the /tokens page (with token filled in) and the
// dashboard empty state (with placeholder).

export function AgentInstallSnippet({
  publicUrl,
  token,
}: {
  publicUrl: string;
  token?: string;
}) {
  const tokenArg = token ?? "tu_YOUR_TOKEN_HERE";
  const cmd = `mkdir tokenusage-agent && cd tokenusage-agent
curl -O ${publicUrl}/api/agent
mv agent ./tokenusage-agent.mjs 2>/dev/null || mv tokenusage-agent.mjs ./tokenusage-agent.mjs
npm init -y && npm install better-sqlite3
node tokenusage-agent.mjs --server ${publicUrl} --token ${tokenArg}`;
  return (
    <pre className="overflow-x-auto rounded border bg-muted px-4 py-3 font-mono text-xs leading-relaxed">
      <code>{cmd}</code>
    </pre>
  );
}
