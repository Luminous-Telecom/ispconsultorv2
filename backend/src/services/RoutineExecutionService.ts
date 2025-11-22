import { ScheduledRoutine } from '../models';
import { DiasVencimento } from '../models/DiasVencimento';
import { ContratoPlanoAdicional } from '../models/ContratoPlanoAdicional';
import { logger } from '../utils/logger';
import { BarcodeService } from './BarcodeService';
import { ajustarDataVencimento } from '../utils/dateUtils';
import { withTransaction } from '../utils/transaction';
import { metrics, isMetricsEnabled } from '../utils/metrics';
import type { Transaction } from 'sequelize';
import type Parametros from '../models/Parametros';
import type {
  RoutineExecutionResult,
  GeracaoTitulosResult,
  EnvioBoletosResult,
  RemessaBancariaResult
} from '../types/scheduler';

/**
 * Interfaces auxiliares para tipagem
 */
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

interface ContratoPlanoAdicionalWithPlano extends ContratoPlanoAdicional {
  plano?: {
    id: number;
    nome_plano?: string;
    valor_mensal: number;
  };
}

interface TituloWithRelations {
  banco?: {
    nome?: string;
  };
}

/**
 * Serviço responsável por executar a lógica de negócio pesada
 * quando uma rotina é disparada.
 * 
 * @class RoutineExecutionService
 */
