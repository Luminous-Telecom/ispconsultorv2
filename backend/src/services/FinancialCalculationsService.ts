/**
 * Serviço centralizado para cálculos financeiros
 * Centraliza lógica de juros, multas, descontos e acréscimos
 */

/**
 * Opções para cálculo de desconto
 */
export interface DescontoOptions {
  desconto_valor?: number | null;
  desconto_percentual?: number | null;
}

/**
 * Opções para cálculo de acréscimo
 */
export interface AcrescimoOptions {
  acrescimo_valor?: number | null;
  acrescimo_percentual?: number | null;
}

/**
 * Opções para cálculo de juros e multa
 */
export interface JurosMultaOptions {
  percentual_multa?: number | null;
  percentual_juros?: number | null;
  diasAtraso: number;
}

/**
 * Resultado de cálculo de desconto
 */
export interface DescontoResult {
  valorOriginal: number;
  valorDesconto: number;
  valorFinal: number;
}

/**
 * Resultado de cálculo de acréscimo
 */
export interface AcrescimoResult {
  valorOriginal: number;
  valorAcrescimo: number;
  valorFinal: number;
}

/**
 * Resultado de cálculo de juros e multa
 */
export interface JurosMultaResult {
  valorOriginal: number;
  valorMulta: number;
  valorJuros: number;
  valorFinal: number;
}

/**
 * Serviço para cálculos financeiros
 */
export class FinancialCalculationsService {
  /**
   * Arredonda valor para 2 casas decimais
   */
  static round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  /**
   * Calcula desconto sobre um valor
   * Prioriza desconto em valor sobre desconto percentual
   * 
   * @param valorOriginal - Valor original antes do desconto
   * @param options - Opções de desconto
   * @returns Resultado do cálculo de desconto
   */
  static calcularDesconto(
    valorOriginal: number,
    options: DescontoOptions
  ): DescontoResult {
    const valor = parseFloat(valorOriginal.toString());
    let valorDesconto = 0;

    // Sempre usar desconto em valor quando disponível (mais preciso)
    if (options.desconto_valor && options.desconto_valor > 0) {
      valorDesconto = parseFloat(options.desconto_valor.toString());
    } else if (options.desconto_percentual && options.desconto_percentual > 0) {
      // Calcular valor do desconto a partir do percentual
      valorDesconto = valor * (parseFloat(options.desconto_percentual.toString()) / 100);
    }

    const valorFinal = Math.max(0, valor - valorDesconto);

    return {
      valorOriginal: this.round(valor),
      valorDesconto: this.round(valorDesconto),
      valorFinal: this.round(valorFinal)
    };
  }

  /**
   * Calcula acréscimo sobre um valor
   * Aplica primeiro acréscimo percentual, depois acréscimo em valor
   * 
   * @param valorOriginal - Valor original antes do acréscimo
   * @param options - Opções de acréscimo
   * @returns Resultado do cálculo de acréscimo
   */
  static calcularAcrescimo(
    valorOriginal: number,
    options: AcrescimoOptions
  ): AcrescimoResult {
    const valor = parseFloat(valorOriginal.toString());
    let valorAcrescimo = 0;
    let valorAtual = valor;

    // Aplicar acréscimo percentual primeiro
    if (options.acrescimo_percentual && options.acrescimo_percentual > 0) {
      const acrescimoPercentual = valorAtual * (parseFloat(options.acrescimo_percentual.toString()) / 100);
      valorAtual += acrescimoPercentual;
      valorAcrescimo += acrescimoPercentual;
    }

    // Depois aplicar acréscimo em valor
    if (options.acrescimo_valor && options.acrescimo_valor > 0) {
      valorAtual += parseFloat(options.acrescimo_valor.toString());
      valorAcrescimo += parseFloat(options.acrescimo_valor.toString());
    }

    return {
      valorOriginal: this.round(valor),
      valorAcrescimo: this.round(valorAcrescimo),
      valorFinal: this.round(valorAtual)
    };
  }

