import { Request } from 'express';
import { AuthenticatedRequest } from '../../../types/auth';
import type { OrigemAuditoria } from '../../elasticsearch/ElasticsearchAuditService';
import {
  registrarCriacaoElasticsearch,
  registrarAtualizacaoElasticsearch,
  registrarAtualizacaoElasticsearchSistema,
  registrarExclusaoElasticsearch,
  registrarLoginElasticsearch,
  registrarLogoutElasticsearch
} from '../../elasticsearch/ElasticsearchAuditService';

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
 * Obter dados do usuário autenticado
 */
function getUserData(req: Request | AuthenticatedRequest): {
  id: number | null;
  nome: string | null;
  email: string | null;
} {
  const authenticatedReq = req as AuthenticatedRequest;
  const userPayload = authenticatedReq.user as { sub?: string; email?: string; nome?: string } | undefined;

  if (!userPayload) {
    return { id: null, nome: null, email: null };
  }

  const userId = userPayload.sub ? parseInt(userPayload.sub, 10) : null;
  const email = typeof userPayload.email === 'string' ? userPayload.email : null;
  const nome = typeof userPayload.nome === 'string' ? userPayload.nome : null;

  return {
    id: userId,
    nome,
    email
  };
}

/**
 * Registrar criação de entidade (Elasticsearch)
 */
export async function registrarCriacao(
  req: Request | AuthenticatedRequest,
  entidade: string,
  entidadeId: number,
  dadosNovos: Record<string, unknown>,
  observacoes?: string,
  empresa_id?: number | null,
  origem_auditoria?: OrigemAuditoria
): Promise<void> {
  await registrarCriacaoElasticsearch(req, entidade, entidadeId, dadosNovos, observacoes, empresa_id, origem_auditoria);
}

/**
 * Registrar atualização de entidade (Elasticsearch)
 */
export async function registrarAtualizacao(
  req: Request | AuthenticatedRequest,
  entidade: string,
  entidadeId: number,
  dadosAnteriores: Record<string, unknown>,
  dadosNovos: Record<string, unknown>,
  observacoes?: string,
  empresa_id?: number | null
): Promise<void> {
  await registrarAtualizacaoElasticsearch(req, entidade, entidadeId, dadosAnteriores, dadosNovos, observacoes, empresa_id);
}

/**
 * Registrar atualização de entidade sem requisição HTTP (ex.: rotina agendada).
 */
export async function registrarAtualizacaoSistema(
  entidade: string,
  entidadeId: number,
  dadosAnteriores: Record<string, unknown>,
  dadosNovos: Record<string, unknown>,
  observacoes?: string
): Promise<void> {
  await registrarAtualizacaoElasticsearchSistema(entidade, entidadeId, dadosAnteriores, dadosNovos, observacoes);
}

/**
 * Registrar exclusão de entidade (Elasticsearch)
 */
export async function registrarExclusao(
  req: Request | AuthenticatedRequest,
  entidade: string,
  entidadeId: number,
  dadosAnteriores: Record<string, unknown>,
  observacoes?: string,
  empresa_id?: number | null
): Promise<void> {
  await registrarExclusaoElasticsearch(req, entidade, entidadeId, dadosAnteriores, observacoes, empresa_id);
}

/**
 * Registrar login (Elasticsearch)
 */
export async function registrarLogin(
  req: Request | AuthenticatedRequest,
  usuarioId: number,
  observacoes?: string
): Promise<void> {
  await registrarLoginElasticsearch(req, usuarioId, observacoes);
}

/**
 * Registrar logout (Elasticsearch)
 */
export async function registrarLogout(
  req: Request | AuthenticatedRequest,
  usuarioId: number,
  observacoes?: string
): Promise<void> {
  await registrarLogoutElasticsearch(req, usuarioId, observacoes);
}
