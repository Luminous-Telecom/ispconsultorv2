import { CarneParcela, Contrato, Plano } from 'types';

export const calcularProximaDataVencimento = (diaVencimento: number): string => {
  const hoje = new Date();
  const proximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, diaVencimento);

  const vencimento = new Date(hoje.getFullYear(), hoje.getMonth(), diaVencimento);
  const dataFinal = vencimento > hoje ? vencimento : proximoMes;

  return dataFinal.toISOString().split('T')[0];
};

export const getValorTitulo = (titulo?: CarneParcela): number => {
  if (!titulo) {
    return 0;
  }
  return titulo.valor_final || titulo.valor || titulo.valor_parcela || 0;
};

type TituloComCliente = CarneParcela & {
  cliente?: { id: number; razao_social?: string; nome_fantasia?: string; cnpj?: string };
};

type ClienteListItem = {
  id: number;
  razao_social?: string;
  nome_fantasia?: string;
  cnpj?: string;
};

export const getClienteDisplayLabel = (
  titulo: TituloComCliente | undefined,
  clienteId: number | undefined,
  clientes: ClienteListItem[] | undefined,
  labels: { clientNotFound: string; loading: string }
): string => {
  if (titulo?.cliente) {
    return `${titulo.cliente.nome_fantasia || titulo.cliente.razao_social} - ${titulo.cliente.cnpj}`;
  }

  if (!clienteId) {
    return labels.clientNotFound;
  }
  if (!clientes || clientes.length === 0) {
    return labels.loading;
  }

  const cliente = clientes.find((c) => c.id === clienteId);
  if (!cliente) {
    return labels.clientNotFound;
  }

  return `${cliente.nome_fantasia || cliente.razao_social} - ${cliente.cnpj}`;
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
