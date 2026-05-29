import { CreateContaPagar, ContaPagar } from 'types';
import { formatCurrency, formatCPF, formatCNPJ, formatLinhaDigitavel } from 'utils/formatters';
import { getTodayISO } from 'utils/dateUtils';
import type { ContaPagarFormData, ContaPagarFormErrors, PagamentoData } from './types';

export const initialFormData: ContaPagarFormData = {
  tipo_criacao: 'unica',
  fornecedor_id: 0,
  data_vencimento: '',
  data_vencimento_inicial: '',
  data_vencimento_final: '',
  valor: '',
  tipo_pagamento: 'PIX',
  numero_documento: '',
  nota_fiscal: '',
  descricao: '',
  observacoes: '',
  linha_digitavel: '',
  tipo_chave_pix: '',
  chave_pix: ''
};

export const getInitialPagamentoData = (): PagamentoData => ({
  tipo_pagamento: 'PIX',
  desconto_percentual: '',
  desconto_valor: '',
  acrescimo_percentual: '',
  acrescimo_valor: '',
  data_pagamento: getTodayISO(),
  observacao: '',
  valor_total: ''
});

export const mapContaPagarToFormData = (contaPagar: ContaPagar): ContaPagarFormData => ({
  tipo_criacao: 'unica',
  fornecedor_id: contaPagar.fornecedor_id,
  data_vencimento: contaPagar.data_vencimento ? contaPagar.data_vencimento.split('T')[0] : '',
  data_vencimento_inicial: '',
  data_vencimento_final: '',
  valor: contaPagar.valor ? formatCurrency(Number(contaPagar.valor), false) : '',
  tipo_pagamento: contaPagar.tipo_pagamento || 'PIX',
  numero_documento: contaPagar.numero_documento || '',
  nota_fiscal: contaPagar.nota_fiscal || '',
  descricao: contaPagar.descricao || '',
  observacoes: contaPagar.observacoes || '',
  linha_digitavel: contaPagar.linha_digitavel ? formatLinhaDigitavel(contaPagar.linha_digitavel) : '',
  tipo_chave_pix: contaPagar.tipo_chave_pix || '',
  chave_pix: contaPagar.chave_pix ? formatChavePixFromContaPagar(contaPagar) : ''
});

