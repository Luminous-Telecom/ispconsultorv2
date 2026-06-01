import { ParsedQs } from 'qs';
import {
  isQueryFlagTrue,
  parseOptionalQueryInt,
  queryString,
} from './listQuery';

type QueryRecord = Record<string, string | ParsedQs | (string | ParsedQs)[] | undefined>;

export interface AuditoriaListFilters {
  acao?: string;
  entidade?: string;
  usuario_id?: number;
  dataInicio?: string;
  dataFim?: string;
  comUsuarioObrigatorio: boolean;
  semUsuarioObrigatorio: boolean;
  origemAuditoria?: string;
  moduloBlockdomi: boolean;
  painelSaasLogs?: boolean;
  acessoPainelSaas?: boolean;
}

/** Filtros comuns de listagem de auditoria (ERP e SaaS). */
export function parseAuditoriaListFilters(
  query: QueryRecord,
  includeSaasFlags = false
): AuditoriaListFilters {
  return {
    acao: queryString(query.acao),
    entidade: queryString(query.entidade),
    usuario_id: parseOptionalQueryInt(query.usuario_id),
    dataInicio: queryString(query.data_inicio),
    dataFim: queryString(query.data_fim),
    comUsuarioObrigatorio: isQueryFlagTrue(query, 'com_usuario_obrigatorio', 'comUsuarioObrigatorio'),
    semUsuarioObrigatorio: isQueryFlagTrue(query, 'sem_usuario_obrigatorio', 'semUsuarioObrigatorio'),
    origemAuditoria: queryString(query.origem_auditoria),
    moduloBlockdomi: isQueryFlagTrue(query, 'modulo_blockdomi', 'moduloBlockdomi'),
    ...(includeSaasFlags
      ? {
          painelSaasLogs: isQueryFlagTrue(query, 'painel_saas', 'painelSaas'),
          acessoPainelSaas: isQueryFlagTrue(query, 'acesso_painel_saas', 'acessoPainelSaas'),
        }
      : {}),
  };
}
