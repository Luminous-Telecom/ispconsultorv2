import { BaseService, BaseFilters } from './core/BaseService';
import { defaultApiClient } from './core/ApiClient';
import { ApiResponse } from 'types';

export interface ValorIndicador {
  percentual: number;
  valor_aberto: number;
  valor_base: number;
}

export interface FaixaAtrasoIndicador {
  faixa: '1_15' | '16_30' | '31_60' | '61_90' | '91_mais';
  titulos: number;
  clientes: number;
  valor: number;
}

export interface DiaPagamentoIndicador {
  dia: number;
  titulos: number;
  percentual_no_prazo: number;
  percentual_ate_5_dias: number;
  atraso_medio_dias: number;
  abaixo_do_minimo: boolean;
}

export interface IndicadoresCobranca {
  mes: string;
  inadimplencia_mes: ValorIndicador;
  inadimplencia_estoque: ValorIndicador;
  clientes: { inadimplentes: number; com_contrato_ativo: number; percentual: number };
  atraso_medio_dias: number;
  valor_em_atraso: number;
  faixas: FaixaAtrasoIndicador[];
  melhores_datas: DiaPagamentoIndicador[];
  melhor_dia: number | null;
  volume_minimo: number;
}

export interface AgendaCobrancaItem {
  id: string;
  titulo_id: number;
  cliente_id: number;
  cliente: string;
  numero_titulo: string;
  valor: number;
  data_vencimento: string;
  data_envio: string;
  tipo_mensagem: string;
  momento: 'antes' | 'mesmo' | 'depois';
  dias: number;
  canal: 'email' | 'whatsapp';
  situacao: 'vai_sair' | 'sai_hoje' | 'ja_passou';
}

export interface AgendaCobranca {
  itens: AgendaCobrancaItem[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
  };
  passos: Array<{ dias: number; momento: 'antes' | 'mesmo' | 'depois'; tipoMensagem: string; canais: Array<'email' | 'whatsapp'> }>;
  sem_passos: boolean;
}

export interface AgendaCobrancaFilters extends BaseFilters {
  data_inicio?: string;
  data_fim?: string;
  searchField?: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}

class CobrancaPainelServiceClass extends BaseService<AgendaCobrancaItem, { id: number }, { id: number }, AgendaCobrancaFilters> {
  constructor() {
    super(defaultApiClient, '/cobranca');
  }

  indicadores(mes: string): Promise<ApiResponse<IndicadoresCobranca>> {
    return this.customGet<IndicadoresCobranca>('/indicadores', { mes });
  }

  agenda(filters: AgendaCobrancaFilters): Promise<ApiResponse<AgendaCobranca>> {
    return this.customGet<AgendaCobranca>('/agenda', { ...filters });
  }
}

const cobrancaPainelService = new CobrancaPainelServiceClass();

export class CobrancaPainelService {
  static indicadores = (mes: string) => cobrancaPainelService.indicadores(mes);
  static agenda = (filters: AgendaCobrancaFilters) => cobrancaPainelService.agenda(filters);
}
