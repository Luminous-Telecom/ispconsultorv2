export function arredondarMoedaSaasPlano(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export function calcularValorAnualComDesconto(
  valorMensal: number,
  descontoPercentual: number
): number {
  const referencia = valorMensal * 12;
  if (referencia <= 0) return 0;
  if (descontoPercentual <= 0) return arredondarMoedaSaasPlano(referencia);
  if (descontoPercentual >= 100) return 0;
  return arredondarMoedaSaasPlano(referencia * (1 - descontoPercentual / 100));
}

export function calcularDescontoAnual(valorMensal: number, valorAnual: number): number {
  const referencia = valorMensal * 12;
  if (referencia <= 0 || valorAnual <= 0) return 0;
  if (valorAnual >= referencia) return 0;
  const desconto = (1 - valorAnual / referencia) * 100;
  return arredondarMoedaSaasPlano(Math.min(100, Math.max(0, desconto)));
}

export function syncSaasPlanoOnValorMensalChange(
  prev: { valor_mensal: number; valor_anual: number | ''; desconto_percentual: number },
  valorMensal: number
): { valor_mensal: number; valor_anual?: number | ''; desconto_percentual?: number } {
  if (prev.desconto_percentual > 0) {
    return {
      valor_mensal: valorMensal,
      valor_anual: calcularValorAnualComDesconto(valorMensal, prev.desconto_percentual),
    };
  }
  if (prev.valor_anual !== '' && Number(prev.valor_anual) > 0) {
    return {
      valor_mensal: valorMensal,
      desconto_percentual: calcularDescontoAnual(valorMensal, Number(prev.valor_anual)),
    };
  }
  return { valor_mensal: valorMensal };
}

export function syncSaasPlanoOnValorAnualChange(
  prev: { valor_mensal: number },
  valorAnual: number | ''
): { valor_anual: number | ''; desconto_percentual: number } {
  if (valorAnual === '') {
    return { valor_anual: '', desconto_percentual: 0 };
  }
  return {
    valor_anual: valorAnual,
    desconto_percentual: calcularDescontoAnual(prev.valor_mensal, Number(valorAnual)),
  };
}

export function syncSaasPlanoOnDescontoChange(
  prev: { valor_mensal: number },
  descontoPercentual: number
): { desconto_percentual: number; valor_anual: number | '' } {
  const desconto = arredondarMoedaSaasPlano(Math.min(100, Math.max(0, descontoPercentual)));
  if (prev.valor_mensal <= 0) {
    return { desconto_percentual: desconto, valor_anual: '' };
  }
  return {
    desconto_percentual: desconto,
    valor_anual: calcularValorAnualComDesconto(prev.valor_mensal, desconto),
  };
}
