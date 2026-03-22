import { Request } from 'express';
import { AuthTokenPayload, AuthenticatedRequest } from '../types/auth';
import { DadosEmpresa } from '../models/sistema/DadosEmpresa';
import { Cliente } from '../models/clientes/Cliente';

/**
 * Extrai o empresa_id do JWT token na requisição.
 * Lança erro se não encontrado (requisição não autenticada ou sem empresa_id).
 */
export const getEmpresaId = (req: Request): number => {
  const authReq = req as AuthenticatedRequest;
  const user = authReq.user as AuthTokenPayload;

  if (!user?.empresa_id) {
    throw new Error('empresa_id não encontrado no token de autenticação');
  }

  return Number(user.empresa_id);
};

/**
 * Extrai o empresa_id de forma segura — retorna null se não houver.
 */
export const getEmpresaIdOrNull = (req: Request): number | null => {
  try {
    return getEmpresaId(req);
  } catch {
    return null;
  }
};

export function parseEmpresaIdQuery(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === '') return null;
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function isAdminRequest(req: Request): boolean {
  const user = (req as AuthenticatedRequest).user;
  if (!user || typeof user === 'string') return false;
  const role = (user as AuthTokenPayload).role;
  return String(role) === 'admin';
}

/**
 * Listagens: admin pode filtrar por ?empresa_id=; demais usuários usam só o tenant do JWT.
 */
export function resolveEmpresaScopeForList(req: Request, queryEmpresaId: number | null): number | null {
  const jwtEmpresaId = getEmpresaIdOrNull(req);
  if (isAdminRequest(req) && queryEmpresaId != null) return queryEmpresaId;
  return jwtEmpresaId;
}

/**
 * Criação: admin pode enviar empresa_id no body; demais usam empresa do JWT.
 */
export async function resolveEmpresaIdOnCreate(
  req: Request,
  bodyEmpresaId: number | undefined | null
): Promise<{ ok: true; empresa_id: number | null } | { ok: false; message: string }> {
  const jwtEmpresaId = getEmpresaIdOrNull(req);
  if (isAdminRequest(req) && bodyEmpresaId != null && bodyEmpresaId !== undefined) {
    const em = await DadosEmpresa.findByPk(bodyEmpresaId);
    if (!em) {
      return { ok: false, message: 'Empresa inválida ou não encontrada' };
    }
    return { ok: true, empresa_id: bodyEmpresaId };
  }
  return { ok: true, empresa_id: jwtEmpresaId };
}

/**
 * Criação com escopo de tenant: admin informa cliente_id e a empresa vem do cadastro do cliente;
 * demais perfis continuam com empresa do JWT (empresa_id do body ignorado para admin neste fluxo).
 */
export async function resolveEmpresaIdForScopedCreate(
  req: Request,
  params: { cliente_id?: number | null; empresa_id?: number | null }
): Promise<{ ok: true; empresa_id: number | null } | { ok: false; message: string }> {
  if (!isAdminRequest(req)) {
    return resolveEmpresaIdOnCreate(req, params.empresa_id ?? null);
  }
  const cid = params.cliente_id;
  if (cid == null || cid === undefined || !Number.isFinite(Number(cid)) || Number(cid) <= 0) {
    return { ok: false, message: 'Selecione o cliente' };
  }
  const cliente = await Cliente.findByPk(cid);
  if (!cliente) {
    return { ok: false, message: 'Cliente não encontrado' };
  }
  if (cliente.empresa_id == null) {
    return { ok: false, message: 'Cliente sem empresa vinculada' };
  }
  return { ok: true, empresa_id: cliente.empresa_id };
}
