export function buildInstallScriptCommand(agentId: string | number, token: string, serverUrl?: string): string {
  const base = (serverUrl ?? window.location.origin).replace(/\/$/, '');
  return `curl -fsSL -H "X-Agent-Token: ${token}" "${base}/api/agents/${agentId}/install-script" | sudo bash`;
}
