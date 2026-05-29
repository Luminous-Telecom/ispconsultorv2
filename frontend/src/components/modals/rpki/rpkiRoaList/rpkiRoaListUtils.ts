import { RpkiCaService } from 'services/rpkiCaService';
import type { RpkiRoaRow } from './types';

interface RpkiCaRef {
  id: number;
  nome: string;
  cliente_id: number | null;
}

export async function fetchAllRoasForCas(
  cas: RpkiCaRef[],
  clienteNomeForCa?: (ca: RpkiCaRef) => string
): Promise<RpkiRoaRow[]> {
  const all = await Promise.all(
    cas.map(async (ca) => {
      const rows = await RpkiCaService.listRoas(ca.id);
      return rows.map((row) => ({
        id: row.id,
        ca_id: row.ca_id,
        ca_nome: ca.nome,
        ...(clienteNomeForCa ? { clienteNome: clienteNomeForCa(ca) } : {}),
        prefix: row.prefix,
        asn: row.asn,
        max_length: row.max_length,
        not_before: row.not_before,
        not_after: row.not_after,
        status: row.status,
        revoked_at: row.revoked_at ?? undefined,
      })) as RpkiRoaRow[];
    })
  );
  return all.flat().sort((a, b) => Number(b.id) - Number(a.id));
}
