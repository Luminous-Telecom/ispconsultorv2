import { Request, Response } from 'express';
import { createHash, randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import Joi from 'joi';
import { Op, WhereOptions } from 'sequelize';
import { Agent } from '../../../models/agent/Agent';
import { Cliente } from '../../../models/clientes/Cliente';
import {
  disconnectAgentById,
  isAgentEffectivelyOnline,
  pingAgent,
} from '../../../services/agent/AgentService';

function parseClienteIdQuery(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === '') return null;
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}
import { installAgent } from '../../../services/agent/AgentInstallService';
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

const AGENT_DIR = path.resolve(__dirname, '../../../../..', 'agent');
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

export class AgentController {
  static async index(req: Request, res: Response): Promise<void> {
    try {
      const scopeEmpresaId = resolveEmpresaScopeForList(req, parseEmpresaIdQuery(req.query.empresa_id));
      const clienteId = parseClienteIdQuery(req.query.cliente_id);
      const parts: WhereOptions<Agent>[] = [];
      if (scopeEmpresaId != null) {
        parts.push({ [Op.or]: [{ empresa_id: scopeEmpresaId }, { empresa_id: null }] });
      }
      if (clienteId != null) {
        parts.push({ cliente_id: clienteId });
      }
      const where: WhereOptions<Agent> =
        parts.length === 0 ? {} : parts.length === 1 ? parts[0]! : { [Op.and]: parts };
      const agents = await Agent.findAll({
        where,
        order: [['created_at', 'DESC']],
        include: [
          {
            model: Cliente,
            as: 'cliente',
            attributes: ['id', 'razao_social', 'nome_fantasia'],
            required: false,
          },
        ],
      });
      const data = agents.map((a) => ({
        ...a.toJSON(),
        online: isAgentEffectivelyOnline(a.id, a.is_active),
      }));
      sendSuccess(res, data);
    } catch (err) {
      logger.warn('AgentController.index: erro', { error: err });
      sendError(res, 'Erro ao listar agentes');
    }
  }

