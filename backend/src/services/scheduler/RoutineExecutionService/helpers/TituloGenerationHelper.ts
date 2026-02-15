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

type Periodicidade = 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'bimestral' | 'quinzenal' | 'semanal' | null | undefined;

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
    periodicidade?: Periodicidade;
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
   * Retorna o incremento em meses para a periodicidade (para bimestral+).
   * Para quinzenal/semanal retorna 0 (usa dias).
   */
  static getMesesIncrement(periodicidade: Periodicidade): number {
    switch (periodicidade) {
      case 'semanal': return 0;
      case 'quinzenal': return 0;
      case 'mensal': return 1;
      case 'bimestral': return 2;
      case 'trimestral': return 3;
      case 'semestral': return 6;
      case 'anual': return 12;
      default: return 1;
    }
  }

  /**
   * Retorna o incremento em dias para periodicidades menores que mensal
   */
  static getDiasIncrement(periodicidade: Periodicidade): number {
    switch (periodicidade) {
      case 'semanal': return 7;
      case 'quinzenal': return 15;
      default: return 0;
    }
  }

  /**
   * Gera chave de período para comparação conforme periodicidade
   */
  static getPeriodKey(ano: number, mes: number, dia: number, periodicidade: Periodicidade): string {
    const m = mes + 1;
    switch (periodicidade) {
      case 'anual':
        return `${ano}`;
      case 'semestral':
        return `${ano}-S${Math.floor((m - 1) / 6) + 1}`;
      case 'trimestral':
        return `${ano}-T${Math.floor((m - 1) / 3) + 1}`;
      case 'bimestral':
        return `${ano}-${String(Math.floor((m - 1) / 2) + 1).padStart(2, '0')}`;
      case 'quinzenal':
        return `${ano}-${String(m).padStart(2, '0')}-Q${dia <= 15 ? 1 : 2}`;
      case 'semanal': {
        const d = new Date(ano, mes, dia);
        const inicioAno = new Date(ano, 0, 1);
        const diff = Math.floor((d.getTime() - inicioAno.getTime()) / (7 * 24 * 60 * 60 * 1000));
        return `${ano}-W${String(diff + 1).padStart(2, '0')}`;
      }
      case 'mensal':
      default:
        return `${ano}-${String(m).padStart(2, '0')}`;
    }
  }

  /**
   * Verifica se já existe título para o período conforme periodicidade do plano
   */
  static hasTituloForPeriod(
    todosTitulos: Array<{ data_vencimento: Date; status?: string }>,
    ano: number,
    mes: number,
    dia: number,
    periodicidade: Periodicidade
  ): boolean {
    const periodKey = this.getPeriodKey(ano, mes, dia, periodicidade);
    return todosTitulos.some(t => {
      if (t.status === 'cancelado') return false;
      const dataTitulo = new Date(t.data_vencimento);
      const keyTitulo = this.getPeriodKey(
        dataTitulo.getFullYear(),
        dataTitulo.getMonth(),
        dataTitulo.getDate(),
        periodicidade
      );
      return keyTitulo === periodKey;
    });
  }

  /**
   * Verifica se já existe título para um mês/ano específico (mantido para compatibilidade)
   */
  static hasTituloForMonth(
    todosTitulos: Array<{ data_vencimento: Date; status?: string }>,
    ano: number,
    mes: number
  ): boolean {
    return this.hasTituloForPeriod(todosTitulos, ano, mes, 1, 'mensal');
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
