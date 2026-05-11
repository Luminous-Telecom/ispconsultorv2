import { Op } from 'sequelize';
import {
  registrarLogBlockdomiElasticsearch,
  listarLogsBlockdomiElasticsearch,
  type RegistroBlockdomiLogPayload,
  type ListBlockdomiLogFilters
} from '../../elasticsearch/BlockdomiLogElasticsearchService';
import { DadosEmpresa } from '../../../models/sistema/DadosEmpresa';

export interface RegistroLogPayload {
  ip: string | null;
  rota: string;
  metodo: string;
  status_http: number;
  sucesso?: boolean;
  mensagem_erro?: string | null;
  user_agent?: string | null;
  empresa_id?: number | null;
}

export interface ListLogAcessoFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortColumn?: string;
  sortDirection?: string;
  sucesso?: boolean;
  origem?: 'api_txt' | 'sistema';
}

export interface ListLogAcessoResponse {
  data: Array<Record<string, unknown>>;
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
  };
}

export class BlockdomiLogAcessoService {
  static async registrar(payload: RegistroLogPayload): Promise<void> {
    await registrarLogBlockdomiElasticsearch(payload as RegistroBlockdomiLogPayload);
  }

  private static async attachEmpresaNomes(rows: Array<Record<string, unknown>>): Promise<Array<Record<string, unknown>>> {
    const ids = [
      ...new Set(
        rows
          .map((r) => r.empresa_id)
          .filter((x): x is number => typeof x === 'number' && Number.isFinite(x) && x > 0)
      ),
    ];
    if (ids.length === 0) {
      return rows.map((r) => ({ ...r, empresa_nome: (r.empresa_nome as string | null | undefined) ?? null }));
    }
    const empresas = await DadosEmpresa.findAll({
      where: { id: { [Op.in]: ids } },
      attributes: ['id', 'razao_social', 'nome_fantasia'],
    });
    const map = new Map<number, string>();
    for (const e of empresas) {
      map.set(e.id, (e.razao_social?.trim() || e.nome_fantasia?.trim() || `Empresa ${e.id}`).trim());
    }
    return rows.map((r) => {
      const eid = typeof r.empresa_id === 'number' ? r.empresa_id : null;
      const nome = eid != null && eid > 0 ? map.get(eid) ?? null : null;
      return { ...r, empresa_nome: nome };
    });
  }

  static async list(filters: ListLogAcessoFilters): Promise<ListLogAcessoResponse> {
    const raw = await listarLogsBlockdomiElasticsearch(filters as ListBlockdomiLogFilters);
    const data = await BlockdomiLogAcessoService.attachEmpresaNomes(raw.data);
    return { data, pagination: raw.pagination };
  }
}
