import { CarneParcela, Contrato, Plano, Titulo } from 'types';
import { getClienteRazaoSocialLabel } from 'utils/clienteDisplay';

export const calcularProximaDataVencimento = (diaVencimento: number): string => {
  const hoje = new Date();
  const proximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, diaVencimento);

  const vencimento = new Date(hoje.getFullYear(), hoje.getMonth(), diaVencimento);
  const dataFinal = vencimento > hoje ? vencimento : proximoMes;

  return dataFinal.toISOString().split('T')[0];
};

export const getValorTitulo = (titulo?: CarneParcela | Titulo): number => {
  if (!titulo) {
    return 0;
  }
  const valorParcela = 'valor_parcela' in titulo ? titulo.valor_parcela : undefined;
  return titulo.valor_final || titulo.valor || valorParcela || 0;
};

type TituloComCliente = (CarneParcela | Titulo) & {
  cliente?: { id: number; razao_social?: string; nome_fantasia?: string; cnpj?: string };
  plano?: { id?: number; nome_plano?: string };
  contrato?: {
    id: number;
    plano_id?: number;
    status?: 'ativo' | 'inativo' | 'suspenso';
    plano?: { nome_plano?: string };
    tipoCobrancaContrato?: { nome?: string };
  };
  contrato_id?: number;
  cliente_id?: number;
};

type ClienteListItem = {
  id: number;
  razao_social?: string;
  nome_fantasia?: string;
  cnpj?: string;
};

export const formatTituloReadOnlyValue = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || String(value).trim() === '') {
    return '-';
  }
  return String(value);
};

export const getPlanoDisplayLabel = (
  titulo: TituloComCliente | undefined,
  planoId: number | undefined,
  planos: { id: number; nome_plano: string }[] | undefined,
  loadingLabel: string
): string => {
  if (titulo?.plano?.nome_plano) {
    return titulo.plano.nome_plano;
  }

  const resolvedPlanoId = planoId || titulo?.plano_id;
  if (!resolvedPlanoId) {
    return '-';
  }
  if (!planos || planos.length === 0) {
    return loadingLabel;
  }

  const plano = planos.find((p) => p.id === resolvedPlanoId);
  return plano?.nome_plano || '-';
};

const resolveContratoStatusLabel = (
  status: 'ativo' | 'inativo' | 'suspenso' | undefined,
  labels: { statusActive: string; statusInactive: string; statusSuspended: string }
): string | undefined => {
  if (status === 'ativo') return labels.statusActive;
  if (status === 'inativo') return labels.statusInactive;
  if (status === 'suspenso') return labels.statusSuspended;
  return undefined;
};

export const getContratoDisplayLabel = (
  titulo: TituloComCliente | undefined,
  planos: { id: number; nome_plano: string }[] | undefined,
  labels: {
    loading: string;
    statusActive: string;
    statusInactive: string;
    statusSuspended: string;
  }
): string => {
  const contrato = titulo?.contrato;
  const contratoId = contrato?.id ?? titulo?.contrato_id;
  if (!contratoId) {
    return '-';
  }

  const planoId = contrato?.plano_id ?? titulo?.plano_id;
  const planoNome =
    contrato?.plano?.nome_plano ||
    (planoId && planos?.find((p) => p.id === planoId)?.nome_plano);

  if (!contrato && !planos?.length) {
    return labels.loading;
  }

  const parts: string[] = [`#${contratoId}`];
  if (planoNome) {
    parts.push(planoNome);
  }
  const tipoCobranca = contrato?.tipoCobrancaContrato?.nome;
  if (tipoCobranca) {
    parts.push(tipoCobranca);
  }
  const statusLabel = resolveContratoStatusLabel(contrato?.status, labels);
  if (statusLabel) {
    parts.push(statusLabel);
  }

  return parts.join(' · ');
};

export const getClienteDisplayLabel = (
  titulo: TituloComCliente | undefined,
  clienteId: number | undefined,
  clientes: ClienteListItem[] | undefined,
  labels: { clientNotFound: string; loading: string }
): string => {
  if (titulo?.cliente) {
    const doc = titulo.cliente.cnpj ? ` - ${titulo.cliente.cnpj}` : '';
    return `${getClienteRazaoSocialLabel(titulo.cliente, labels.clientNotFound)}${doc}`;
  }

  const resolvedClienteId = clienteId ?? titulo?.cliente_id;
  if (!resolvedClienteId) {
    return labels.clientNotFound;
  }
  if (!clientes || clientes.length === 0) {
    return labels.loading;
  }

  const cliente = clientes.find((c) => c.id === resolvedClienteId);
  if (!cliente) {
    return labels.clientNotFound;
  }

  const doc = cliente.cnpj ? ` - ${cliente.cnpj}` : '';
  return `${getClienteRazaoSocialLabel(cliente, labels.clientNotFound)}${doc}`;
};

export const findPlanoValorMensal = (planos: Plano[] | undefined, planoId: number): number | null => {
  const planoSelecionado = planos?.find((p) => p.id === planoId);
  if (!planoSelecionado?.valor_mensal) {
    return null;
  }
  const valorMensal = parseFloat(String(planoSelecionado.valor_mensal));
  return valorMensal > 0 ? valorMensal : null;
};

export const findContratoAtivo = (contratos: Contrato[] | undefined): Contrato | undefined =>
  contratos?.find((contrato) => contrato.status === 'ativo');
