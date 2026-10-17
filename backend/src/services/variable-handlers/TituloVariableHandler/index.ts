import { VariableHandler, VariableContext, VariableSubstitutions, GrupoVariaveis } from '../types';
import { gerarLinkPagamentoPublico } from '../../../controllers/titulos/TituloHelpers';
import { Formatter } from '../utils/Formatter';
import { VariableReplacer } from '../utils/VariableReplacer';

type TituloVars = {
  id: number;
  numero_titulo?: string | null;
  valor?: unknown;
  valor_pago?: unknown;
  data_vencimento?: Date | string | null;
  data_pagamento?: Date | string | null;
  status?: string | null;
  acrescimo_percentual?: unknown;
  acrescimo_valor?: unknown;
  descricao?: string | null;
  qrcode?: string | null;
  linha_digitavel?: string | null;
};

/**
 * Handler para processamento de variáveis relacionadas ao Título
 */
export class TituloVariableHandler implements VariableHandler {
  private static readonly VARIABLES = [
    '#titulo.id#',
    '#titulo.numero#',
    '#titulo.valor#',
    '#titulo.valor_pago#',
    '#titulo.saldo#',
    '#titulo.vencimento#',
    '#titulo.pagamento#',
    '#titulo.status#',
    '#titulo.dias_atraso#',
    '#titulo.juros#',
    '#titulo.multa#',
    '#titulo.descricao#',
    '#titulo.codigo_pix#',
    '#titulo.codigo_barras#',
    '#titulo.link_pagamento#'
  ];

  canProcess(conteudo: string): boolean {
    return VariableReplacer.containsAny(conteudo, TituloVariableHandler.VARIABLES);
  }

  getVariaveisDisponiveis(): GrupoVariaveis {
    return {
      titulo: 'Dados do Título/Parcela',
      variaveis: [
        { variavel: '#titulo.id#', descricao: 'ID do título' },
        { variavel: '#titulo.numero#', descricao: 'Número do título' },
        { variavel: '#titulo.valor#', descricao: 'Valor do título' },
        { variavel: '#titulo.valor_pago#', descricao: 'Valor pago' },
        { variavel: '#titulo.saldo#', descricao: 'Saldo devedor' },
        { variavel: '#titulo.vencimento#', descricao: 'Data de vencimento' },
        { variavel: '#titulo.pagamento#', descricao: 'Data e hora de pagamento' },
        { variavel: '#titulo.status#', descricao: 'Status do título' },
        { variavel: '#titulo.dias_atraso#', descricao: 'Dias em atraso' },
        { variavel: '#titulo.juros#', descricao: 'Valor de juros' },
        { variavel: '#titulo.multa#', descricao: 'Valor de multa' },
        { variavel: '#titulo.descricao#', descricao: 'Descrição do título' },
        { variavel: '#titulo.codigo_pix#', descricao: 'Código PIX EMV (texto para copiar e colar)' },
        { variavel: '#titulo.codigo_barras#', descricao: 'Linha digitável' },
        { variavel: '#titulo.link_pagamento#', descricao: 'Link público para página de pagamento (baixar boleto, copiar PIX, etc)' }
      ]
    };
  }

  process(conteudo: string, context: VariableContext): string {
    if (!context.titulo) {
      return conteudo;
    }

    const dataRef = context.dataReferencia || new Date();
    const titulo = context.titulo;
    const substitutions = this.buildSubstitutions(titulo, dataRef, context.baseUrl);
    
    return VariableReplacer.replace(conteudo, substitutions);
  }

  /**
   * Calcula dias de atraso do título
   */
  private calcularDiasAtraso(titulo: TituloVars, dataRef: Date): number {
    if (!titulo.data_vencimento) {
      return 0;
    }

    const dataVencimento = new Date(titulo.data_vencimento);
    
    if (dataVencimento >= dataRef) {
      return 0;
    }

    return Math.floor((dataRef.getTime() - dataVencimento.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Calcula valor de juros do título
   */
  private calcularJuros(titulo: TituloVars): number {
    const percentual = Number(titulo.acrescimo_percentual || 0);
    if (percentual <= 0) {
      return 0;
    }

    return (Number(titulo.valor) * percentual) / 100;
  }

  /**
   * Calcula valor de multa do título
   */
  private calcularMulta(titulo: TituloVars): number {
    return Number(titulo.acrescimo_valor || 0);
  }

  /**
   * Calcula saldo devedor do título
   */
  private calcularSaldo(titulo: TituloVars): number {
    const valor = Number(titulo.valor || 0);
    const valorPago = Number(titulo.valor_pago || 0);
    return valor - valorPago;
  }

  /**
   * Gera link de pagamento público
   */
  private gerarLinkPagamento(titulo: TituloVars, baseUrl?: string): string {
    return gerarLinkPagamentoPublico(titulo.id, baseUrl);
  }

  /**
   * Constrói o mapa de substituições para variáveis de título
   */
  private buildSubstitutions(
    titulo: TituloVars,
    dataRef: Date,
    baseUrl?: string
  ): VariableSubstitutions {
    const diasAtraso = this.calcularDiasAtraso(titulo, dataRef);
    const juros = this.calcularJuros(titulo);
    const multa = this.calcularMulta(titulo);
    const saldo = this.calcularSaldo(titulo);
    const linkPagamento = this.gerarLinkPagamento(titulo, baseUrl);

    return {
      '#titulo.id#': String(titulo.id),
      '#titulo.numero#': titulo.numero_titulo || String(titulo.id),
      '#titulo.valor#': Formatter.formatarMoeda(Number(titulo.valor || 0)),
      '#titulo.valor_pago#': Formatter.formatarMoeda(Number(titulo.valor_pago || 0)),
      '#titulo.saldo#': Formatter.formatarMoeda(saldo),
      '#titulo.vencimento#': titulo.data_vencimento 
        ? Formatter.formatarData(new Date(titulo.data_vencimento)) 
        : '',
      '#titulo.pagamento#': titulo.data_pagamento 
        ? Formatter.formatarDataHora(new Date(titulo.data_pagamento)) 
        : '',
      '#titulo.status#': titulo.status || '',
      '#titulo.dias_atraso#': String(diasAtraso),
      '#titulo.juros#': Formatter.formatarMoeda(juros),
      '#titulo.multa#': Formatter.formatarMoeda(multa),
      '#titulo.descricao#': titulo.descricao || '',
      '#titulo.codigo_pix#': titulo.qrcode || '',
      '#titulo.codigo_barras#': titulo.linha_digitavel || '',
      '#titulo.link_pagamento#': linkPagamento
    };
  }
}

