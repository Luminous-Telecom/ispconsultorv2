import { Contrato } from 'hooks/useContratos';
import { ContratoFilters } from 'services/contratoService';
import { ContratoRow, ContratoTranslateFn } from './contratoListTypes';

export const formatContratoCurrency = (value: number): string => {
  return `R$ ${value.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
};

export const calculateDescontoValor = (contrato: Contrato): number => {
  if (contrato.desconto_valor && Number(contrato.desconto_valor) > 0) {
    return Number(contrato.desconto_valor);
  }
  if (
    contrato.desconto_percentual &&
    Number(contrato.desconto_percentual) > 0 &&
    contrato.plano?.valor_mensal
  ) {
    const valorPlano = Number(contrato.plano.valor_mensal);
    return valorPlano * (Number(contrato.desconto_percentual) / 100);
  }
  return 0;
};

export const mapContratoToRow = (contrato: Contrato): ContratoRow => {
  const descontoValor = calculateDescontoValor(contrato);

  return {
    ...contrato,
    cliente_razao_social: contrato.cliente?.razao_social || '',
    plano_nome: contrato.plano?.nome_plano || '',
    valor_plano_num: contrato.plano?.valor_mensal ? Number(contrato.plano.valor_mensal) : 0,
    desconto_num: descontoValor,
    valor_final_num: contrato.valor_final ? Number(contrato.valor_final) : 0,
  };
};

export const buildDisplayTitle = (
  title: string,
  initialFilters: Partial<ContratoFilters> | undefined,
  t: ContratoTranslateFn
): string => {
  const tipoServicoLabels: Record<string, string> = {
    infraestrutura: t('form.serviceTypeInfrastructure'),
    consultoria: t('form.serviceTypeConsulting'),
    blockdomi: t('form.serviceTypeBlockdomi'),
  };

  let suffix = '';
  if (initialFilters?.em_atraso) {
    suffix = ` - ${t('status.inArrears')}`;
  } else if (initialFilters?.status) {
    const statusLabels: Record<string, string> = {
      ativo: t('status.active'),
      inativo: t('status.inactive'),
      suspenso: t('status.suspended'),
    };
    suffix = ` - ${statusLabels[initialFilters.status] || initialFilters.status}`;
  } else if (initialFilters?.isento_mensalidade) {
    suffix = ` - ${t('status.exempt')}`;
  } else if (initialFilters?.plano_id) {
    suffix = ` - ${t('table.plan')} #${initialFilters.plano_id}`;
  } else if (initialFilters?.cliente_id) {
    suffix = ` - ${t('table.client')} #${initialFilters.cliente_id}`;
  } else if (initialFilters?.tipo_servico) {
    suffix = ` - ${tipoServicoLabels[initialFilters.tipo_servico] || initialFilters.tipo_servico}`;
  }

  return title + suffix;
};

export const buildListFilters = (
  initialFilters: Partial<ContratoFilters> | undefined
): ContratoFilters => {
  const statusFilter =
    initialFilters?.em_atraso === true ? undefined : initialFilters?.status ?? 'ativo';

  return {
    ...(initialFilters?.em_atraso === true && { em_atraso: true }),
    ...(statusFilter && { status: statusFilter }),
    ...(initialFilters?.excluir_em_atraso === true && { excluir_em_atraso: true }),
    ...(initialFilters?.isento_mensalidade !== undefined && {
      isento_mensalidade: initialFilters.isento_mensalidade,
    }),
    ...(initialFilters?.plano_id && { plano_id: initialFilters.plano_id }),
    ...(initialFilters?.tipo_servico && { tipo_servico: initialFilters.tipo_servico }),
    ...(initialFilters?.cliente_id && { cliente_id: initialFilters.cliente_id }),
  };
};

export const calculateValorTotalMensal = (contratos: Contrato[]): number => {
  return contratos.reduce((total, contrato) => {
    const valor = contrato.valor_final
      ? parseFloat(contrato.valor_final.toString())
      : contrato.plano?.valor_mensal
        ? parseFloat(contrato.plano.valor_mensal.toString())
        : 0;
    return total + valor;
  }, 0);
};

export const calculateValorTotalDescontos = (contratos: Contrato[]): number => {
  return contratos.reduce((total, contrato) => total + calculateDescontoValor(contrato), 0);
};
