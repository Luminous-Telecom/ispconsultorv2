/**
 * Registro de auditoria no MySQL (sistema_logs_operacionais).
 */
import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import { AuthenticatedRequest } from '../../../types/auth';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';
import { getClientIp } from '../../../utils/requestUtils';
import { normalizarSnapshotAuditoria } from '../../auditoria/normalizarSnapshotAuditoria';
import { SistemaLogOperacionalService, houveAlteracaoEfetivaEmUpdate } from '../SistemaLogOperacionalService';

export type AcaoAuditoria = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'import' | 'executar';
export type OrigemAuditoria = 'usuario' | 'agendador' | 'webhook' | 'sistema';

interface DadosAuditoria {
  acao: AcaoAuditoria;
  entidade: string;
  entidade_id?: number | null;
  dados_anteriores?: Record<string, unknown> | null;
  dados_novos?: Record<string, unknown> | null;
  rota?: string;
  metodo_http?: string;
  observacoes?: string | null;
  empresa_id?: number | null;
  origem_auditoria?: OrigemAuditoria;
  ip_address?: string | null;
}

function getEmpresaIdForAudit(req: Request | AuthenticatedRequest): number | null {
  const reqAny = req as AuthenticatedRequest & { saasUser?: unknown };
  if (reqAny.saasUser) return null;
  return getEmpresaIdOrNull(req);
}

function getUserAgent(req: Request): string | null {
  return req.headers['user-agent'] || null;
}

function getUserData(req: Request | AuthenticatedRequest): {
  id: number | null;
  nome: string | null;
  email: string | null;
} {
  const reqAny = req as AuthenticatedRequest & { saasUser?: JwtPayload };
  const userPayload = reqAny.saasUser ?? (reqAny.user as JwtPayload | undefined);

  if (!userPayload) {
    return { id: null, nome: null, email: null };
  }

  const userId = userPayload.sub ? parseInt(String(userPayload.sub), 10) : null;
  const email = typeof userPayload.email === 'string' ? userPayload.email : null;
  const nome = typeof userPayload.nome === 'string' ? userPayload.nome : null;

  return { id: userId, nome: nome ?? null, email };
}

function persistSnapshot(
  req: Request | AuthenticatedRequest,
  dados: DadosAuditoria,
  overrides?: {
    usuarioId?: number | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    rota?: string | null;
    metodoHttp?: string | null;
    origemAuditoria?: OrigemAuditoria;
  }
): void {
  const userData = getUserData(req);
  const dadosAnterioresNorm = normalizarSnapshotAuditoria(dados.dados_anteriores ?? null);
  const dadosNovosNorm = normalizarSnapshotAuditoria(dados.dados_novos ?? null);

  if (dados.acao === 'update' && !houveAlteracaoEfetivaEmUpdate(dadosAnterioresNorm, dadosNovosNorm)) {
    return;
  }

  SistemaLogOperacionalService.registrarFromAuditoriaSnapshot({
    acao: dados.acao,
    entidade: dados.entidade,
    entidadeId: dados.entidade_id ?? null,
    observacoes: dados.observacoes ?? null,
    empresaId: dados.empresa_id ?? getEmpresaIdForAudit(req),
    usuarioId: overrides?.usuarioId !== undefined ? overrides.usuarioId : userData.id,
    ipAddress: overrides?.ipAddress !== undefined ? overrides.ipAddress : dados.ip_address ?? getClientIp(req),
    userAgent: overrides?.userAgent !== undefined ? overrides.userAgent : getUserAgent(req),
    rota: overrides?.rota !== undefined ? overrides.rota : dados.rota ?? req.originalUrl ?? null,
    metodoHttp: overrides?.metodoHttp !== undefined ? overrides.metodoHttp : dados.metodo_http ?? req.method ?? null,
    origemAuditoria: overrides?.origemAuditoria ?? dados.origem_auditoria ?? 'usuario',
    dadosNovos: dadosNovosNorm,
    dadosAnteriores: dadosAnterioresNorm,
  });
}