  static async show(req: Request, res: Response): Promise<void> {
    try {
      const agent = await Agent.findByPk(req.params.id, {
        include: [
          {
            model: Cliente,
            as: 'cliente',
            attributes: ['id', 'razao_social', 'nome_fantasia'],
            required: false,
          },
        ],
      });
      if (!agent) { sendNotFound(res, 'Agente não encontrado'); return; }
      const empresaId = getEmpresaIdOrNull(req);
      if (!canAccessAgent(agent, empresaId)) { sendNotFound(res, 'Agente não encontrado'); return; }
      sendSuccess(res, {
        ...agent.toJSON(),
        online: isAgentEffectivelyOnline(agent.id, agent.is_active),
      });
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
      const token = randomBytes(32).toString('hex');
      const tokenHash = hashToken(token);
      const tokenHint = token.slice(0, 8) + '...';

      const agent = await Agent.create({
        name: value.name,
        description: value.description ?? null,
        token_hash: tokenHash,
        token_hint: tokenHint,
        empresa_id: resolved.empresa_id,
        cliente_id: value.cliente_id ?? null,
      });

      try {
        const dados = agent.toJSON() as Record<string, unknown>;
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
        ...agent.toJSON(),
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
      const agent = await Agent.findByPk(req.params.id);
      if (!agent) { sendNotFound(res, 'Agente não encontrado'); return; }
      const empresaId = getEmpresaIdOrNull(req);
      if (!canAccessAgent(agent, empresaId)) { sendNotFound(res, 'Agente não encontrado'); return; }
      const dadosAntes = agent.toJSON() as Record<string, unknown>;
      delete dadosAntes.token_hash;
      delete dadosAntes.id;
      await agent.update(value);
      try {
        const dadosDepois = agent.toJSON() as Record<string, unknown>;
        delete dadosDepois.token_hash;
        delete dadosDepois.id;
        await registrarAtualizacao(req as AuthenticatedRequest, 'Agent', 0, { ...dadosAntes, entity_id_str: agent.id }, { ...dadosDepois, entity_id_str: agent.id }, undefined, empresaId ?? undefined);
      } catch (auditErr) {
        logger.warn('AgentController.update: falha ao registrar auditoria', { agentId: agent.id, error: auditErr });
      }
      if (!agent.is_active) {
        disconnectAgentById(agent.id, { sessionEnd: 'inactive' });
      }
      sendSuccess(res, {
        ...agent.toJSON(),
        online: isAgentEffectivelyOnline(agent.id, agent.is_active),
      });
    } catch (err) {
      sendError(res, 'Erro ao atualizar agente');
    }
  }

  static async destroy(req: Request, res: Response): Promise<void> {
    try {
      const agent = await Agent.findByPk(req.params.id);
      if (!agent) { sendNotFound(res, 'Agente não encontrado'); return; }
      const empresaId = getEmpresaIdOrNull(req);
      if (!canAccessAgent(agent, empresaId)) { sendNotFound(res, 'Agente não encontrado'); return; }
      const dadosAntes = agent.toJSON() as Record<string, unknown>;
      delete dadosAntes.token_hash;
      delete dadosAntes.id;
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
      const agent = await Agent.findByPk(req.params.id);
      if (!agent) {
        sendNotFound(res, 'Agente não encontrado');
        return;
      }
      const empresaId = getEmpresaIdOrNull(req);
      if (!canAccessAgent(agent, empresaId)) {
        sendNotFound(res, 'Agente não encontrado');
        return;
      }
      if (!agent.is_active) {
        sendSuccess(res, {
          success: false,
          latency: null,
          error: 'Agente inativo no cadastro.',
        });
        return;
      }
      const result = await pingAgent(agent.id);
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
      const agent = await Agent.findByPk(req.params.id);
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
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      logger.warn('AgentController.install: erro', { error: msg });
      try {
        res.write(`❌ Erro: ${msg}\n`);
        res.write('INSTALL_ERROR\n');
        res.end();
      } catch { /* conexão já encerrada */ }
    }
  }

  /**
   * Serve os arquivos estáticos do agente (index.js, package.json, Dockerfile).
   * Rota pública — usada pelo install-script no servidor remoto.
   */
  static async serveFile(req: Request, res: Response): Promise<void> {
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
    res.sendFile(filePath);
  }

  /**
   * Retorna um script bash de instalação para o servidor remoto.
   * Rota pública — autenticada pelo token do agente na query string (?token=...).
   */
  static async installScript(req: Request, res: Response): Promise<void> {
    const { token } = req.query as { token?: string };
    if (!token) {
      res.status(401).send('Token obrigatório');
      return;
    }

    try {
      const agent = await Agent.findByPk(req.params.id);
      if (!agent) {
        res.status(404).send('Agente não encontrado');
        return;
      }

      const tokenHash = createHash('sha256').update(token).digest('hex');
      if (tokenHash !== agent.token_hash) {
        res.status(401).send('Token inválido');
        return;
      }

      const serverUrl = (process.env.BASE_URL || process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
      const containerName = 'backnet-agent';
      const isDev = serverUrl.includes('dev.luminoustelecom.com.br') || serverUrl.includes('localhost') || serverUrl.includes('127.0.0.1');
      const imageTag = isDev ? 'dev' : 'prod';
      const imageName = process.env.BACKNET_AGENT_IMAGE || `midia181/backnet-tunnel:${imageTag}`;

      const script = `#!/bin/bash
set -e

TOKEN="${token}"
IMAGE_NAME="${imageName}"
CONTAINER_NAME="${containerName}"

RED='\\033[0;31m'; GREEN='\\033[0;32m'; YELLOW='\\033[1;33m'; NC='\\033[0m'
log()   { echo -e "\${GREEN}[BackNet]\${NC} \$1"; }
warn()  { echo -e "\${YELLOW}[BackNet]\${NC} \$1"; }
error() { echo -e "\${RED}[BackNet]\${NC} \$1"; exit 1; }

log "Iniciando instalação do agente BackNet..."
echo ""

# ── Docker ────────────────────────────────────────────────────────────────────
if command -v docker &> /dev/null; then
  log "Docker já instalado: \$(docker --version)"
else
  warn "Docker não encontrado. Instalando..."
  if grep -qiE 'debian|ubuntu' /etc/os-release 2>/dev/null; then
    apt-get update -qq
    apt-get install -y -qq ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL "https://download.docker.com/linux/\$(. /etc/os-release && echo "\$ID")/gpg" | gpg --dearmor -o /etc/apt/keyrings/docker.gpg 2>/dev/null
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=\$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/\$(. /etc/os-release && echo "\$ID") \$(. /etc/os-release && echo "\$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io
    systemctl enable docker && systemctl start docker
  elif grep -qiE 'centos|rhel|almalinux|rocky|fedora' /etc/os-release 2>/dev/null || [ -f /etc/redhat-release ]; then
    yum install -y -q yum-utils
    yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
    yum install -y -q docker-ce docker-ce-cli containerd.io
    systemctl enable docker && systemctl start docker
  else
    error "Sistema operacional não suportado. Instale o Docker manualmente e execute o script novamente."
  fi
  log "Docker instalado com sucesso!"
fi

# ── Baixar imagem do Docker Hub ────────────────────────────────────────────────
log "Baixando imagem do agente (\$IMAGE_NAME)..."
docker pull "\$IMAGE_NAME"
log "Imagem baixada com sucesso!"

# ── Substituir instalação anterior (igual Cloudflare) ─────────────────────────
log "Substituindo instalação anterior (se existir)..."
docker rm -f "\$CONTAINER_NAME" 2>/dev/null || true

# ── Iniciar container ─────────────────────────────────────────────────────────
log "Iniciando container \$CONTAINER_NAME..."
docker run -d \\
  --name "\$CONTAINER_NAME" \\
  --restart unless-stopped \\
  "\$IMAGE_NAME" \\
  --token "\$TOKEN"

log "Aguardando inicialização do agente (5s)..."
sleep 5

STATUS=\$(docker inspect --format='{{.State.Status}}' "\$CONTAINER_NAME" 2>/dev/null || echo "not_found")
if [ "\$STATUS" = "running" ]; then
  echo ""
  log "✅ Instalação concluída! O agente deve aparecer online em instantes."
else
  LOGS=\$(docker logs --tail 20 "\$CONTAINER_NAME" 2>&1 || echo "")
  error "Container não está rodando (status: \$STATUS).\\nLogs:\\n\$LOGS"
fi
`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.send(script);
    } catch (err) {
      logger.warn('AgentController.installScript: erro', { error: err });
      res.status(500).send('Erro interno');
    }
  }

  /** Regenera o token de um agente (invalida o anterior). */
  static async regenerateToken(req: Request, res: Response): Promise<void> {
    try {
      const agent = await Agent.findByPk(req.params.id);
      if (!agent) { sendNotFound(res, 'Agente não encontrado'); return; }
      const empresaId = getEmpresaIdOrNull(req);
      if (!canAccessAgent(agent, empresaId)) { sendNotFound(res, 'Agente não encontrado'); return; }

      const token = randomBytes(32).toString('hex');
      const tokenHash = hashToken(token);
      const tokenHint = token.slice(0, 8) + '...';

      await agent.update({ token_hash: tokenHash, token_hint: tokenHint });
      disconnectAgentById(agent.id, { sessionEnd: 'token_regenerated' });

      sendSuccess(res, {
        ...agent.toJSON(),
        token,
        online: isAgentEffectivelyOnline(agent.id, agent.is_active),
      }, 'Token regenerado. Guarde o novo token — ele não será exibido novamente.');
    } catch (err) {
      sendError(res, 'Erro ao regenerar token');
    }
  }
}
