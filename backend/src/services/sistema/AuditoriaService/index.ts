import { Request } from 'express';
import { AuthenticatedRequest } from '../../../types/auth';
import {
  registrarAuditoria,
  registrarCriacao,
  registrarAtualizacao,
  registrarAtualizacaoSistema,
  registrarExclusao,
  registrarLogin,
  registrarLogout,
} from '../AuditoriaRegistroService';

export type { OrigemAuditoria, AcaoAuditoria, UsuarioAuditoria } from '../AuditoriaRegistroService';
export {
  registrarCriacao,
  registrarAtualizacao,
  registrarAtualizacaoSistema,
  registrarExclusao,
  registrarLogin,
  registrarLogout,
};
export { registrarExecucaoRotinaAuditoria } from '../AuditoriaRegistroService';

/** Req mínimo para auditoria em contexto socket (sem HTTP) */
function createSocketAuditReq(userId: string, ip: string): AuthenticatedRequest {
  return {
    user: { sub: userId },
    headers: {},
    socket: { remoteAddress: ip } as any,
    originalUrl: '/socket',
    method: 'SOCKET',
  } as unknown as AuthenticatedRequest;
}

/**
 * Registrar execução de ação para auditoria em contexto socket (ex.: acesso ao terminal).
 */
export async function registrarExecucaoParaSocket(
  userId: string,
  ip: string,
  entidade: string,
  observacoes: string,
  dadosNovos?: Record<string, unknown>,
  empresa_id?: number | null
): Promise<void> {
  const req = createSocketAuditReq(userId, ip);
  await registrarAuditoria(req, {
    acao: 'executar',
    entidade,
    entidade_id: 0,
    dados_novos: dadosNovos ?? null,
    observacoes,
    ip_address: ip,
    empresa_id: empresa_id ?? null,
  });
}
