import { toPlain } from '../../../utils/toPlain';
import { Request, Response } from 'express';
import { createHash, randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import Joi from 'joi';
import { prisma } from '../../../db/prisma';
import { Agent } from '../../../models/agent/Agent';
import {
  disconnectAgentById,
  isAgentEffectivelyOnline,
  pingAgent,
} from '../../../services/agent/AgentService';
import {
  handshakeUnixForAgent,
  isWireguardAgent,
  provisionAgentWireguard,
  readWireguardHandshakes,
  teardownAgentWireguard,
  testAgentWireguard,
  wireguardAgentOnline,
} from '../../../services/agent/wireguard/AgentWireguardService';

import {
  formatAgentInstallSshError,
  installAgent,
} from '../../../services/agent/AgentInstallService';
import { generateInstallScript } from '../../../services/agent/AgentInstallScript';
import { sendSuccess, sendError, sendNotFound, sendValidationError } from '../../../utils/responseUtils';
import { logger } from '../../../utils/logger';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService';
import { AuthenticatedRequest } from '../../../types/auth';
import {
  getEmpresaIdOrNull,
  parseEmpresaIdQuery,
  resolveEmpresaScopeForList,
  resolveEmpresaIdForScopedCreate,
} from '../../../utils/tenantUtils';
import {
  AGENT_INSTALL_TOKEN_HEADER,
  extractAgentInstallToken,
  rejectAgentInstallBrowserAccess,
  resolveAgentByInstallToken,
} from '../../../utils/agentInstallAuth';

const AGENT_DIR = path.resolve(__dirname, '../../../../agent');
const ALLOWED_FILES = new Set(['index.js', 'package.json', 'Dockerfile']);

const installSchema = Joi.object({
  host: Joi.string().min(1).required(),
  port: Joi.number().integer().min(1).max(65535).default(22),
  username: Joi.string().min(1).required(),
  password: Joi.string().allow('').optional(),
  private_key: Joi.string().allow('').optional(),
});

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

type AgentFilter = Record<string, unknown>;

function hydrateAgent(row: Record<string, unknown>): Agent {
  const cliente = row.clientes;
  const scalar: Record<string, unknown> = { ...row };
  delete scalar.clientes;
  delete scalar.sistema_tenants;
  delete scalar.ssh_manager_devices;
  const agent = (Agent as unknown as { hydrate: (value: unknown) => Agent }).hydrate(scalar);
  if (cliente !== undefined) (agent as Agent & { cliente?: unknown }).cliente = cliente;
  return agent;
}

const agentClienteInclude = {
  clientes: { select: { id: true, razao_social: true, nome_fantasia: true } },
};

async function loadAgentById(id: unknown, withCliente = false): Promise<Agent | null> {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;
  const row = await prisma.agent_agents.findUnique({
    where: { id: numericId },
    ...(withCliente ? { include: agentClienteInclude } : {}),
  });
  return row ? hydrateAgent(row as unknown as Record<string, unknown>) : null;
}

function canAccessAgent(agent: Agent, userEmpresaId: number | null): boolean {
  if (agent.empresa_id === null) return true;
  if (userEmpresaId === null) return true;
  return agent.empresa_id === userEmpresaId;
}

const createSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(500).allow(null, '').optional(),
  cliente_id: Joi.number().integer().positive().allow(null).optional(),
  empresa_id: Joi.number().integer().positive().optional(),
});

const updateSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  description: Joi.string().max(500).allow(null, '').optional(),
  is_active: Joi.boolean().optional(),
  cliente_id: Joi.number().integer().positive().allow(null).optional(),
});

const wireguardSchema = Joi.object({
  mikrotik_host: Joi.string().trim().min(1).max(255).required(),
  mikrotik_api_port: Joi.number().integer().min(1).max(65535).default(80),
  mikrotik_api_tls: Joi.boolean().default(false),
  mikrotik_username: Joi.string().trim().min(1).max(64).required(),
  mikrotik_password: Joi.string().allow('').optional(),
  wg_listen_port: Joi.number().integer().min(1).max(65535).default(13231),
  wg_lan_cidrs: Joi.string().trim().min(1).max(500).required(),
});

