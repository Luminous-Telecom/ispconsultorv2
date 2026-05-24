import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RpkiCa, RpkiCaService } from 'services/rpkiCaService';

export function filterRpkiCasByCliente(cas: RpkiCa[], clienteIdFilter?: number): RpkiCa[] {
  if (clienteIdFilter == null) return cas;
  return cas.filter((ca) => Number(ca.cliente_id) === clienteIdFilter);
}

export function useRpkiCas(clienteIdFilter?: number) {
  const query = useQuery({
    queryKey: ['rpki-cas'],
    queryFn: () => RpkiCaService.list(),
  });

  const cas = useMemo(
    () => filterRpkiCasByCliente(query.data ?? [], clienteIdFilter),
    [query.data, clienteIdFilter]
  );

  const caIdsKey = useMemo(() => cas.map((c) => c.id).join(','), [cas]);

  return {
    ...query,
    cas,
    allCas: query.data ?? [],
    caIdsKey,
  };
}
