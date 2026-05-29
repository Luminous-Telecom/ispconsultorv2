import { DadosCentralAssinante } from 'services/centralAssinanteService';

export type CentralAssinanteTab = 'resumo' | 'contratos' | 'financeiro' | 'financeiro_pago' | 'termos';

export type CentralAssinanteCardTipo =
  | 'contratos'
  | 'faturas'
  | 'termos'
  | 'faturas_pagas'
  | 'faturas_a_pagar'
  | 'faturas_atrasadas';

type TituloAPagar = DadosCentralAssinante['titulos']['a_pagar'][number];
type TituloPago = DadosCentralAssinante['titulos']['pagos'][number];

export type FaturaVisualizar = Pick<
  TituloAPagar,
  | 'id'
  | 'numero_titulo'
  | 'valor'
  | 'valor_final'
  | 'data_vencimento'
  | 'status'
  | 'plano'
  | 'qrcode'
  | 'linha_digitavel'
  | 'descricao'
> &
  Partial<Pick<TituloAPagar, 'valor_aberto'>> &
  Partial<Pick<TituloPago, 'valor_pago' | 'data_pagamento'>>;

export const getStatusVariant = (
  status: string
): 'success' | 'danger' | 'warning' | 'secondary' | 'info' => {
  const statusMap: Record<string, 'success' | 'danger' | 'warning' | 'secondary' | 'info'> = {
    ativo: 'success',
    inativo: 'secondary',
    suspenso: 'danger',
    pendente: 'warning',
    pago: 'success',
    vencido: 'danger',
    cancelado: 'secondary',
    parcial: 'info',
    pago_atraso: 'success',
  };
  return statusMap[status.toLowerCase()] || 'secondary';
};

export const getStatusLabel = (status: string) => {
  const statusMap: Record<string, string> = {
    ativo: 'Ativo',
    inativo: 'Inativo',
    suspenso: 'Suspenso',
    pendente: 'Pendente',
    pago: 'Pago',
    vencido: 'Vencido',
    cancelado: 'Cancelado',
    parcial: 'Parcial',
    pago_atraso: 'Pago com Atraso',
  };
  return statusMap[status.toLowerCase()] || status;
};

export const getTabFromCardClick = (tipo: CentralAssinanteCardTipo): CentralAssinanteTab => {
  if (tipo === 'contratos') {
    return 'contratos';
  }
  if (tipo === 'termos') {
    return 'termos';
  }
  if (tipo === 'faturas_pagas') {
    return 'financeiro_pago';
  }
  if (tipo === 'faturas_a_pagar' || tipo === 'faturas_atrasadas') {
    return 'financeiro';
  }
  return 'financeiro';
};

export const temContratoComAssinaturaPendente = (dados: DadosCentralAssinante | undefined): boolean => {
  if (!dados) return false;

  return dados.contratos.some((contrato) =>
    dados.termos.some((termo) => termo.contrato_id === contrato.id && termo.assinado === 'NAO')
  );
};

export const temTermosComAssinaturaPendente = (dados: DadosCentralAssinante | undefined): boolean => {
  if (!dados) return false;
  return dados.termos.some((termo) => termo.assinado === 'NAO');
};