export async function registrarAuditoria(
  req: Request | AuthenticatedRequest,
  dados: DadosAuditoria
): Promise<void> {
  setImmediate(() => {
    persistSnapshot(req, dados);
  });
}

export async function registrarCriacao(
  req: Request | AuthenticatedRequest,
  entidade: string,
  entidadeId: number,
  dadosNovos: Record<string, unknown>,
  observacoes?: string,
  empresa_id?: number | null,
  origem_auditoria?: OrigemAuditoria
): Promise<void> {
  await registrarAuditoria(req, {
    acao: 'create',
    entidade,
    entidade_id: entidadeId,
    dados_novos: dadosNovos,
    observacoes,
    empresa_id,
    origem_auditoria,
  });
}

export async function registrarAtualizacao(
  req: Request | AuthenticatedRequest,
  entidade: string,
  entidadeId: number,
  dadosAnteriores: Record<string, unknown>,
  dadosNovos: Record<string, unknown>,
  observacoes?: string,
  empresa_id?: number | null,
  origem_auditoria?: OrigemAuditoria
): Promise<void> {
  await registrarAuditoria(req, {
    acao: 'update',
    entidade,
    entidade_id: entidadeId,
    dados_anteriores: dadosAnteriores,
    dados_novos: dadosNovos,
    observacoes,
    empresa_id,
    origem_auditoria,
  });
}

export async function registrarAtualizacaoSistema(
  entidade: string,
  entidadeId: number,
  dadosAnteriores: Record<string, unknown>,
  dadosNovos: Record<string, unknown>,
  observacoes?: string,
  empresa_id?: number | null
): Promise<void> {
  const da = normalizarSnapshotAuditoria(dadosAnteriores);
  const dn = normalizarSnapshotAuditoria(dadosNovos);

  if (!houveAlteracaoEfetivaEmUpdate(da, dn)) {
    return;
  }

  SistemaLogOperacionalService.registrarFromAuditoriaSnapshot({
    acao: 'update',
    entidade,
    entidadeId,
    observacoes: observacoes ?? null,
    empresaId: empresa_id ?? null,
    usuarioId: null,
    ipAddress: null,
    userAgent: 'Rotina agendada',
    rota: null,
    metodoHttp: null,
    origemAuditoria: 'agendador',
    dadosNovos: dn,
    dadosAnteriores: da,
  });
}

export async function registrarExclusao(
  req: Request | AuthenticatedRequest,
  entidade: string,
  entidadeId: number,
  dadosAnteriores: Record<string, unknown>,
  observacoes?: string,
  empresa_id?: number | null
): Promise<void> {
  await registrarAuditoria(req, {
    acao: 'delete',
    entidade,
    entidade_id: entidadeId,
    dados_anteriores: dadosAnteriores,
    observacoes,
    empresa_id,
  });
}

export async function registrarLogin(
  req: Request | AuthenticatedRequest,
  usuarioId: number,
  observacoes?: string
): Promise<void> {
  await registrarAuditoria(req, {
    acao: 'login',
    entidade: 'Usuario',
    entidade_id: usuarioId,
    observacoes,
  });
}

export async function registrarLogout(
  req: Request | AuthenticatedRequest,
  usuarioId: number,
  observacoes?: string
): Promise<void> {
  await registrarAuditoria(req, {
    acao: 'logout',
    entidade: 'Usuario',
    entidade_id: usuarioId,
    observacoes,
  });
}

export interface UsuarioAuditoria {
  id: number;
  nome: string | null;
  email: string | null;
}

export async function registrarExecucaoRotinaAuditoria(_params: {
  routineId: number;
  routineNome: string;
  routineTipo: string;
  status: 'sucesso' | 'erro';
  duracaoMs: number;
  empresaId?: number | null;
  saas?: boolean;
  erro?: string;
  resultado?: Record<string, unknown>;
  usuario?: UsuarioAuditoria | null;
  ipAddress?: string | null;
}): Promise<void> {
  /* Log unificado em sistema_logs_operacionais via RotinaExecucaoLogService */
}
