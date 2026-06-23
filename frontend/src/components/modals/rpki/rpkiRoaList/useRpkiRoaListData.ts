import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { ClienteService } from 'services/clienteService';
import type { Cliente } from 'types';
import { useRpkiCas } from 'hooks/useRpkiCas';
import { fetchAllRoasForCas } from './rpkiRoaListUtils';
import type { RpkiRoaRow } from './types';

interface UseRpkiRoaListDataParams {
  show: boolean;
  clienteIdFilter?: number;
}

export function useRpkiRoaListData({ show, clienteIdFilter }: UseRpkiRoaListDataParams) {
  const { showApiError } = useApiError();
  const [roas, setRoas] = useState<RpkiRoaRow[]>([]);
  const { cas } = useRpkiCas(clienteIdFilter);

  const { data: clientes = [] as Cliente[] } = useQuery<Cliente[]>({
    queryKey: ['clientes-rpki'],
    queryFn: async () => {
      const response = await ClienteService.list({ limit: 1000 });
      return response.data ?? [];
    },
    enabled: show && clienteIdFilter == null,
  });

  const clienteNomeById = useMemo(() => {
    const map = new Map<number, string>();
    for (const cliente of clientes as Cliente[]) {
      map.set(cliente.id, cliente.razao_social || cliente.nome_fantasia || '');
    }
    return map;
  }, [clientes]);

  const clienteNomeForCa = useCallback(
    (ca: { cliente_id: number | null }) =>
      ca.cliente_id != null ? clienteNomeById.get(ca.cliente_id) ?? '—' : '—',
    [clienteNomeById]
  );

  const caById = useMemo(() => new Map(cas.map((c) => [c.id, c])), [cas]);

  const roasForTable = useMemo(
    () =>
      roas.map((r) => {
        const ca = caById.get(Number(r.ca_id ?? 0));
        const clienteNome = ca != null ? clienteNomeForCa(ca) : '—';
        return { ...r, clienteNome };
      }),
    [roas, caById, clienteNomeForCa]
  );

  useEffect(() => {
    if (!show || cas.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchAllRoasForCas(cas);
        if (!cancelled) {
          setRoas(rows);
        }
      } catch (err) {
        if (!cancelled) {
          showApiError(err, CONTEXT_ERROR_MESSAGES.RPKI_ROA_LOAD_ERROR);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [show, cas, showApiError]);

  const reloadRoas = useCallback(async () => {
    const rows = await fetchAllRoasForCas(cas, clienteNomeForCa);
    setRoas(rows);
  }, [cas, clienteNomeForCa]);

  return {
    roas,
    setRoas,
    cas,
    roasForTable,
    clienteNomeForCa,
    reloadRoas,
  };
}
