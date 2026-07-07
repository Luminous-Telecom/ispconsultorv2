import { Request, Response } from 'express';
import { createHash } from 'crypto';
import { Agent } from '../models/agent/Agent';

/** Header obrigatório nas rotas de instalação do agente (não usar token na query — evita vazamento em URL/logs). */
export const AGENT_INSTALL_TOKEN_HEADER = 'X-Agent-Token';

export function isBrowserDocumentNavigation(req: Request): boolean {
  const fetchMode = req.get('Sec-Fetch-Mode')?.toLowerCase();
  const fetchDest = req.get('Sec-Fetch-Dest')?.toLowerCase();
  const accept = req.get('Accept')?.toLowerCase() ?? '';

  if (fetchMode === 'navigate' || fetchDest === 'document') {
    return true;
  }

  const preferredResponse = accept
    .split(',')
    .map((type) => type.split(';')[0].trim())
    .find(Boolean);

  return preferredResponse === 'text/html' || preferredResponse === 'application/xhtml+xml';
}

export function rejectAgentInstallBrowserAccess(req: Request, res: Response): boolean {
  if (!isBrowserDocumentNavigation(req)) {
    return false;
  }
  res.status(404).end();
  return true;
}

export function extractAgentInstallToken(req: Request): string | null {
  const headerToken = req.get(AGENT_INSTALL_TOKEN_HEADER)?.trim();
  if (headerToken) return headerToken;

  const auth = req.get('Authorization')?.trim();
  if (auth?.toLowerCase().startsWith('bearer ')) {
    const bearer = auth.slice(7).trim();
    return bearer || null;
  }

  return null;
}

export async function resolveAgentByInstallToken(
  agentId: number | string,
  token: string
): Promise<Agent | null> {
  const agent = await Agent.findByPk(agentId);
  if (!agent) return null;

  const tokenHash = createHash('sha256').update(token).digest('hex');
  if (tokenHash !== agent.token_hash) return null;

  return agent;
}
