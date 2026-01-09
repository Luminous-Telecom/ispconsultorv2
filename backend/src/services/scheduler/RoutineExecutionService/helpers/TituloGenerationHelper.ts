import { Op } from 'sequelize';
import type { Transaction } from 'sequelize';
import { logger } from '../../../../utils/logger';
import { normalizeDateForDb, formatDate, ajustarDataVencimento } from '../../../../utils/dateUtils';
import { withTransaction } from '../../../../utils/transaction';
import { metrics, isMetricsEnabled } from '../../../../utils/metrics';
import { registrarCriacao } from '../../../sistema/AuditoriaService';
import { registrarCriacaoElasticsearch } from '../../../elasticsearch/ElasticsearchAuditService';
import type { Request } from 'express';
import type Parametros from '../../../../models/sistema/Parametros';

interface ContratoWithPlano {
  id: number;
  cliente_id: number;
  plano_id: number;
  conta_boleto: number | null;
  dia_vencimento_id: number | null;
  valor_final: number | null;
  desconto_valor: number | null;
  desconto_percentual: number | null;
  data_inicio: Date | null;
  plano?: {
    valor_mensal: number;
    nome_plano?: string;
  };
}

interface ContratoWithCliente {
  id: number;
  cliente_id: number;
  plano_id: number;
  conta_boleto: number | null;
  dia_vencimento_id: number | null;
  data_inicio: Date | null;
  cliente?: {
    id: number;
    ativo: boolean;
  };
}

interface ContratoPlanoAdicionalWithPlano {
  plano?: {
    id: number;
    nome_plano?: string;
    valor_mensal: number;
  };
  valor_final?: number | null;
  desconto_valor?: number | null;
  desconto_percentual?: number | null;
  contrato_id: number;
}

export class TituloGenerationHelper {
  /**
   * Valida se um contrato pode gerar títulos
   */
  static validateContrato(contrato: ContratoWithCliente): boolean {
    const cliente = contrato.cliente;
    if (!cliente || !cliente.ativo) {
      return false;
    }

    if (!contrato.conta_boleto) {
      return false;
    }

    if (!contrato.dia_vencimento_id) {
      return false;
    }

    return true;
  }

  /**
   * Calcula a data de vencimento para um mês específico
   */
  static async calculateDataVencimento(
    ano: number,
    mes: number,
    diaVencimento: number,
    dataInicioContrato: Date | null,
    hoje: Date,
    parametros: Parametros | null
  ): Promise<Date> {
    const ultimoDiaDoMes = new Date(ano, mes + 1, 0).getDate();
    let diaCorreto = Math.min(diaVencimento, ultimoDiaDoMes);
    
    if (dataInicioContrato) {
      const mesInicio = dataInicioContrato.getMonth();
      const anoInicio = dataInicioContrato.getFullYear();
      const diaInicio = dataInicioContrato.getDate();
      
      if (mes === mesInicio && ano === anoInicio) {
        if (diaVencimento > diaInicio) {
          diaCorreto = Math.min(diaVencimento, ultimoDiaDoMes);
        } else {
          if (dataInicioContrato < hoje) {
            const diaHoje = hoje.getDate();
            diaCorreto = Math.min(diaHoje, ultimoDiaDoMes);
          } else {
            diaCorreto = Math.min(diaInicio, ultimoDiaDoMes);
          }
        }
      }
    }
    
    let dataVencimento = new Date(ano, mes, diaCorreto);
    dataVencimento.setHours(0, 0, 0, 0);

    dataVencimento = await ajustarDataVencimento(dataVencimento, parametros);

    return dataVencimento;
  }

  /**
   * Verifica se já existe título para um mês/ano específico
   */
  static hasTituloForMonth(
    todosTitulos: Array<{ data_vencimento: Date; status?: string }>,
    ano: number,
    mes: number
  ): boolean {
    const mesAno = `${ano}-${String(mes + 1).padStart(2, '0')}`;
    return todosTitulos.some(t => {
      if (t.status === 'cancelado') {
        return false;
      }
      const dataTitulo = new Date(t.data_vencimento);
      return `${dataTitulo.getFullYear()}-${String(dataTitulo.getMonth() + 1).padStart(2, '0')}` === mesAno;
    });
  }

