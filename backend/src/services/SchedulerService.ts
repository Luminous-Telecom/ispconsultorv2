import * as cron from 'node-cron';
import { ScheduledRoutine, RoutineExecutionLog } from '../models';
import { DiasVencimento } from '../models/DiasVencimento';
import { ContratoPlanoAdicional } from '../models/ContratoPlanoAdicional';
import { Contrato } from '../models/Contrato';
import { logger } from '../utils/logger';
import { BarcodeService } from './BarcodeService';
import { ajustarDataVencimento } from '../utils/dateUtils';
import { withTransaction } from '../utils/transaction';
import { metrics, isMetricsEnabled } from '../utils/metrics';
import type { JsonValue } from '../types';
import type { Transaction } from 'sequelize';

/**
 * Serviço responsável por agendar e executar rotinas automáticas do sistema.
 * Gerencia cron jobs para geração de títulos, envio de boletos e remessas bancárias.
 * 
 * @class SchedulerService
 */
interface RoutineResult {
  success?: boolean;
  message?: string;
  [key: string]: JsonValue | undefined;
}

interface GeracaoTitulosResult extends RoutineResult {
  success: boolean;
  titulos_gerados: number;
  contratos_processados: number;
  contratos_com_erro: number;
  message: string;
}

interface EnvioBoletosResult extends RoutineResult {
  success: boolean;
  mensagens_enviadas: number;
  erros: number;
  message: string;
}

interface RemessaBancariaDetalhe {
  titulo_id: number;
  banco?: string;
  status: 'sucesso' | 'erro';
  message: string;
  charge_id?: string;
}

interface RemessaBancariaResult {
  titulos_registrados: number;
  titulos_erro: number;
  total_processados: number;
  detalhes: RemessaBancariaDetalhe[];
  message?: string;
}

interface TituloWithRelations {
  banco?: {
    nome?: string;
  };
}

interface ContratoWithPlano {
  plano?: {
    valor_mensal: number;
    nome_plano?: string;
  };
}

interface ContratoWithCliente extends Contrato {
  cliente?: {
    id: number;
    ativo: boolean;
  };
}

interface ContratoPlanoAdicionalWithPlano extends ContratoPlanoAdicional {
  plano?: {
    id: number;
    nome_plano?: string;
    valor_mensal: number;
  };
}

interface SchedulerStatus {
  isRunning: boolean;
  activeJobs: number;
  scheduledRoutines: number[];
}

interface WorkersStatus {
  totalWorkers: number;
  activeWorkers: number;
  workers: Array<{
    id: number;
    status: string;
    lastActivity: Date;
  }>;
}

interface HealthStatus {
  status: 'healthy' | 'stopped';
  isRunning: boolean;
  activeJobs: number;
  uptime: number;
}

interface DetailedStats {
  scheduler: {
    isRunning: boolean;
    activeJobs: number;
    uptime: number;
  };
  system: {
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
    uptime: number;
  };
}

interface RoutineExecutionLogWithRoutine extends RoutineExecutionLog {
  routine?: Pick<ScheduledRoutine, 'nome' | 'tipo'>;
}

export class SchedulerService {
  private static instance: SchedulerService;
  private cronJobs: Map<number, cron.ScheduledTask> = new Map();
  private isRunning = false;

  private constructor() {
    // Singleton pattern - construtor privado
  }

