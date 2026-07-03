export function buildInstallScriptCommand(agentId: number, token: string, serverUrl?: string): string {
  const base = (serverUrl ?? window.location.origin).replace(/\/$/, '');
  return `sudo bash <(curl -fsSL "${base}/api/agents/${agentId}/install-script?token=${encodeURIComponent(token)}")`;
}