function serializeAgent(agent: Agent, handshakes: Map<string, number>) {
  const json = toPlain(agent) as Record<string, unknown>;
  delete json.mikrotik_password;
  delete json.wg_our_private_key;
  const online = isWireguardAgent(agent)
    ? wireguardAgentOnline(agent, handshakes)
    : isAgentEffectivelyOnline(agent.id, agent.is_active);
  return {
    ...json,
    online,
    has_mikrotik_password: Boolean(agent.mikrotik_password),
    wg_handshake_at: handshakeUnixForAgent(agent, handshakes),
  };
}

export class AgentController {
  static async index(req: Request, res: Response): Promise<void> {
    try {
      const scopeEmpresaId = resolveEmpresaScopeForList(req, parseEmpresaIdQuery(req.query.empresa_id));
      const clienteId = parseEmpresaIdQuery(req.query.cliente_id);
      const parts: AgentFilter[] = [];
      if (scopeEmpresaId != null) {
        parts.push({ OR: [{ empresa_id: scopeEmpresaId }, { empresa_id: null }] });
      }
      if (clienteId != null) {
        parts.push({ cliente_id: clienteId });
      }
      const where: AgentFilter = parts.length === 0 ? {} : parts.length === 1 ? parts[0]! : { AND: parts };
      const rows = await prisma.agent_agents.findMany({
        where: where as never,
        orderBy: { created_at: 'desc' },
        include: agentClienteInclude,
      });
      const agents = rows.map((row) => hydrateAgent(row as unknown as Record<string, unknown>));
      const handshakes = agents.some((agent) => isWireguardAgent(agent))
        ? await readWireguardHandshakes()
        : new Map<string, number>();
      const data = agents.map((agent) => serializeAgent(agent, handshakes));
      sendSuccess(res, data);
    } catch (err) {
      logger.warn('AgentController.index: erro', { error: err });
      sendError(res, 'Erro ao listar agentes');
    }
  }

  static async show(req: Request, res: Response): Promise<void> {
    try {
      const agent = await loadAgentById(req.params.id, true);
      if (!agent) { sendNotFound(res, 'Agente não encontrado'); return; }
      const empresaId = getEmpresaIdOrNull(req);
      if (!canAccessAgent(agent, empresaId)) { sendNotFound(res, 'Agente não encontrado'); return; }
      const handshakes = isWireguardAgent(agent) ? await readWireguardHandshakes() : new Map<string, number>();
      sendSuccess(res, serializeAgent(agent, handshakes));
    } catch (err) {
      sendError(res, 'Erro ao buscar agente');
    }
  }