  /**
   * Calcula o valor do título incluindo serviços adicionais
   */
  static async calculateValorTitulo(
    contrato: ContratoWithPlano,
    servicosAdicionais: Array<ContratoPlanoAdicionalWithPlano>
  ): Promise<number> {
    const plano = contrato.plano;
    
    let valorTitulo: number = Number(contrato.valor_final) || 0;
    
    if (valorTitulo <= 0 && plano?.valor_mensal) {
      const { FinancialCalculationsService } = await import('../../../FinancialCalculationsService');
      
      valorTitulo = FinancialCalculationsService.calcularValorFinal(
        Number(plano.valor_mensal),
        {
          desconto_valor: contrato.desconto_valor,
          desconto_percentual: contrato.desconto_percentual
        }
      );
    }

    let valorServicosAdicionais = 0;
    for (const servico of servicosAdicionais) {
      let valorServico = Number(servico.valor_final) || 0;
      
      const planoAdicional = servico.plano;
      
      if (valorServico <= 0 && planoAdicional?.valor_mensal) {
        const { FinancialCalculationsService } = await import('../../../FinancialCalculationsService');
        
        valorServico = FinancialCalculationsService.calcularValorFinal(
          Number(planoAdicional.valor_mensal),
          {
            desconto_valor: servico.desconto_valor,
            desconto_percentual: servico.desconto_percentual
          }
        );
      }
      
      valorServicosAdicionais += Math.max(0, valorServico);
    }

    valorTitulo = valorTitulo + valorServicosAdicionais;

    const { FinancialCalculationsService } = await import('../../../FinancialCalculationsService');
    return Math.max(0.01, FinancialCalculationsService.round(valorTitulo));
  }

  /**
   * Cria um título para um contrato
   */
  static async createTitulo(
    contrato: ContratoWithPlano & { conta_boleto: number; dia_vencimento_id: number },
    dataVencimento: Date,
    valorTitulo: number,
    numeroTitulo: string,
    transaction: Transaction
  ): Promise<InstanceType<typeof import('../../../../models/financeiro/Titulo').Titulo>> {
    const { Titulo } = await import('../../../../models/financeiro/Titulo');
    const plano = contrato.plano;
    
    const dataVencimentoNormalizada = normalizeDateForDb(dataVencimento) || dataVencimento;
    
    const titulo = await Titulo.create({
      contrato_id: contrato.id,
      cliente_id: contrato.cliente_id,
      plano_id: contrato.plano_id,
      banco_id: contrato.conta_boleto,
      valor: valorTitulo,
      data_vencimento: dataVencimentoNormalizada,
      status: 'pendente',
      pago: false,
      descricao: `${plano?.nome_plano || 'Mensalidade'}\n${formatDate(dataVencimento) || ''}`,
      numero_titulo: numeroTitulo,
      is_avulso: false
    }, { transaction });

    if (isMetricsEnabled() && metrics) {
      metrics.businessTitulosGerados.inc();
    }

    return titulo;
  }

  /**
   * Registra auditoria para títulos criados
   */
  static async registerAuditForTitulos(titulos: Array<InstanceType<typeof import('../../../../models/financeiro/Titulo').Titulo>>): Promise<void> {
    const reqSimulado = {
      headers: {},
      socket: { remoteAddress: null },
      user: undefined
    } as unknown as Request;

    for (const titulo of titulos) {
      try {
        const tituloData = titulo.toJSON() as Record<string, unknown>;

        await registrarCriacao(
          reqSimulado,
          'Titulo',
          titulo.id,
          tituloData,
          'Título gerado automaticamente pelo agendador de tarefas'
        );

        await registrarCriacaoElasticsearch(
          reqSimulado,
          'Titulo',
          titulo.id,
          tituloData,
          'Título gerado automaticamente pelo agendador de tarefas'
        );
      } catch (error) {
        logger.warn('Erro ao registrar auditoria de título gerado', {
          titulo_id: titulo.id,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }
  }
}
