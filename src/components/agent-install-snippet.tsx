// Renders the one-liner that installs the agent. If `token` is provided,
// it's baked into the URL; otherwise we emit a placeholder for the user
// to edit before pasting. The script behind the URL detects the OS,
// installs a launchd / systemd service, and triggers an immediate
// upload — no Node, no npm, just curl + tar (built into Mac/Linux).
export function AgentInstallSnippet({
  publicUrl,
  token,
}: {
  publicUrl: string;
  token?: string;
}) {
  const tokenArg = token ?? "tu_YOUR_TOKEN_HERE";
  const cmd = `curl -fsSL "${publicUrl}/install.sh?token=${tokenArg}" | sh`;
  return (
    <pre className="overflow-x-auto rounded border bg-muted px-4 py-3 font-mono text-xs leading-relaxed">
      <code>{cmd}</code>
    </pre>
  );
}
