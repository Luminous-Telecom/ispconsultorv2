/**
 * Serviço de Auditoria
 * Registra ações críticas do sistema
 * 
 * @module services/AuditoriaService
 */
import { Request } from 'express';
import { Auditoria, AcaoAuditoria } from '../../../models/sistema/Auditoria';
import { logger } from '../../../utils/logger';

// Interface para Request com usuário autenticado
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    nome?: string;
    email?: string;
  };
}

interface DadosAuditoria {
  acao: AcaoAuditoria;
  entidade: string;
  entidade_id?: number | null;
  dados_anteriores?: Record<string, unknown> | null;
  dados_novos?: Record<string, unknown> | null;
  observacoes?: string | null;
}

/**
 * Obter IP do cliente da requisição
 */
function getClientIp(req: Request): string | null {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    null
  );
}

/**
 * Obter User Agent da requisição
 */
function getUserAgent(req: Request): string | null {
  return req.headers['user-agent'] || null;
}

/**
 * Registrar ação na auditoria
 * Não lança erro se falhar para não interromper o fluxo principal
 */
export async function registrarAuditoria(
  req: Request | AuthenticatedRequest,
  dados: DadosAuditoria
): Promise<void> {
  try {
    const usuarioId = 'user' in req && req.user ? req.user.id : null;
    const ipAddress = getClientIp(req);
    const userAgent = getUserAgent(req);

    await Auditoria.create({
      usuario_id: usuarioId,
      acao: dados.acao,
      entidade: dados.entidade,
      entidade_id: dados.entidade_id || null,
      dados_anteriores: dados.dados_anteriores || null,
      dados_novos: dados.dados_novos || null,
      ip_address: ipAddress,
      user_agent: userAgent,
      observacoes: dados.observacoes || null
    });

    logger.debug('Ação registrada na auditoria', {
      context: 'AuditoriaService',
      acao: dados.acao,
      entidade: dados.entidade,
      entidade_id: dados.entidade_id,
      usuario_id: usuarioId
    });
  } catch (error) {
    // Não lançar erro para não interromper o fluxo principal
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorName = error instanceof Error ? error.name : undefined;
    
    logger.error('Erro ao registrar auditoria', {
      context: 'AuditoriaService',
      action: 'registrarAuditoria',
      error: errorMessage,
      errorName,
      stack: errorStack,
      entidade: dados.entidade,
      acao: dados.acao,
      entidade_id: dados.entidade_id,
      has_dados_anteriores: !!dados.dados_anteriores,
      has_dados_novos: !!dados.dados_novos,
      dados_keys: {
        anteriores: dados.dados_anteriores ? Object.keys(dados.dados_anteriores).slice(0, 10) : [],
        novos: dados.dados_novos ? Object.keys(dados.dados_novos).slice(0, 10) : []
      }
    });
  }
}

/**
 * Registrar criação de entidade
 */
export async function registrarCriacao(
  req: Request | AuthenticatedRequest,
  entidade: string,
  entidadeId: number,
  dadosNovos: Record<string, unknown>,
  observacoes?: string
): Promise<void> {
  await registrarAuditoria(req, {
    acao: 'create',
    entidade,
    entidade_id: entidadeId,
    dados_novos: dadosNovos,
    observacoes
  });
}

/**
 * Registrar atualização de entidade
 */
export async function registrarAtualizacao(
  req: Request | AuthenticatedRequest,
  entidade: string,
  entidadeId: number,
  dadosAnteriores: Record<string, unknown>,
  dadosNovos: Record<string, unknown>,
  observacoes?: string
): Promise<void> {
  await registrarAuditoria(req, {
    acao: 'update',
    entidade,
    entidade_id: entidadeId,
    dados_anteriores: dadosAnteriores,
    dados_novos: dadosNovos,
    observacoes
  });
}

/**
 * Registrar exclusão de entidade
 */
export async function registrarExclusao(
  req: Request | AuthenticatedRequest,
  entidade: string,
  entidadeId: number,
  dadosAnteriores: Record<string, unknown>,
  observacoes?: string
): Promise<void> {
  await registrarAuditoria(req, {
    acao: 'delete',
    entidade,
    entidade_id: entidadeId,
    dados_anteriores: dadosAnteriores,
    observacoes
  });
}

/**
 * Registrar login
 */
export async function registrarLogin(
  req: Request | AuthenticatedRequest,
  usuarioId: number,
  observacoes?: string
): Promise<void> {
  await registrarAuditoria(req, {
    acao: 'login',
    entidade: 'Usuario',
    entidade_id: usuarioId,
    observacoes
  });
}

/**
 * Registrar logout
 */
export async function registrarLogout(
  req: Request | AuthenticatedRequest,
  usuarioId: number,
  observacoes?: string
): Promise<void> {
  await registrarAuditoria(req, {
    acao: 'logout',
    entidade: 'Usuario',
    entidade_id: usuarioId,
    observacoes
  });
}