const formatChavePixFromContaPagar = (contaPagar: ContaPagar): string => {
  if (contaPagar.tipo_chave_pix === 'CPF_CNPJ') {
    const cleaned = contaPagar.chave_pix!.replace(/\D/g, '');
    return cleaned.length <= 11 ? formatCPF(cleaned) : formatCNPJ(cleaned);
  }
  if (contaPagar.tipo_chave_pix === 'CELULAR') {
    const cleaned = contaPagar.chave_pix!.replace(/\D/g, '').slice(0, 11);
    return cleaned && cleaned.length >= 10
      ? `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
      : contaPagar.chave_pix!;
  }
  return contaPagar.chave_pix!;
};

export const validateContaPagarForm = (formData: ContaPagarFormData): ContaPagarFormErrors => {
  const newErrors: ContaPagarFormErrors = {};

  if (!formData.fornecedor_id || formData.fornecedor_id === 0) {
    newErrors.fornecedor_id = 'Fornecedor é obrigatório';
  }

  if (formData.tipo_criacao === 'unica') {
    if (!formData.data_vencimento.trim()) {
      newErrors.data_vencimento = 'Data de vencimento é obrigatória';
    }
  } else {
    if (!formData.data_vencimento_inicial.trim()) {
      newErrors.data_vencimento_inicial = 'Data inicial é obrigatória';
    }
    if (!formData.data_vencimento_final.trim()) {
      newErrors.data_vencimento_final = 'Data final é obrigatória';
    } else if (
      formData.data_vencimento_inicial.trim() &&
      formData.data_vencimento_inicial > formData.data_vencimento_final
    ) {
      newErrors.data_vencimento_final = 'Data final deve ser posterior à data inicial';
    }
  }

  if (!formData.valor.trim()) {
    newErrors.valor = 'Valor é obrigatório';
  } else {
    const valorNum = parseFloat(formData.valor.replace(/\./g, '').replace(',', '.'));
    if (isNaN(valorNum) || valorNum <= 0) {
      newErrors.valor = 'Valor deve ser maior que zero';
    }
  }

  return newErrors;
};

const processarChavePix = (formData: ContaPagarFormData): string | undefined => {
  if (formData.tipo_pagamento !== 'PIX') return undefined;
  const chave = formData.chave_pix.trim();
  if (!chave) return undefined;
  if (formData.tipo_chave_pix === 'CPF_CNPJ' || formData.tipo_chave_pix === 'CELULAR') {
    return chave.replace(/\D/g, '');
  }
  return chave;
};

export const buildContaPagarSubmitData = (
  formData: ContaPagarFormData
): CreateContaPagar & { data_vencimento_inicial?: string; data_vencimento_final?: string } => {
  const valorNum = parseFloat(formData.valor.replace(/\./g, '').replace(',', '.'));

  return {
    fornecedor_id: formData.fornecedor_id,
    valor: valorNum,
    tipo_pagamento: formData.tipo_pagamento,
    numero_documento: formData.numero_documento.trim() || undefined,
    nota_fiscal: formData.nota_fiscal.trim() || undefined,
    descricao: formData.descricao.trim() || undefined,
    observacoes: formData.observacoes.trim() || undefined,
    linha_digitavel:
      formData.tipo_pagamento === 'BOLETO'
        ? formData.linha_digitavel.replace(/\D/g, '').trim() || undefined
        : undefined,
    tipo_chave_pix: formData.tipo_pagamento === 'PIX' ? formData.tipo_chave_pix || undefined : undefined,
    chave_pix: processarChavePix(formData),
    ...(formData.tipo_criacao === 'lote'
      ? {
          data_vencimento_inicial: formData.data_vencimento_inicial,
          data_vencimento_final: formData.data_vencimento_final
        }
      : { data_vencimento: formData.data_vencimento })
  } as CreateContaPagar & { data_vencimento_inicial?: string; data_vencimento_final?: string };
};

export const calculatePagamentoTotals = (
  contaPagar: ContaPagar | undefined,
  pagamentoData: PagamentoData
) => {
  const valorAberto = contaPagar ? Number(contaPagar.valor) - Number(contaPagar.valor_pago || 0) : 0;
  const descontoPercentual = pagamentoData.desconto_percentual
    ? parseFloat(pagamentoData.desconto_percentual.replace(',', '.')) || 0
    : 0;
  const descontoValor = pagamentoData.desconto_valor
    ? parseFloat(pagamentoData.desconto_valor.replace(/\./g, '').replace(',', '.')) || 0
    : 0;
  const descontoTotal = descontoValor + (valorAberto * descontoPercentual) / 100;
  const acrescimoPercentual = pagamentoData.acrescimo_percentual
    ? parseFloat(pagamentoData.acrescimo_percentual.replace(',', '.')) || 0
    : 0;
  const acrescimoValor = pagamentoData.acrescimo_valor
    ? parseFloat(pagamentoData.acrescimo_valor.replace(/\./g, '').replace(',', '.')) || 0
    : 0;
  const acrescimoTotal = acrescimoValor + (valorAberto * acrescimoPercentual) / 100;
  const valorTotalCalculado = Math.max(0, valorAberto - descontoTotal + acrescimoTotal);

  const valorTotalDigitado = pagamentoData.valor_total?.trim()
    ? parseFloat(pagamentoData.valor_total.replace(/\./g, '').replace(',', '.')) || null
    : null;
  const valorTotal = valorTotalDigitado ?? valorTotalCalculado;

  return { valorAberto, valorTotalCalculado, valorTotal };
};