  public static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService();
    }
    return SchedulerService.instance;
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Carregar rotinas ativas do banco de dados
    await this.loadRoutinesFromDatabase();

  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // Parar todos os cron jobs
    this.cronJobs.forEach((job, _routineId) => {
      job.destroy();
    });

    this.cronJobs.clear();
    this.isRunning = false;
  }

  private async loadRoutinesFromDatabase(): Promise<void> {
    try {
      const routines = await ScheduledRoutine.findAll({
        where: { ativo: true }
      });


      for (const routine of routines) {
        await this.scheduleRoutine(routine);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao carregar rotinas do banco de dados', {
        context: 'SchedulerService',
        action: 'loadRoutines',
        error: errorMessage,
        stack: errorStack
      });
    }
  }

  public async scheduleRoutine(routine: ScheduledRoutine): Promise<void> {
    if (!routine.ativo) {
      return;
    }

    // Parar job existente se houver
    if (this.cronJobs.has(routine.id)) {
      this.unscheduleRoutine(routine.id);
    }

    const cronExpression = this.buildCronExpression(routine);
    
    if (!cron.validate(cronExpression)) {
      logger.error('Expressão cron inválida para rotina', {
        context: 'SchedulerService',
        action: 'scheduleRoutine',
        rotinaId: routine.id,
        cronExpression
      });
      return;
    }

    const job = cron.schedule(cronExpression, () => {
      // Executar em background sem aguardar
      this.runRoutine(routine).catch((error) => {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        const errorStack = error instanceof Error ? error.stack : undefined;
        logger.error('Erro ao executar rotina em background', {
          context: 'SchedulerService',
          action: 'scheduleRoutine',
          rotinaId: routine.id,
          error: errorMessage,
          stack: errorStack
        });
      });
    });

    job.start();
    this.cronJobs.set(routine.id, job);

  }

  public unscheduleRoutine(routineId: number): void {
    const job = this.cronJobs.get(routineId);
    if (job) {
      job.destroy();
      this.cronJobs.delete(routineId);
    }
  }

  private buildCronExpression(routine: ScheduledRoutine): string {
    const [hours, minutes] = routine.hora_execucao.split(':');

    switch (routine.frequencia) {
      case 'diaria':
        return `${minutes} ${hours} * * *`;
      
      case 'semanal':
        const dayOfWeek = routine.dia_semana || 0;
        return `${minutes} ${hours} * * ${dayOfWeek}`;
      
      case 'mensal':
        const dayOfMonth = routine.dia_execucao || 1;
        return `${minutes} ${hours} ${dayOfMonth} * *`;
      
      case 'anual':
        const day = routine.dia_execucao || 1;
        return `${minutes} ${hours} ${day} 1 *`;
      
      case 'personalizada':
        return routine.cron_expression || `${minutes} ${hours} * * *`;
      
      default:
        return `${minutes} ${hours} * * *`;
    }
  }

  private async runRoutine(routine: ScheduledRoutine): Promise<void> {
    const startTime = new Date();
    let executionLog: RoutineExecutionLog | null = null;

    try {
      // Criar log de execução
      executionLog = await RoutineExecutionLog.create({
        routine_id: routine.id,
        status: 'executando',
        data_inicio: startTime,
        created_at: new Date()
      });

      // Executar a rotina baseada no tipo
      const resultado = await this.executeRoutineByType(routine);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      const statusFinal = 'success' in resultado && resultado.success === false ? 'erro' : 'sucesso';

      // Atualizar log com status correto
      await executionLog.update({
        status: statusFinal as 'sucesso' | 'erro',
        data_fim: endTime,
        duracao_ms: duration,
        resultado: resultado as Record<string, JsonValue>
      });

      // Atualizar contadores da rotina
      await routine.increment('total_execucoes');
      if (statusFinal === 'sucesso') {
        await routine.increment('execucoes_com_sucesso');
      } else {
        await routine.increment('execucoes_com_erro');
      }
      await routine.update({ ultima_execucao: endTime });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao executar rotina', {
        context: 'SchedulerService',
        action: 'runRoutine',
        rotinaId: routine.id,
        rotinaNome: routine.nome,
        error: errorMessage,
        stack: errorStack
      });

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      if (executionLog) {
        await executionLog.update({
          status: 'erro',
          data_fim: endTime,
          duracao_ms: duration,
          erro: errorMessage
        });
      }

      // Atualizar contadores da rotina
      await routine.increment(['total_execucoes', 'execucoes_com_erro']);
      await routine.update({ ultima_execucao: endTime });
    }
  }

  private async executeRoutineByType(routine: ScheduledRoutine): Promise<RoutineResult | GeracaoTitulosResult | EnvioBoletosResult | RemessaBancariaResult> {
    switch (routine.tipo) {
      case 'geracao_titulos':
        return await this.executeGeracaoTitulos(routine);
      
      case 'envio_boletos':
        return await this.executeEnvioBoletos(routine);
      
      case 'remessa_bancaria':
        return await this.executeRemessaBancaria(routine);
      
      default:
        return { message: 'Tipo de rotina não implementado' };
    }
  }

  private async executeGeracaoTitulos(_routine: ScheduledRoutine): Promise<GeracaoTitulosResult> {
    const { Contrato: ContratoModel } = await import('../models/Contrato');
    const { Titulo } = await import('../models/Titulo');
    const { Plano } = await import('../models/Plano');
    const { default: Parametros } = await import('../models/Parametros');
    
    try {
      // Buscar configuração de total de títulos
      const parametros = await Parametros.findOne();
      const quantidadeMinimaTitulos = parametros?.total_titulos_financeiro || 12;
      
      // Buscar modelo Cliente
      const { Cliente } = await import('../models/Cliente');
      
      // Buscar todos os contratos ativos
      const contratos = await ContratoModel.findAll({
        where: {
          status: 'ativo'
        },
        include: [
          {
            model: Plano,
            as: 'plano',
            attributes: ['id', 'nome_plano', 'valor_mensal']
          },
          {
            model: Cliente,
            as: 'cliente',
            attributes: ['id', 'ativo']
          }
        ]
      });

      let titulosGerados = 0;
      let contratosProcessados = 0;
      let erros = 0;

      for (const contrato of contratos) {
        try {
          // Verificar se o cliente está ativo
          const contratoWithCliente = contrato as unknown as ContratoWithCliente;
          const cliente = contratoWithCliente.cliente;
          if (!cliente || !cliente.ativo) {
            continue;
          }

          // Verificar se o contrato tem banco configurado
          if (!contrato.conta_boleto) {
            continue;
          }

          // Verificar se o contrato tem dia de vencimento
          if (!contrato.dia_vencimento_id) {
            continue;
          }

          // Buscar títulos em aberto para contar quantos precisamos gerar
          const titulosEmAberto = await Titulo.findAll({
            where: {
              contrato_id: contrato.id,
              status: ['pendente', 'vencido'], // Apenas títulos em aberto
              pago: false
            }
          });

          // Buscar TODOS os títulos (incluindo pagos) para verificar se já existe título para um mês específico
          // Isso evita gerar novo título para um mês que já teve título gerado (mesmo que tenha sido pago)
          const todosTitulos = await Titulo.findAll({
            where: {
              contrato_id: contrato.id
            }
          });

          // Verificar se precisa gerar mais títulos (baseado apenas nos títulos em aberto)
          const titulosGerar = quantidadeMinimaTitulos - titulosEmAberto.length;

          if (titulosGerar > 0) {
            // Buscar data inicial do contrato ou usar data atual
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            
            // Normalizar data de início para usar apenas a parte de data (sem hora/timezone)
            // Isso evita problemas de conversão de timezone (ex: 16/11 UTC vira 15/11 GMT-0300)
            let dataInicioContrato: Date | null = null;
            if (contrato.data_inicio) {
              const dataRaw = new Date(contrato.data_inicio);
              // Criar nova data usando apenas ano, mês e dia (timezone local)
              dataInicioContrato = new Date(dataRaw.getFullYear(), dataRaw.getMonth(), dataRaw.getDate());
              dataInicioContrato.setHours(0, 0, 0, 0);
            }
            
            const diaVencimentoConfig = await DiasVencimento.findByPk(contrato.dia_vencimento_id);
            const diaVencimento = diaVencimentoConfig?.dia || 15;

            // Começar sempre do mês atual (não do próximo mês)
            // Se data de início existe e está em um mês futuro, começar do mês da data de início
            let mesAtual: number;
            let anoAtual: number;
            
            if (dataInicioContrato && dataInicioContrato > hoje) {
              // Data de início é futura, começar do mês da data de início
              mesAtual = dataInicioContrato.getMonth();
              anoAtual = dataInicioContrato.getFullYear();
            } else {
              // Começar do mês atual
              mesAtual = hoje.getMonth();
              anoAtual = hoje.getFullYear();
            }
            
            // Usar transação para garantir que todos os títulos sejam criados ou nenhum
            await withTransaction(async (transaction: Transaction) => {
              let tentativas = 0;
              let títulosCriadosNoContrato = 0;

              while (títulosCriadosNoContrato < titulosGerar && tentativas < 100) {
              tentativas++;
              
              // Criar data de vencimento com o dia correto
              // Se o dia não existir no mês (ex: dia 31 em fevereiro), ajusta para o último dia válido
              const ultimoDiaDoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
              let diaCorreto = Math.min(diaVencimento, ultimoDiaDoMes);
              
              // Se data de início existe e estamos no mês da data de início
              if (dataInicioContrato) {
                const mesInicio = dataInicioContrato.getMonth();
                const anoInicio = dataInicioContrato.getFullYear();
                const diaInicio = dataInicioContrato.getDate();
                
                if (mesAtual === mesInicio && anoAtual === anoInicio) {
                  // No primeiro mês (mês da data de início)
                  // Se o dia de vencimento for superior ao dia de início, usar o dia de vencimento
                  // Caso contrário, usar a data de início (ou hoje se já passou)
                  if (diaVencimento > diaInicio) {
                    // Vencimento é superior à data de início, usar o dia de vencimento
                    diaCorreto = Math.min(diaVencimento, ultimoDiaDoMes);
                  } else {
                    // Vencimento é igual ou inferior à data de início
                    // Se data de início já passou mas estamos no mesmo mês, usar data atual (hoje)
                    // Caso contrário, usar a data de início
                    if (dataInicioContrato < hoje) {
                      const diaHoje = hoje.getDate();
                      diaCorreto = Math.min(diaHoje, ultimoDiaDoMes);
                    } else {
                      diaCorreto = Math.min(diaInicio, ultimoDiaDoMes);
                    }
                  }
                }
              }
              
              let dataVencimento = new Date(anoAtual, mesAtual, diaCorreto);
              dataVencimento.setHours(0, 0, 0, 0);

              // Ajustar data de vencimento baseado nos parâmetros (sábado/domingo)
              dataVencimento = await ajustarDataVencimento(dataVencimento, parametros);

              // Verificar se já existe título para este mês (incluindo pagos)
              // Se já existe título para este mês/ano (mesmo que pago), não gerar novo
              const mesAno = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}`;
              const tituloExistente = todosTitulos.find(t => {
                const dataTitulo = new Date(t.data_vencimento);
                return `${dataTitulo.getFullYear()}-${String(dataTitulo.getMonth() + 1).padStart(2, '0')}` === mesAno;
              });

              // Gerar título se:
              // 1. Não existe título para este mês
              // 2. Respeita data de início (se existir)
              // 3. Data de vencimento não passou (sempre validar, mesmo no mês atual)
              const podeGerar = !tituloExistente && 
                (!dataInicioContrato || dataVencimento >= dataInicioContrato) &&
                dataVencimento >= hoje;
              
              // Se não pode gerar, avançar para próximo mês
              if (!podeGerar) {
                mesAtual++;
                if (mesAtual > 11) {
                  mesAtual = 0;
                  anoAtual++;
                }
                continue;
              }
              
              if (podeGerar) {
                // Calcular valor do título
                const plano = (contrato as ContratoWithPlano).plano;
                
                // Usar valor_final do contrato se existir (já tem descontos aplicados)
                // Caso contrário, calcular a partir do plano aplicando descontos uma única vez
                let valorTitulo: number = Number(contrato.valor_final) || 0;
                
                if (valorTitulo <= 0 && plano?.valor_mensal) {
                  valorTitulo = Number(plano.valor_mensal);
                  
                  // Sempre usar desconto em valor quando disponível (mais preciso)
                  // Se não houver desconto em valor, calcular a partir do percentual
                  if (contrato.desconto_valor && contrato.desconto_valor > 0) {
                    valorTitulo = valorTitulo - Number(contrato.desconto_valor);
                  } else if (contrato.desconto_percentual && contrato.desconto_percentual > 0) {
                    // Calcular valor do desconto a partir do percentual
                    const descontoValor = valorTitulo * (Number(contrato.desconto_percentual) / 100);
                    valorTitulo = valorTitulo - descontoValor;
                  }
                }

                // Somar valores dos serviços adicionais ativos do contrato
                // Buscar serviços dentro da transação para garantir consistência
                const { Plano: PlanoModel } = await import('../models/Plano');
                const servicosAdicionais = await ContratoPlanoAdicional.findAll({
                  where: {
                    contrato_id: contrato.id,
                    status: 'ativo'
                  },
                  include: [
                    {
                      model: PlanoModel,
                      as: 'plano',
                      attributes: ['id', 'nome_plano', 'valor_mensal']
                    }
                  ],
                  transaction
                });

                let valorServicosAdicionais = 0;
                for (const servico of servicosAdicionais) {
                  // Usar valor_final se existir, senão calcular
                  let valorServico = Number(servico.valor_final) || 0;
                  
                  // Acessar plano através do relacionamento
                  const servicoWithPlano = servico as unknown as ContratoPlanoAdicionalWithPlano;
                  const planoAdicional = servicoWithPlano.plano;
                  
                  if (valorServico <= 0 && planoAdicional?.valor_mensal) {
                    valorServico = Number(planoAdicional.valor_mensal);
                    
                    // Aplicar descontos do serviço adicional
                    if (servico.desconto_valor && servico.desconto_valor > 0) {
                      valorServico = valorServico - Number(servico.desconto_valor);
                    } else if (servico.desconto_percentual && servico.desconto_percentual > 0) {
                      const descontoValor = valorServico * (Number(servico.desconto_percentual) / 100);
                      valorServico = valorServico - descontoValor;
                    }
                  }
                  
                  valorServicosAdicionais += Math.max(0, valorServico);
                }

                // Somar o valor do título principal com os serviços adicionais
                valorTitulo = valorTitulo + valorServicosAdicionais;

                // Garantir valor mínimo de 0.01
                valorTitulo = Math.max(0.01, valorTitulo);

                // Gerar número de título único
                const timestamp = Date.now();
                const numeroTitulo = `T${contrato.id}-${timestamp}`;

                // Criar título dentro da transação
                // dataVencimento já é um Date local, mas garantimos que está correto
                // Garantir que banco_id não seja null (já validado antes do loop, mas TypeScript precisa da verificação)
                if (!contrato.conta_boleto) {
                  throw new Error(`Contrato ${contrato.id} não possui banco configurado`);
                }
                
                const bancoId = contrato.conta_boleto; // TypeScript agora sabe que não é null
                
                // Normalizar data de vencimento para meia-noite (00:00:00) - apenas data, sem hora
                // Criar data local (GMT-3) que será salva como está no banco
                // dataVencimento já foi normalizado com setHours(0,0,0,0) na linha 499
                const dataVencimentoNormalizada = new Date(
                  dataVencimento.getFullYear(),
                  dataVencimento.getMonth(),
                  dataVencimento.getDate(),
                  0, 0, 0, 0
                );
                
                await Titulo.create({
                  contrato_id: contrato.id,
                  cliente_id: contrato.cliente_id,
                  plano_id: contrato.plano_id,
                  banco_id: bancoId,
                  valor: valorTitulo,
                  data_vencimento: dataVencimentoNormalizada as any,
                  status: 'pendente',
                  pago: false,
                  descricao: `${plano?.nome_plano || 'Mensalidade'}\n${dataVencimento.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
                  numero_titulo: numeroTitulo
                }, { transaction });

                // Incrementar métrica de título gerado se métricas estiverem habilitadas
                if (isMetricsEnabled() && metrics) {
                  metrics.businessTitulosGerados.inc();
                }

                titulosGerados++;
                títulosCriadosNoContrato++;
              }

                // Avançar para o próximo mês
                mesAtual++;
                if (mesAtual > 11) {
                  mesAtual = 0;
                  anoAtual++;
                }
              }
            });

            contratosProcessados++;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
          const errorStack = error instanceof Error ? error.stack : undefined;
          logger.error('Erro ao processar contrato na geração de títulos', {
            context: 'SchedulerService',
            action: 'gerarTitulosAutomaticos',
            contratoId: contrato.id,
            error: errorMessage,
            stack: errorStack
          });
          erros++;
        }
      }


      return {
        success: true,
        titulos_gerados: titulosGerados,
        contratos_processados: contratosProcessados,
        contratos_com_erro: erros,
        message: `Geração de títulos concluída. ${titulosGerados} títulos gerados em ${contratosProcessados} contratos.`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro na execução da rotina de geração de títulos', {
        context: 'SchedulerService',
        action: 'gerarTitulosAutomaticos',
        error: errorMessage,
        stack: errorStack
      });
      return {
        success: false,
        titulos_gerados: 0,
        contratos_processados: 0,
        contratos_com_erro: 0,
        message: `Erro ao gerar títulos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }

  private async executeEnvioBoletos(routine: ScheduledRoutine): Promise<EnvioBoletosResult> {
    try {
      const { EnvioBoletosRoutine } = await import('./routines/EnvioBoletosRoutine');
      const envioBoletosRoutine = new EnvioBoletosRoutine();
      
      // Ler configurações da rotina ou usar padrões
      const config = routine.configuracao || {};
      
      const resultado = await envioBoletosRoutine.execute(config);
      
      return {
        success: resultado.success,
        mensagens_enviadas: resultado.data.boletosEnviados,
        erros: resultado.data.erros,
        message: resultado.message
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao executar envio de boletos:', error);
      return {
        success: false,
        mensagens_enviadas: 0,
        erros: 1,
        message: `Erro ao enviar boletos: ${errorMessage}`
      };
    }
  }

  private async executeRemessaBancaria(_routine: ScheduledRoutine): Promise<RemessaBancariaResult> {
    const { Titulo: TituloModel } = await import('../models/Titulo');
    const { Banco } = await import('../models/Banco');
    const { Cliente } = await import('../models/Cliente');
    const { Plano } = await import('../models/Plano');
    const { BancoApiService } = await import('./BancoApiService');
    const { logger } = await import('../utils/logger');
    
    try {
      // Buscar títulos pendentes que ainda não foram registrados no banco (sem charge_id)
      const titulosParaRegistrar = await TituloModel.findAll({
        where: {
          status: 'pendente',
          charge_id: null // Apenas títulos que ainda não foram registrados
        },
        include: [
          {
            model: Banco,
            as: 'banco',
            required: true,
            attributes: ['id', 'nome', 'tipo_banco', 'codigo', 'sandbox', 'client_id_producao', 'client_secret_producao', 'url_retorno', 'percentual_multa', 'percentual_juros']
          },
          {
            model: Cliente,
            as: 'cliente',
            required: true,
            attributes: ['id', 'razao_social', 'cnpj', 'telefone', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado', 'cep']
          },
          {
            model: Plano,
            as: 'plano',
            required: true,
            attributes: ['id', 'nome_plano']
          }
        ],
        limit: 100 // Processar até 100 títulos por execução para não sobrecarregar
      });

      let registrados = 0;
      let erros = 0;
      const detalhes: RemessaBancariaDetalhe[] = [];

      for (const titulo of titulosParaRegistrar) {
        try {
          const tituloCompleto = titulo as Parameters<typeof BancoApiService.gerarTitulo>[0];
          
          // Registrar título no banco
          const resultado = await BancoApiService.gerarTitulo(tituloCompleto);
          
          if (resultado.success && resultado.data) {
            registrados++;

            const dados = resultado.data;
            const chargeId = typeof dados.charge_id === 'string' ? dados.charge_id : undefined;
            let codigoBarrasFinal = typeof dados.codigo_barras === 'string' ? dados.codigo_barras : null;

            // Log para debug - verificar se cada título está recebendo código diferente
            logger.info('Dados retornados pela API do banco', {
              titulo_id: titulo.id,
              numero_titulo: titulo.numero_titulo,
              charge_id: chargeId,
              codigo_barras_recebido: codigoBarrasFinal,
              codigo_barras_atual: titulo.codigo_barras
            });

            if (codigoBarrasFinal && !BarcodeService.validarCodigoBarrasFebraban(codigoBarrasFinal)) {
              logger.warn('Código de barras retornado pelo banco está fora do padrão FEBRABAN', {
                titulo_id: titulo.id,
                banco: tituloCompleto.banco?.nome,
                codigo_barras: codigoBarrasFinal
              });
            }

            // IMPORTANTE: Se codigoBarrasFinal for null, NÃO usar o valor anterior do título
            // Isso evita que um código de barras seja copiado para outro título
            const codigoBarrasParaSalvar = codigoBarrasFinal !== null ? codigoBarrasFinal : null;

            await titulo.update({
              charge_id: chargeId ?? titulo.charge_id,
              url_boleto: typeof dados.url_boleto === 'string' ? dados.url_boleto : titulo.url_boleto,
              qrcode: typeof dados.qrcode === 'string' ? dados.qrcode : titulo.qrcode,
              qrcode_image: typeof dados.qrcode_image === 'string' ? dados.qrcode_image : titulo.qrcode_image,
              codigo_barras: codigoBarrasParaSalvar,
              linha_digitavel: typeof dados.linha_digitavel === 'string' ? dados.linha_digitavel : titulo.linha_digitavel,
              nosso_numero: typeof dados.nosso_numero === 'string' ? dados.nosso_numero : titulo.nosso_numero
            });

            // Log após atualização para confirmar
            logger.info('Título atualizado com código de barras', {
              titulo_id: titulo.id,
              numero_titulo: titulo.numero_titulo,
              codigo_barras_salvo: codigoBarrasParaSalvar
            });

            detalhes.push({
              titulo_id: titulo.id,
              banco: tituloCompleto.banco?.nome,
              status: 'sucesso',
              message: 'Título registrado no banco',
              charge_id: chargeId
            });
          } else {
            erros++;
            
            detalhes.push({
              titulo_id: titulo.id,
              banco: tituloCompleto.banco?.nome,
              status: 'erro',
              message: resultado.message || 'Erro desconhecido ao registrar título'
            });
          }
        } catch (error) {
          erros++;
          const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
          const errorStack = error instanceof Error ? error.stack : undefined;
          logger.error('Erro ao processar título na recriação de boletos', {
            context: 'SchedulerService',
            action: 'recriarBoletos',
            tituloId: titulo.id,
            error: errorMsg,
            stack: errorStack
          });
          
          const tituloComBanco = titulo as InstanceType<typeof TituloModel> & TituloWithRelations;
          detalhes.push({
            titulo_id: titulo.id,
            banco: tituloComBanco.banco?.nome,
            status: 'erro',
            message: errorMsg
          });
        }
      }


      return {
        titulos_registrados: registrados,
        titulos_erro: erros,
        total_processados: titulosParaRegistrar.length,
        detalhes
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao executar remessa bancária', { error: errorMsg });
      return {
        titulos_registrados: 0,
        titulos_erro: 0,
        total_processados: 0,
        detalhes: [],
        message: `Erro ao executar remessa bancária: ${errorMsg}`
      };
    }
  }

  public async createRoutine(data: {
    nome: string;
    tipo: 'geracao_titulos' | 'envio_boletos' | 'remessa_bancaria' | 'verificar_vencimentos' | 'outros';
    descricao?: string;
    configuracao: Record<string, JsonValue>;
    frequencia: 'diaria' | 'semanal' | 'mensal' | 'anual' | 'personalizada';
    dia_execucao?: number;
    hora_execucao: string;
    dia_semana?: number;
    cron_expression?: string;
  }): Promise<ScheduledRoutine> {
    const routine = await ScheduledRoutine.create({
      ...data,
      ativo: true,
      proxima_execucao: this.calculateNextExecution(data)
    });

    return routine;
  }

  public async updateRoutine(id: number, data: Partial<ScheduledRoutine>): Promise<ScheduledRoutine> {
    const routine = await ScheduledRoutine.findByPk(id);
    if (!routine) {
      throw new Error('Rotina não encontrada');
    }

    if (data.hora_execucao !== undefined || data.frequencia !== undefined || 
        data.dia_execucao !== undefined || data.dia_semana !== undefined) {
      const updatedData = { ...routine.get({ plain: true }), ...data };
      data.proxima_execucao = this.calculateNextExecution(updatedData);
    }

    await routine.update(data);
    
    if (routine.ativo) {
      await this.scheduleRoutine(routine);
    } else {
      this.unscheduleRoutine(id);
    }

    return routine;
  }

  public async deleteRoutine(id: number): Promise<void> {
    const routine = await ScheduledRoutine.findByPk(id);
    if (!routine) {
      throw new Error('Rotina não encontrada');
    }

    this.unscheduleRoutine(id);
    await routine.destroy();
  }

  public async toggleRoutine(id: number, ativo: boolean): Promise<ScheduledRoutine> {
    const routine = await ScheduledRoutine.findByPk(id);
    if (!routine) {
      throw new Error('Rotina não encontrada');
    }

    await routine.update({ ativo });

    if (ativo) {
      await this.scheduleRoutine(routine);
    } else {
      this.unscheduleRoutine(id);
    }

    return routine;
  }

  public async executeRoutineManually(id: number): Promise<{ message: string }> {
    const routine = await ScheduledRoutine.findByPk(id);
    if (!routine) {
      throw new Error('Rotina não encontrada');
    }

    // Executar em background sem aguardar
    this.runRoutine(routine).catch((error) => {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao executar rotina em background', {
        context: 'SchedulerService',
        action: 'executeRoutineManually',
        rotinaId: id,
        error: errorMessage,
        stack: errorStack
      });
    });
    
    return { message: 'Rotina iniciada em background' };
  }


  private calculateNextExecution(routine: Pick<ScheduledRoutine, 'hora_execucao' | 'frequencia'>): Date {
    const now = new Date();
    const [hours, minutes] = routine.hora_execucao.split(':');
    
    const nextExecution = new Date();
    nextExecution.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    // Se já passou hoje, agendar para o próximo período baseado na frequência
    if (nextExecution <= now) {
      const _oldDate = nextExecution.getDate();
      const _oldMonth = nextExecution.getMonth();
      const _oldYear = nextExecution.getFullYear();
      
      switch (routine.frequencia) {
        case 'diaria':
          nextExecution.setDate(nextExecution.getDate() + 1);
          break;
        case 'semanal':
          nextExecution.setDate(nextExecution.getDate() + 7);
          break;
        case 'mensal':
          nextExecution.setMonth(nextExecution.getMonth() + 1);
          break;
        case 'anual':
          nextExecution.setFullYear(nextExecution.getFullYear() + 1);
          break;
        default:
          nextExecution.setDate(nextExecution.getDate() + 1);
      }
    }

    return nextExecution;
  }

  /**
   * Normaliza uma data para o início do dia e a formata como string 'YYYY-MM-DD 00:00:00'.
   * @param date - A data a ser normalizada.
   * @returns A data formatada como string.
   */
  private async normalizeDateToString(date: Date): Promise<string> {
    // 1. Aplica regra de ajuste de vencimento (sábado/domingo)
    const dataAjustada = await ajustarDataVencimento(date);

    // 2. Formata para string YYYY-MM-DD HH:mm:ss
    const year = dataAjustada.getFullYear();
    const month = String(dataAjustada.getMonth() + 1).padStart(2, '0');
    const day = String(dataAjustada.getDate()).padStart(2, '0');

    return `${year}-${month}-${day} 00:00:00`;
  }

  public getStatus(): SchedulerStatus {
    return {
      isRunning: this.isRunning,
      activeJobs: this.cronJobs.size,
      scheduledRoutines: Array.from(this.cronJobs.keys())
    };
  }

  public async getAllRoutines(): Promise<ScheduledRoutine[]> {
    return await ScheduledRoutine.findAll({
      include: [{
        model: RoutineExecutionLog,
        as: 'executionLogs',
        limit: 5,
        order: [['created_at', 'DESC']]
      }]
    });
  }

  public async getRoutineById(id: number): Promise<ScheduledRoutine | null> {
    return await ScheduledRoutine.findByPk(id, {
      include: [{
        model: RoutineExecutionLog,
        as: 'executionLogs',
        limit: 10,
        order: [['created_at', 'DESC']]
      }]
    });
  }

  public getWorkersStatus(): WorkersStatus {
    return {
      totalWorkers: this.cronJobs.size,
      activeWorkers: this.cronJobs.size,
      workers: Array.from(this.cronJobs.keys()).map(id => ({
        id,
        status: 'active',
        lastActivity: new Date()
      }))
    };
  }

  public getHealthStatus(): HealthStatus {
    return {
      status: this.isRunning ? 'healthy' : 'stopped',
      isRunning: this.isRunning,
      activeJobs: this.cronJobs.size,
      uptime: process.uptime()
    };
  }

  public getDetailedStats(): DetailedStats {
    return {
      scheduler: {
        isRunning: this.isRunning,
        activeJobs: this.cronJobs.size,
        uptime: process.uptime()
      },
      system: {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        uptime: process.uptime()
      }
    };
  }

  public async getExecutionLogs(routineId?: number): Promise<RoutineExecutionLogWithRoutine[]> {
    const where: { routine_id?: number } = {};
    if (routineId) {
      where.routine_id = routineId;
    }

    try {
      const logs = await RoutineExecutionLog.findAll({
        where,
        include: [{
          model: ScheduledRoutine,
          as: 'routine',
          attributes: ['nome', 'tipo']
        }],
        order: [['created_at', 'DESC']],
        limit: 100
      });

      return logs;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao buscar logs', {
        context: 'SchedulerService',
        action: 'getExecutionLogs',
        rotinaId: routineId,
        error: errorMessage,
        stack: errorStack
      });
      throw error;
    }
  }

  public async getRecentExecutionLogs(limit = 10): Promise<RoutineExecutionLogWithRoutine[]> {
    return await RoutineExecutionLog.findAll({
      include: [{
        model: ScheduledRoutine,
        as: 'routine',
        attributes: ['nome', 'tipo']
      }],
      order: [['created_at', 'DESC']],
      limit
    });
  }
}

export default SchedulerService;