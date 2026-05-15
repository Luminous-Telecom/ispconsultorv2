import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditoriaService, type AuditoriaLog } from 'services/auditoriaService';
import { enrichAuditoriaLogFromOperacionalPayload } from 'utils/auditoriaOperacionalDetalhe';

type UseAuditoriaDetalheEsOptions = {
  selected: AuditoriaLog | null;
  showDetails: boolean;
  saas?: boolean;
  queryKeyPrefix: string;
};

export function useAuditoriaDetalheEs({
  selected,
  showDetails,
  saas = false,
  queryKeyPrefix,
}: UseAuditoriaDetalheEsOptions) {
  const esAuditDetailId =
    showDetails && selected?.elasticsearch_audit_id ? selected.elasticsearch_audit_id : null;

  const esQuery = useQuery({
    queryKey: [queryKeyPrefix, saas ? 'saas' : 'erp', esAuditDetailId],
    queryFn: async () => {
      const r = await auditoriaService.getById(esAuditDetailId!, { saas });
      if (!r.success) {
        throw new Error(r.message || 'Erro ao carregar detalhe no Elasticsearch');
      }
      const raw = r.data as unknown;
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        throw new Error('Resposta inválida ao carregar detalhe da auditoria');
      }
      return raw as AuditoriaLog;
    },
    enabled: !!esAuditDetailId,
    retry: false,
    refetchOnMount: false,
    staleTime: 60_000,
  });

  const exibirDetalhe = useMemo((): AuditoriaLog | null => {
    if (!selected) return null;
    let base = enrichAuditoriaLogFromOperacionalPayload(selected);
    if (esQuery.data) {
      base = { ...base, ...esQuery.data };
    }
    return base;
  }, [selected, esQuery.data]);

  const showEsLoading = !!esAuditDetailId && esQuery.isLoading && !esQuery.data;
  const esIndisponivel = !!esAuditDetailId && esQuery.isError;

  return {
    exibirDetalhe,
    showEsLoading,
    esIndisponivel,
    esErrorMessage: esQuery.error instanceof Error ? esQuery.error.message : null,
    temVinculoEs: !!selected?.elasticsearch_audit_id,
  };
}