  static async store(req: Request, res: Response): Promise<void> {
    const { error, value } = createSchema.validate(req.body, { abortEarly: false });
    if (error) { sendValidationError(res, error.details.map((d) => d.message).join('; ')); return; }

    try {
      const resolved = await resolveEmpresaIdForScopedCreate(req, {
        cliente_id: value.cliente_id ?? null,
        empresa_id: value.empresa_id ?? null,
      });
      if (!resolved.ok) {
        sendValidationError(res, resolved.message);
        return;
      }
      if (resolved.empresa_id != null) {
      }
      const token = randomBytes(32).toString('hex');
      const tokenHash = hashToken(token);
      const tokenHint = token.slice(0, 8) + '...';

      const created = await prisma.agent_agents.create({
        data: {
          name: value.name,
          description: value.description ?? null,
          token_hash: tokenHash,
          token_hint: tokenHint,
          empresa_id: resolved.empresa_id,
          cliente_id: value.cliente_id ?? null,
        },
      });
      const agent = hydrateAgent(created as unknown as Record<string, unknown>);

      try {
        const dados = toPlain(agent) as Record<string, unknown>;
        const dadosAudit: Record<string, unknown> = {
          entity_id_str: agent.id,
          name: dados.name,
          description: dados.description ?? null,
          empresa_id: dados.empresa_id ?? null,
          cliente_id: dados.cliente_id ?? null,
          is_active: dados.is_active ?? true,
          created_at: dados.created_at instanceof Date ? dados.created_at.toISOString() : dados.created_at,
        };
        await registrarCriacao(req as AuthenticatedRequest, 'Agent', 0, dadosAudit, undefined, resolved.empresa_id ?? undefined);
      } catch (auditErr) {
        logger.warn('AgentController.store: falha ao registrar auditoria', { agentId: agent.id, error: auditErr });
      }

      // Retorna o token UMA VEZ — nunca mais será exibido
      sendSuccess(res, {
        ...toPlain(agent),
        token, // só na criação
        online: false,
      }, 'Agente criado. Guarde o token — ele não será exibido novamente.', 201);
    } catch (err) {
      logger.warn('AgentController.store: erro', { error: err });
      sendError(res, 'Erro ao criar agente');
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    const { error, value } = updateSchema.validate(req.body, { abortEarly: false });
    if (error) { sendValidationError(res, error.details.map((d) => d.message).join('; ')); return; }

    try {
      const agent = await loadAgentById(req.params.id);
      if (!agent) { sendNotFound(res, 'Agente não encontrado'); return; }
      const empresaId = getEmpresaIdOrNull(req);
      if (!canAccessAgent(agent, empresaId)) { sendNotFound(res, 'Agente não encontrado'); return; }
      const dadosAntes = toPlain(agent) as Record<string, unknown>;
      delete dadosAntes.token_hash;
      delete dadosAntes.mikrotik_password;
      delete dadosAntes.wg_our_private_key;
      delete dadosAntes.id;
      await agent.update(value);
      try {
        const dadosDepois = toPlain(agent) as Record<string, unknown>;
        delete dadosDepois.token_hash;
        delete dadosDepois.mikrotik_password;
        delete dadosDepois.wg_our_private_key;
        delete dadosDepois.id;
        await registrarAtualizacao(req as AuthenticatedRequest, 'Agent', 0, { ...dadosAntes, entity_id_str: agent.id }, { ...dadosDepois, entity_id_str: agent.id }, undefined, empresaId ?? undefined);
      } catch (auditErr) {
        logger.warn('AgentController.update: falha ao registrar auditoria', { agentId: agent.id, error: auditErr });
      }
      if (!agent.is_active) {
        disconnectAgentById(agent.id, { sessionEnd: 'inactive' });
      }
      const handshakes = isWireguardAgent(agent) ? await readWireguardHandshakes() : new Map<string, number>();
      sendSuccess(res, serializeAgent(agent, handshakes));
    } catch (err) {
      sendError(res, 'Erro ao atualizar agente');
    }
  }

  static async destroy(req: Request, res: Response): Promise<void> {
    try {
      const agent = await loadAgentById(req.params.id);
      if (!agent) { sendNotFound(res, 'Agente não encontrado'); return; }
      const empresaId = getEmpresaIdOrNull(req);
      if (!canAccessAgent(agent, empresaId)) { sendNotFound(res, 'Agente não encontrado'); return; }
      const deviceCount = await prisma.ssh_manager_devices.count({ where: { agent_id: agent.id } });
      if (deviceCount > 0) {
        sendValidationError(
          res,
          `Não é possível excluir o agente: existem ${deviceCount} equipamento(s) vinculado(s). Remova ou desvincule os equipamentos antes de excluir o agente.`
        );
        return;
      }
      const dadosAntes = toPlain(agent) as Record<string, unknown>;
      delete dadosAntes.token_hash;
      delete dadosAntes.mikrotik_password;
      delete dadosAntes.wg_our_private_key;
      delete dadosAntes.id;
      await teardownAgentWireguard(agent);
      await agent.destroy();
      try {
        await registrarExclusao(req as AuthenticatedRequest, 'Agent', 0, { ...dadosAntes, entity_id_str: agent.id }, undefined, empresaId ?? undefined);
      } catch (auditErr) {
        logger.warn('AgentController.destroy: falha ao registrar auditoria', { agentId: agent.id, error: auditErr });
      }
      sendSuccess(res, null, 'Agente removido');
    } catch (err) {
      sendError(res, 'Erro ao remover agente');
    }
  }

  static async testConnection(req: Request, res: Response): Promise<void> {
    try {
      const agent = await loadAgentById(req.params.id);
      if (!agent) {
        sendNotFound(res, 'Agente não encontrado');
        return;
      }
      const empresaId = getEmpresaIdOrNull(req);
      if (!canAccessAgent(agent, empresaId)) {
        sendNotFound(res, 'Agente não encontrado');
        return;
      }
      logger.info('AgentController.testConnection: início', {
        agentId: agent.id,
        name: agent.name,
        isActive: agent.is_active,
      });
      if (!agent.is_active) {
        logger.warn('AgentController.testConnection: agente inativo no cadastro', { agentId: agent.id });
        sendSuccess(res, {
          success: false,
          latency: null,
          error: 'Agente inativo no cadastro.',
        });
        return;
      }
      const result = isWireguardAgent(agent) ? await testAgentWireguard(agent) : await pingAgent(agent.id);
      logger.info('AgentController.testConnection: resultado', {
        agentId: agent.id,
        name: agent.name,
        success: result.success,
        latency: result.latency,
        error: result.error,
      });
      try {
        await registrarAtualizacao(req as AuthenticatedRequest, 'Agent', 0, { entity_id_str: agent.id, name: agent.name }, { entity_id_str: agent.id, name: agent.name }, 'Teste de conexão no agente', getEmpresaIdOrNull(req) ?? undefined);
      } catch { /* não crítico */ }
      sendSuccess(res, result);
    } catch (err) {
      logger.warn('AgentController.testConnection: erro', { error: err });
      sendError(res, 'Erro ao testar agente');
    }
  }

  /**
   * Instala o agente via SSH no servidor remoto.
   * Responde com chunked streaming de texto para exibir o log em tempo real.
   */
  static async install(req: Request, res: Response): Promise<void> {
    const { error, value } = installSchema.validate(req.body, { abortEarly: false });
    if (error) { sendValidationError(res, error.details.map((d) => d.message).join('; ')); return; }

    try {
      const agent = await loadAgentById(req.params.id);
      if (!agent) { sendNotFound(res, 'Agente não encontrado'); return; }
      const empresaId = getEmpresaIdOrNull(req);
      if (!canAccessAgent(agent, empresaId)) { sendNotFound(res, 'Agente não encontrado'); return; }

      // Gera um novo token para esse agente e usa na instalação
      const token = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const tokenHint = token.slice(0, 8) + '...';
      await agent.update({ token_hash: tokenHash, token_hint: tokenHint });

      const serverUrl = (process.env.BASE_URL || process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');

      // Streaming de texto para o frontend ler linha a linha
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('X-Accel-Buffering', 'no'); // desativa buffering do nginx
      res.flushHeaders();

      const write = (line: string) => {
        try { res.write(line + '\n'); } catch { /* ignora */ }
      };

      write(`Agente: ${agent.name}`);
      write(`Servidor: ${serverUrl}`);
      write('---');

      await installAgent({
        agentId: agent.id,
        token,
        serverUrl,
        sshConfig: {
          host: value.host,
          port: value.port,
          username: value.username,
          password: value.password || undefined,
          privateKey: value.private_key || undefined,
        },
        onLog: write,
      });

      write('---');
      write('INSTALL_SUCCESS');
      res.end();
    } catch (err) {
      const msg = formatAgentInstallSshError(err);
      logger.warn('AgentController.install: erro', { error: err instanceof Error ? err.message : String(err) });
      try {
        res.write(`❌ Erro: ${msg}\n`);
        res.write('INSTALL_ERROR\n');
        res.end();
      } catch { /* conexão já encerrada */ }
    }
  }

  /**
   * Serve arquivos do agente para instalação remota.
   * Autenticação: header X-Agent-Token (ou Bearer). Bloqueia navegação direta no browser.
   */
  static async serveFile(req: Request, res: Response): Promise<void> {
    if (rejectAgentInstallBrowserAccess(req, res)) return;

    const token = extractAgentInstallToken(req);
    if (!token) {
      res.status(401).send(`Token obrigatório no header ${AGENT_INSTALL_TOKEN_HEADER}`);
      return;
    }

    const agent = await resolveAgentByInstallToken(req.params.id, token);
    if (!agent) {
      res.status(401).send('Token inválido');
      return;
    }

    const { filename } = req.params;
    if (!ALLOWED_FILES.has(filename)) {
      res.status(404).send('Arquivo não encontrado');
      return;
    }
    const filePath = path.join(AGENT_DIR, filename);
    if (!fs.existsSync(filePath)) {
      logger.warn('AgentController.serveFile: arquivo não encontrado no disco', { filePath });
      res.status(404).send('Arquivo não encontrado');
      return;
    }
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(filePath);
  }

  /**
   * Retorna script bash de instalação para o servidor remoto.
   * Autenticação: header X-Agent-Token (ou Bearer). Bloqueia navegação direta no browser.
   */
  static async installScript(req: Request, res: Response): Promise<void> {
    if (rejectAgentInstallBrowserAccess(req, res)) return;

    const token = extractAgentInstallToken(req);
    if (!token) {
      res.status(401).send(`Token obrigatório no header ${AGENT_INSTALL_TOKEN_HEADER}`);
      return;
    }

    try {
      const agent = await resolveAgentByInstallToken(req.params.id, token);
      if (!agent) {
        res.status(401).send('Token inválido');
        return;
      }

      const serverUrl = (process.env.BASE_URL || process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');

      const script = generateInstallScript({ agentId: agent.id, token, serverUrl });

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="install-agent.sh"');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.send(script);
    } catch (err) {
      logger.warn('AgentController.installScript: erro', { error: err });
      res.status(500).send('Erro interno');
    }
  }

  /** Configura WireGuard no MikroTik do cliente (API HTTP) e sobe o peer local. */
  static async configureWireguard(req: Request, res: Response): Promise<void> {
    const { error, value } = wireguardSchema.validate(req.body, { abortEarly: false });
    if (error) { sendValidationError(res, error.details.map((d) => d.message).join('; ')); return; }

    try {
      const agent = await loadAgentById(req.params.id);
      if (!agent) { sendNotFound(res, 'Agente não encontrado'); return; }
      const empresaId = getEmpresaIdOrNull(req);
      if (!canAccessAgent(agent, empresaId)) { sendNotFound(res, 'Agente não encontrado'); return; }
      if (!agent.is_active) {
        sendValidationError(res, 'Agente inativo no cadastro.');
        return;
      }

      const provisioned = await provisionAgentWireguard(agent, {
        mikrotikHost: value.mikrotik_host,
        mikrotikApiPort: value.mikrotik_api_port,
        mikrotikApiTls: value.mikrotik_api_tls,
        mikrotikUsername: value.mikrotik_username,
        mikrotikPassword: value.mikrotik_password,
        listenPort: value.wg_listen_port,
        lanCidrs: value.wg_lan_cidrs,
      });

      await agent.reload();
      try {
        await registrarAtualizacao(
          req as AuthenticatedRequest,
          'Agent',
          0,
          { entity_id_str: agent.id, name: agent.name },
          { entity_id_str: agent.id, name: agent.name, connection_mode: 'wireguard' },
          'VPN WireGuard configurada no MikroTik',
          empresaId ?? undefined
        );
      } catch { /* não crítico */ }

      const handshakes = await readWireguardHandshakes();
      sendSuccess(res, serializeAgent(agent, handshakes), provisioned.message);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao configurar a VPN WireGuard';
      sendValidationError(res, message);
    }
  }

  /** Regenera o token de um agente (invalida o anterior). */
  static async regenerateToken(req: Request, res: Response): Promise<void> {
    try {
      const agent = await loadAgentById(req.params.id);
      if (!agent) { sendNotFound(res, 'Agente não encontrado'); return; }
      const empresaId = getEmpresaIdOrNull(req);
      if (!canAccessAgent(agent, empresaId)) { sendNotFound(res, 'Agente não encontrado'); return; }

      const token = randomBytes(32).toString('hex');
      const tokenHash = hashToken(token);
      const tokenHint = token.slice(0, 8) + '...';

      await agent.update({ token_hash: tokenHash, token_hint: tokenHint });
      disconnectAgentById(agent.id, { sessionEnd: 'token_regenerated' });

      const handshakes = isWireguardAgent(agent) ? await readWireguardHandshakes() : new Map<string, number>();
      sendSuccess(res, {
        ...serializeAgent(agent, handshakes),
        token,
      }, 'Token regenerado. Guarde o novo token — ele não será exibido novamente.');
    } catch (err) {
      sendError(res, 'Erro ao regenerar token');
    }
  }
}
