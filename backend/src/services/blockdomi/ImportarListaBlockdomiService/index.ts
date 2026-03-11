import { DominioService } from '../DominioService';
import { IPv4Service } from '../IPv4Service';
import { IPv6Service } from '../IPv6Service';
import { VersaoBlockdomiService } from '../VersaoBlockdomiService';

export interface ImportarListaPayload {
  dominios: string[];
  ipv4: string[];
  ipv6: string[];
  nome_oficio?: string | null;
  data_inicio_bloqueio?: string | null;
  data_fim_bloqueio?: string | null;
  link_oficio_anatel?: string | null;
  link_oficio_justica?: string | null;
  link_planilha_dominios?: string | null;
  empresa_id?: number | null;
}

export interface ImportarListaResult {
  versao_lista: string;
  dominios: { created: number; updated: number; skipped: number; errors: string[] };
  ipv4: { created: number; updated: number; skipped: number; errors: string[] };
  ipv6: { created: number; updated: number; skipped: number; errors: string[] };
}

/**
 * Importa uma lista blockdomi com controle de versão.
 * Uma única versão para toda a lista (todos os domínios/IPv4/IPv6 da importação compartilham a mesma versão).
 */
export class ImportarListaBlockdomiService {
  static async importar(payload: ImportarListaPayload): Promise<ImportarListaResult> {
    const versaoLista = await VersaoBlockdomiService.obterProximaVersao('lista');

    const metadata = {
      nome_oficio: payload.nome_oficio ?? null,
      data_inicio_bloqueio: payload.data_inicio_bloqueio ?? null,
      data_fim_bloqueio: payload.data_fim_bloqueio ?? null,
      link_oficio_anatel: payload.link_oficio_anatel ?? null,
      link_oficio_justica: payload.link_oficio_justica ?? null,
      link_planilha_dominios: payload.link_planilha_dominios ?? null,
      empresa_id: payload.empresa_id ?? null,
      versaoId: versaoLista.id
    };

    const empty = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };
    const [domRes, ipv4Res, ipv6Res] = await Promise.all([
      payload.dominios.length > 0 ? DominioService.bulkCreate(payload.dominios, metadata) : Promise.resolve(empty),
      payload.ipv4.length > 0 ? IPv4Service.bulkCreate(payload.ipv4, metadata) : Promise.resolve(empty),
      payload.ipv6.length > 0 ? IPv6Service.bulkCreate(payload.ipv6, metadata) : Promise.resolve(empty)
    ]);

    return {
      versao_lista: versaoLista.numero,
      dominios: domRes,
      ipv4: ipv4Res,
      ipv6: ipv6Res
    };
  }
}
