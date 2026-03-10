import { defaultApiClient } from '../core';
import {
  createSaasCrudService,
  type SaasConfigListResponse,
  type SaasCrudFilters,
} from './createSaasCrudService';
import type { ApiResponse } from '../../types';

export type { SaasConfigListResponse, SaasCrudFilters };

// ─── Tipos de Cobrança ────────────────────────────────────────────────────────

export interface SaasTipoCobranca {
  id: number;
  empresa_id: number;
  empresa?: { id: number; razao_social: string };
  nome: string;
  quantidade_titulos: number;
  periodicidade: string;
  ativo: boolean;
}

export const saasTipoCobrancaService = createSaasCrudService<SaasTipoCobranca>('/saas/tipos-cobranca');

// ─── Dias de Vencimento ───────────────────────────────────────────────────────

export interface SaasDiasVencimento {
  id: number;
  empresa_id: number;
  empresa?: { id: number; razao_social: string };
  dia: number | null;
  dia_padrao: number;
  ativo: boolean;
}

export const saasDiasVencimentoService = {
  ...createSaasCrudService<SaasDiasVencimento>('/saas/dias-vencimento'),
  getConfig: (empresaId?: number) =>
    defaultApiClient.get<{ success: boolean; data: SaasDiasVencimento[] }>(
      empresaId != null ? `/saas/dias-vencimento/config?empresa_id=${empresaId}` : '/saas/dias-vencimento/config'
    ),
  updateConfig: (dias: number[]) => defaultApiClient.put('/saas/dias-vencimento/config', { dias }),
};

// ─── Contratos ─────────────────────────────────────────────────────────────────

export interface SaasContrato {
  id: number;
  empresa_id: number;
  banco_id?: number | null;
  banco?: { id: number; nome: string; banco: string; tipo_banco: string };
  dia_vencimento?: number | null;
  plano_id: number;
  plano?: { id: number; nome: string; valor_mensal?: number };
  data_inicio: string;
  data_fim?: string | null;
  tipo: 'mensal' | 'anual';
  status: 'ativo' | 'cancelado' | 'expirado' | 'pendente';
  valor: number;
  observacoes?: string | null;
}

export const saasContratoService = createSaasCrudService<SaasContrato>('/saas/contratos');

// ─── Títulos ──────────────────────────────────────────────────────────────────

export interface SaasTitulo {
  id: number;
  empresa_id: number;
  plano_id: number;
  banco_id: number;
  contrato_id?: number | null;
  numero_titulo: string;
  valor: number;
  data_vencimento: string;
  status: string;
  pago: boolean;
  data_pagamento?: string | null;
  valor_pago?: number | null;
  nosso_numero?: string | null;
  charge_id?: string | null;
  url_boleto?: string | null;
  descricao?: string | null;
  is_avulso?: boolean;
  created_at?: string;
  empresa?: { id: number; nome_empresa?: string; razao_social?: string; cnpj?: string; email?: string };
  plano?: { id: number; nome: string };
  banco?: { id: number; nome: string; tipo_banco: string };
}

export const saasTituloService = {
  ...createSaasCrudService<SaasTitulo>('/saas/titulos'),
  gerarBoleto: (id: number) => defaultApiClient.post<ApiResponse<SaasTitulo>>(`/saas/titulos/${id}/gerar-boleto`, {}),
  marcarPago: (id: number, dataPagamento?: string, valorPago?: number, observacoes?: string) => {
    const payload: { data_pagamento?: string; valor_pago?: number; observacoes?: string } = {};
    if (dataPagamento) payload.data_pagamento = dataPagamento;
    if (valorPago != null) payload.valor_pago = valorPago;
    if (observacoes) payload.observacoes = observacoes;
    return defaultApiClient.post<ApiResponse<SaasTitulo>>(`/saas/titulos/${id}/pagar`, payload);
  },
  getResumo: () =>
    defaultApiClient.get<ApiResponse<{ titulosPendentes: number; titulosAtrasados: number; totalRecebido: number; mrr: number }>>('/saas/titulos/resumo'),
  gerarPdfBoletosMultiplos: async (ids: number[]): Promise<Blob> => {
    const idsParam = ids.join(',');
    const response = await defaultApiClient.get<Blob>(`/saas/titulos/boletos-multiplos-pdf?ids=${idsParam}`, { responseType: 'blob' });
    const data = response.data;
    if (!(data instanceof Blob)) {
      throw new Error('Resposta inválida do servidor');
    }
    return data;
  },
};