export class RoutineExecutionService {
  /**
   * Executa uma rotina baseada no seu tipo
   * @param routine - Rotina a ser executada
   * @returns Resultado da execução
   */
  public async executeRoutineByType(
    routine: ScheduledRoutine
  ): Promise<RoutineExecutionResult> {
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

  /**
   * Executa a rotina de geração de títulos
   * @param _routine - Rotina (não utilizado, mas mantido para compatibilidade)
   * @returns Resultado da geração de títulos
   */
  public async executeGeracaoTitulos(_routine: ScheduledRoutine): Promise<GeracaoTitulosResult> {
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
          // Validar contrato para geração de títulos
          const contratoWithCliente = contrato as unknown as ContratoWithCliente;
          if (!this.validateContratoForTituloGeneration(contratoWithCliente)) {
            continue;
          }

          // Após validação, sabemos que dia_vencimento_id e conta_boleto não são null
          const contratoValidado = contratoWithCliente as ContratoWithCliente & {
            dia_vencimento_id: number;
            conta_boleto: number;
          };

          // Buscar títulos em aberto para contar quantos precisamos gerar
          const titulosEmAberto = await Titulo.findAll({
            where: {
              contrato_id: contratoValidado.id,
              status: ['pendente', 'vencido'], // Apenas títulos em aberto
              pago: false
            }
          });

          // Buscar TODOS os títulos (incluindo pagos) para verificar se já existe título para um mês específico
          // Isso evita gerar novo título para um mês que já teve título gerado (mesmo que tenha sido pago)
          const todosTitulos = await Titulo.findAll({
            where: {
              contrato_id: contratoValidado.id
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
            if (contratoValidado.data_inicio) {
              const dataRaw = new Date(contratoValidado.data_inicio);
              // Criar nova data usando apenas ano, mês e dia (timezone local)
              dataInicioContrato = new Date(dataRaw.getFullYear(), dataRaw.getMonth(), dataRaw.getDate());
              dataInicioContrato.setHours(0, 0, 0, 0);
            }
            
            // Buscar configuração de dia de vencimento (já validado que não é null)
            const diaVencimentoConfig = await DiasVencimento.findByPk(contratoValidado.dia_vencimento_id);
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
                
                // Calcular data de vencimento para o mês atual
                const dataVencimento = await this.calculateDataVencimento(
                  anoAtual,
                  mesAtual,
                  diaVencimento,
                  dataInicioContrato,
                  hoje,
                  parametros
                );

                // Verificar se já existe título para este mês (incluindo pagos)
                // Se já existe título para este mês/ano (mesmo que pago), não gerar novo
                const tituloExistente = this.hasTituloForMonth(todosTitulos, anoAtual, mesAtual);

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
                  // Calcular valor do título incluindo serviços adicionais
                  const contratoWithPlano = contratoValidado as unknown as ContratoWithPlano;
                  const valorTitulo = await this.calculateValorTitulo(
                    contratoWithPlano,
                    transaction
                  );
                  
                  const plano = contratoWithPlano.plano;

                  // Gerar número de título único
                  const timestamp = Date.now();
                  const numeroTitulo = `T${contratoValidado.id}-${timestamp}`;

                  // Criar título dentro da transação
                  // dataVencimento já é um Date local, mas garantimos que está correto
                  // banco_id já foi validado antes do loop
                  const bancoId = contratoValidado.conta_boleto;
                  
                  // Normalizar data de vencimento para meia-noite (00:00:00) - apenas data, sem hora
                  // Criar data local (GMT-3) que será salva como está no banco
                  // dataVencimento já foi normalizado com setHours(0,0,0,0) na linha anterior
                  const dataVencimentoNormalizada = new Date(
                    dataVencimento.getFullYear(),
                    dataVencimento.getMonth(),
                    dataVencimento.getDate(),
                    0, 0, 0, 0
                  );
                  
                  await Titulo.create({
                    contrato_id: contratoValidado.id,
                    cliente_id: contratoValidado.cliente_id,
                    plano_id: contratoValidado.plano_id,
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
            context: 'RoutineExecutionService',
            action: 'executeGeracaoTitulos',
            contratoId: (contrato as any).id,
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
        context: 'RoutineExecutionService',
        action: 'executeGeracaoTitulos',
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

  /**
   * Valida se um contrato pode gerar títulos
   * @param contrato - Contrato a ser validado
   * @returns true se pode gerar títulos, false caso contrário
   */
  private validateContratoForTituloGeneration(contrato: ContratoWithCliente): boolean {
    // Verificar se o cliente está ativo
    const cliente = contrato.cliente;
    if (!cliente || !cliente.ativo) {
      return false;
    }

    // Verificar se o contrato tem banco configurado
    if (!contrato.conta_boleto) {
      return false;
    }

    // Verificar se o contrato tem dia de vencimento
    if (!contrato.dia_vencimento_id) {
      return false;
    }

    return true;
  }

  /**
   * Calcula a data de vencimento para um mês específico
   * @param ano - Ano
   * @param mes - Mês (0-11)
   * @param diaVencimento - Dia de vencimento configurado
   * @param dataInicioContrato - Data de início do contrato (opcional)
   * @param hoje - Data atual
   * @param parametros - Parâmetros do sistema
   * @returns Data de vencimento calculada e ajustada
   */
  private async calculateDataVencimento(
    ano: number,
    mes: number,
    diaVencimento: number,
    dataInicioContrato: Date | null,
    hoje: Date,
    parametros: Parametros | null
  ): Promise<Date> {
    // Criar data de vencimento com o dia correto
    // Se o dia não existir no mês (ex: dia 31 em fevereiro), ajusta para o último dia válido
    const ultimoDiaDoMes = new Date(ano, mes + 1, 0).getDate();
    let diaCorreto = Math.min(diaVencimento, ultimoDiaDoMes);
    
    // Se data de início existe e estamos no mês da data de início
    if (dataInicioContrato) {
      const mesInicio = dataInicioContrato.getMonth();
      const anoInicio = dataInicioContrato.getFullYear();
      const diaInicio = dataInicioContrato.getDate();
      
      if (mes === mesInicio && ano === anoInicio) {
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
    
    let dataVencimento = new Date(ano, mes, diaCorreto);
    dataVencimento.setHours(0, 0, 0, 0);

    // Ajustar data de vencimento baseado nos parâmetros (sábado/domingo)
    dataVencimento = await ajustarDataVencimento(dataVencimento, parametros);

    return dataVencimento;
  }

  /**
   * Calcula o valor do título incluindo serviços adicionais
   * @param contrato - Contrato com plano
   * @param transaction - Transação do banco de dados
   * @returns Valor total do título
   */
  private async calculateValorTitulo(
    contrato: ContratoWithPlano,
    transaction: Transaction
  ): Promise<number> {
    const plano = contrato.plano;
    
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

    return valorTitulo;
  }

  /**
   * Verifica se já existe título para um mês/ano específico
   * @param todosTitulos - Lista de todos os títulos do contrato
   * @param ano - Ano
   * @param mes - Mês (0-11)
   * @returns true se existe título para o mês, false caso contrário
   */
  private hasTituloForMonth(
    todosTitulos: Array<{ data_vencimento: Date }>,
    ano: number,
    mes: number
  ): boolean {
    const mesAno = `${ano}-${String(mes + 1).padStart(2, '0')}`;
    return todosTitulos.some(t => {
      const dataTitulo = new Date(t.data_vencimento);
      return `${dataTitulo.getFullYear()}-${String(dataTitulo.getMonth() + 1).padStart(2, '0')}` === mesAno;
    });
  }

  /**
   * Executa a rotina de envio de boletos
   * @param routine - Rotina com configurações
   * @returns Resultado do envio de boletos
   */
  public async executeEnvioBoletos(routine: ScheduledRoutine): Promise<EnvioBoletosResult> {
    try {
      const { EnvioBoletosRoutine } = await import('./routines/EnvioBoletosRoutine');
      const envioBoletosRoutine = new EnvioBoletosRoutine();
      
      // Ler configurações da rotina ou usar padrões
      const config = routine.configuracao || {};
      
      const resultado = await envioBoletosRoutine.execute(config);
      
      return {
        success: resultado.success,
        mensagens_enviadas: resultado.data?.boletosEnviados || 0,
        erros: resultado.data?.erros || 0,
        message: resultado.message
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao executar envio de boletos', {
        context: 'RoutineExecutionService',
        action: 'executeEnvioBoletos',
        error: errorMessage
      });
      return {
        success: false,
        mensagens_enviadas: 0,
        erros: 1,
        message: `Erro ao enviar boletos: ${errorMessage}`
      };
    }
  }

  /**
   * Executa a rotina de remessa bancária
   * @param _routine - Rotina (não utilizado, mas mantido para compatibilidade)
   * @returns Resultado da remessa bancária
   */
  public async executeRemessaBancaria(_routine: ScheduledRoutine): Promise<RemessaBancariaResult> {
    const { Titulo: TituloModel } = await import('../models/Titulo');
    const { Banco } = await import('../models/Banco');
    const { Cliente } = await import('../models/Cliente');
    const { Plano } = await import('../models/Plano');
    const { BancoApiService } = await import('./BancoApiService');
    
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
      const detalhes: RemessaBancariaResult['detalhes'] = [];

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
          logger.error('Erro ao processar título na remessa bancária', {
            context: 'RoutineExecutionService',
            action: 'executeRemessaBancaria',
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
      logger.error('Erro ao executar remessa bancária', {
        context: 'RoutineExecutionService',
        action: 'executeRemessaBancaria',
        error: errorMsg
      });
      return {
        titulos_registrados: 0,
        titulos_erro: 0,
        total_processados: 0,
        detalhes: [],
        message: `Erro ao executar remessa bancária: ${errorMsg}`
      };
    }
  }
}

export default RoutineExecutionService;

