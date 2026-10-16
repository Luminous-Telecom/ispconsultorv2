import { Request, Response } from 'express';
import { createHash } from 'crypto';
import { Agent } from '../models/agent/Agent';
import {
  AGENT_INSTALL_TOKEN_HEADER,
  extractAgentInstallToken,
  isBrowserDocumentNavigation,
  rejectAgentInstallBrowserAccess,
  resolveAgentByInstallToken,
} from './agentInstallAuth';

jest.mock('../models/agent/Agent', () => ({
  Agent: { findByPk: jest.fn() },
}));

function asRequest(headers: Record<string, string>): Request {
  return {
    get(name: string) {
      return headers[name.toLowerCase()];
    },
  } as Request;
}

describe('instalação do agente', () => {
  it('trata navegação de documento como acesso de navegador', () => {
    expect(isBrowserDocumentNavigation(asRequest({ 'sec-fetch-mode': 'navigate' }))).toBe(true);
    expect(isBrowserDocumentNavigation(asRequest({ accept: 'text/html,application/json' }))).toBe(true);
    expect(isBrowserDocumentNavigation(asRequest({ accept: 'application/json' }))).toBe(false);
  });

  it('responde 404 e interrompe quando o acesso vem do navegador', () => {
    const end = jest.fn();
    const status = jest.fn(() => ({ end }));
    const blocked = rejectAgentInstallBrowserAccess(
      asRequest({ 'sec-fetch-dest': 'document' }),
      { status } as unknown as Response
    );
    expect(blocked).toBe(true);
    expect(status).toHaveBeenCalledWith(404);
    expect(end).toHaveBeenCalled();
  });

  it('lê o token do header dedicado e, na falta dele, do Bearer', () => {
    expect(AGENT_INSTALL_TOKEN_HEADER).toBe('X-Agent-Token');
    expect(extractAgentInstallToken(asRequest({ 'x-agent-token': ' abc ' }))).toBe('abc');
    expect(extractAgentInstallToken(asRequest({ authorization: 'Bearer secreto' }))).toBe('secreto');
    expect(extractAgentInstallToken(asRequest({}))).toBeNull();
  });

  it('só devolve o agente quando o hash do token confere', async () => {
    const findByPk = Agent.findByPk as jest.Mock;
    findByPk.mockResolvedValueOnce(null);
    expect(await resolveAgentByInstallToken(1, 'token')).toBeNull();

    const token = 'token-instalacao';
    const tokenHash = createHash('sha256').update(token).digest('hex');
    findByPk.mockResolvedValueOnce({ id: 1, token_hash: 'outro' });
    expect(await resolveAgentByInstallToken(1, token)).toBeNull();

    const agent = { id: 1, token_hash: tokenHash };
    findByPk.mockResolvedValueOnce(agent);
    expect(await resolveAgentByInstallToken(1, token)).toBe(agent);
  });
});