  /**
   * Calcula valor final aplicando desconto e acréscimo
   * Ordem: desconto primeiro, depois acréscimo
   * 
   * @param valorOriginal - Valor original
   * @param descontoOptions - Opções de desconto
   * @param acrescimoOptions - Opções de acréscimo
   * @returns Valor final calculado
   */
  static calcularValorFinal(
    valorOriginal: number,
    descontoOptions?: DescontoOptions,
    acrescimoOptions?: AcrescimoOptions
  ): number {
    let valorAtual = parseFloat(valorOriginal.toString());

    // Aplicar desconto primeiro
    if (descontoOptions) {
      const descontoResult = this.calcularDesconto(valorAtual, descontoOptions);
      valorAtual = descontoResult.valorFinal;
    }

    // Depois aplicar acréscimo
    if (acrescimoOptions) {
      const acrescimoResult = this.calcularAcrescimo(valorAtual, acrescimoOptions);
      valorAtual = acrescimoResult.valorFinal;
    }

    // Garantir valor mínimo de 0.01
    return Math.max(0.01, this.round(valorAtual));
  }

  /**
   * Calcula juros e multa sobre um valor vencido
   * 
   * @param valorOriginal - Valor original do título
   * @param options - Opções de juros e multa
   * @returns Resultado do cálculo de juros e multa
   */
  static calcularJurosEMulta(
    valorOriginal: number,
    options: JurosMultaOptions
  ): JurosMultaResult {
    const valor = parseFloat(valorOriginal.toString());
    let valorMulta = 0;
    let valorJuros = 0;
    let valorAtual = valor;

    // Se não há atraso, retornar valor original
    if (options.diasAtraso <= 0) {
      return {
        valorOriginal: this.round(valor),
        valorMulta: 0,
        valorJuros: 0,
        valorFinal: this.round(valor)
      };
    }

    // Calcular multa (percentual fixo sobre o valor original)
    if (options.percentual_multa && options.percentual_multa > 0) {
      valorMulta = valor * (options.percentual_multa / 100);
      valorAtual += valorMulta;
    }

    // Calcular juros (percentual diário sobre o valor atual)
    if (options.percentual_juros && options.percentual_juros > 0) {
      valorJuros = valorAtual * (options.percentual_juros / 100) * options.diasAtraso;
      valorAtual += valorJuros;
    }

    return {
      valorOriginal: this.round(valor),
      valorMulta: this.round(valorMulta),
      valorJuros: this.round(valorJuros),
      valorFinal: this.round(valorAtual)
    };
  }

  /**
   * Calcula dias de atraso entre duas datas
   * 
   * @param dataVencimento - Data de vencimento
   * @param dataReferencia - Data de referência (padrão: hoje)
   * @returns Número de dias de atraso (0 se não houver atraso)
   */
  static calcularDiasAtraso(
    dataVencimento: Date | string | null,
    dataReferencia: Date = new Date()
  ): number {
    if (!dataVencimento) {
      return 0;
    }

    const vencimento = typeof dataVencimento === 'string' 
      ? new Date(dataVencimento) 
      : dataVencimento;

    if (isNaN(vencimento.getTime())) {
      return 0;
    }

    // Normalizar datas para meia-noite para cálculo preciso
    const vencimentoNormalizado = new Date(vencimento.getFullYear(), vencimento.getMonth(), vencimento.getDate());
    const referenciaNormalizada = new Date(dataReferencia.getFullYear(), dataReferencia.getMonth(), dataReferencia.getDate());

    const diffTime = referenciaNormalizada.getTime() - vencimentoNormalizado.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  }

  /**
   * Valida se um valor financeiro é válido
   * 
   * @param valor - Valor a validar
   * @param valorMinimo - Valor mínimo permitido (padrão: 0.01)
   * @returns true se válido, false caso contrário
   */
  static validarValor(valor: number, valorMinimo: number = 0.01): boolean {
    if (isNaN(valor) || !isFinite(valor)) {
      return false;
    }
    return valor >= valorMinimo;
  }
}

