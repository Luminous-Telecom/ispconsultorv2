import { ScheduledRoutine } from '../../../models/sistema/ScheduledRoutine';
import { ContratoPlanoAdicional } from '../../../models/contratos/ContratoPlanoAdicional';
import { logger } from '../../../utils/logger';
import { BarcodeService } from '../../bancos/BarcodeService';
import { TituloGenerationHelper } from './helpers/TituloGenerationHelper';
import { ContratoDataLoader } from './helpers/ContratoDataLoader';
import { ContratoTituloProcessor } from './helpers/ContratoTituloProcessor';
import type {
  RoutineExecutionResult,
  GeracaoTitulosResult,
  EnvioBoletosResult,
  RemessaBancariaResult
} from '../../../types/scheduler';

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
    logger.info('RoutineExecutionService.executeRoutine - Selecionando tipo de rotina', {
      context: 'RoutineExecutionService',
      routineTipo: routine.tipo,
      routineId: routine.id,
      routineNome: routine.nome
    });

    switch (routine.tipo) {
      case 'geracao_titulos':
        logger.info('RoutineExecutionService.executeRoutine - Executando geração de títulos', {
          context: 'RoutineExecutionService',
          routineId: routine.id
        });
        return await this.executeGeracaoTitulos(routine);

      case 'envio_boletos':
        logger.info('RoutineExecutionService.executeRoutine - Executando envio de boletos', {
          context: 'RoutineExecutionService',
          routineId: routine.id
        });
        return await this.executeEnvioBoletos(routine);

      case 'remessa_bancaria':
        logger.info('RoutineExecutionService.executeRoutine - Executando remessa bancária', {
          context: 'RoutineExecutionService',
          routineId: routine.id
        });
        return await this.executeRemessaBancaria(routine);

      default:
        logger.warn('RoutineExecutionService.executeRoutine - Tipo de rotina não implementado', {
          context: 'RoutineExecutionService',
          routineTipo: routine.tipo,
          routineId: routine.id
        });
        return { message: 'Tipo de rotina não implementado' };
    }
  }

  /**
   * Executa a rotina de geração de títulos
   * @param _routine - Rotina (não utilizado, mas mantido para compatibilidade)
   * @returns Resultado da geração de títulos
   */
  public async executeGeracaoTitulos(_routine: ScheduledRoutine): Promise<GeracaoTitulosResult> {
    const { Contrato: ContratoModel } = await import('../../../models/contratos/Contrato');
    const { Titulo } = await import('../../../models/financeiro/Titulo');
    const { Plano } = await import('../../../models/cadastros/Plano');
    const { default: Parametros } = await import('../../../models/sistema/Parametros');
    
    try {
      // Buscar configuração de total de títulos
      const parametros = await Parametros.findOne();
      const quantidadeMinimaTitulos = parametros?.total_titulos_financeiro || 12;
      
      // Buscar modelo Cliente
      const { Cliente } = await import('../../../models/clientes/Cliente');
      
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

      // Buscar e agrupar dados relacionados (otimização N+1)
      const contratoIds = contratos.map((c: typeof contratos[0]) => c.id);
      const diaVencimentoIds = contratos
        .map((c: typeof contratos[0]) => (c as unknown as ContratoWithCliente).dia_vencimento_id)
        .filter((id: number | null | undefined): id is number => id !== null && id !== undefined);

      const { titulosEmAbertoTodos, todosTitulosTodos, diasVencimentoTodos, servicosAdicionaisTodos } = 
        await ContratoDataLoader.loadRelatedData(contratoIds, diaVencimentoIds);

      const { 
        titulosEmAbertoPorContrato, 
        todosTitulosPorContrato, 
        diasVencimentoPorId, 
        servicosAdicionaisPorContrato 
      } = ContratoDataLoader.groupDataByContrato(
        titulosEmAbertoTodos,
        todosTitulosTodos,
        diasVencimentoTodos,
        servicosAdicionaisTodos
      );

      let titulosGerados = 0;
      let contratosProcessados = 0;
      let erros = 0;

          for (const contrato of contratos) {
        try {
          const contratoWithCliente = contrato as unknown as ContratoWithCliente;
          if (!TituloGenerationHelper.validateContrato(contratoWithCliente)) {
            continue;
          }

          const contratoValidado = contratoWithCliente as ContratoWithCliente & {
            dia_vencimento_id: number;
            conta_boleto: number;
          };

          const titulosEmAberto = titulosEmAbertoPorContrato.get(contratoValidado.id) || [];
          const todosTitulos = todosTitulosPorContrato.get(contratoValidado.id) || [];
          const diaVencimentoConfig = diasVencimentoPorId.get(contratoValidado.dia_vencimento_id);
          const diaVencimento = (diaVencimentoConfig && 'dia' in diaVencimentoConfig && typeof diaVencimentoConfig.dia === 'number') 
            ? diaVencimentoConfig.dia 
            : 15;
          const servicosAdicionais = (servicosAdicionaisPorContrato.get(contratoValidado.id) || []) as Array<ContratoPlanoAdicionalWithPlano>;

          const contratoWithPlano = contratoValidado as unknown as ContratoWithPlano;
          const resultado = await ContratoTituloProcessor.processContrato(
            contratoWithPlano as ContratoWithPlano & { conta_boleto: number; dia_vencimento_id: number },
            titulosEmAberto,
            todosTitulos,
            diaVencimento,
            quantidadeMinimaTitulos,
            parametros,
            servicosAdicionais
          );

          titulosGerados += resultado.titulosGerados;
          if (resultado.titulosGerados > 0) {
            contratosProcessados++;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
          const contratoWithCliente = contrato as unknown as ContratoWithCliente;
          
          logger.error('Erro ao processar contrato na geração de títulos', {
            context: 'RoutineExecutionService',
            contratoId: contrato.id,
            clienteId: contratoWithCliente.cliente_id,
            error: errorMessage
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
   * Executa a rotina de envio de boletos
   * @param routine - Rotina com configurações
   * @returns Resultado do envio de boletos
   */
  public async executeEnvioBoletos(routine: ScheduledRoutine): Promise<EnvioBoletosResult> {
    logger.info('RoutineExecutionService.executeEnvioBoletos - Iniciando execução', {
      context: 'RoutineExecutionService',
      routineId: routine.id,
      routineNome: routine.nome,
      routineTipo: routine.tipo,
      routineAtiva: routine.ativo,
      rotinaConfiguracao: JSON.stringify(routine.configuracao)
    });

    try {
      logger.info('RoutineExecutionService.executeEnvioBoletos - Fazendo import da rotina', {
        context: 'RoutineExecutionService',
        routineId: routine.id
      });

      const { EnvioBoletosRoutine } = await import('../routines/EnvioBoletosRoutine');

      logger.info('RoutineExecutionService.executeEnvioBoletos - Criando instância da rotina', {
        context: 'RoutineExecutionService',
        routineId: routine.id
      });

      const envioBoletosRoutine = new EnvioBoletosRoutine();

      // Ler configurações da rotina ou usar padrões
      const config = routine.configuracao || {};

      logger.info('RoutineExecutionService.executeEnvioBoletos - Executando rotina', {
        context: 'RoutineExecutionService',
        routineId: routine.id,
        config: JSON.stringify(config)
      });

      const resultado = await envioBoletosRoutine.execute(config);

      logger.info('RoutineExecutionService.executeEnvioBoletos - Rotina executada com sucesso', {
        context: 'RoutineExecutionService',
        routineId: routine.id,
        resultado: JSON.stringify(resultado)
      });

      return {
        success: resultado.success,
        mensagens_enviadas: resultado.data?.boletosEnviados || 0,
        erros: resultado.data?.erros || 0,
        message: resultado.message
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;

      logger.error('RoutineExecutionService.executeEnvioBoletos - ERRO GERAL NA EXECUÇÃO', {
        context: 'RoutineExecutionService',
        action: 'executeEnvioBoletos',
        routineId: routine.id,
        routineNome: routine.nome,
        error: errorMessage,
        stack: errorStack,
        routineConfiguracao: JSON.stringify(routine.configuracao)
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
    const { Titulo: TituloModel } = await import('../../../models/financeiro/Titulo');
    const { Banco } = await import('../../../models/cadastros/Banco');
    const { Cliente } = await import('../../../models/clientes/Cliente');
    const { Plano } = await import('../../../models/cadastros/Plano');
          const { BancoApiService } = await import('../../bancos/BancoApiService');
    
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
          const tituloCompleto = titulo as unknown as Parameters<typeof BancoApiService.gerarTitulo>[0];
          
          // Registrar título no banco
          const resultado = await BancoApiService.gerarTitulo(tituloCompleto);
          
          if (resultado.success && resultado.data) {
            registrados++;

            const dados = resultado.data;
            const chargeId = typeof dados.charge_id === 'string' ? dados.charge_id : undefined;
            const codigoBarrasFinal = typeof dados.codigo_barras === 'string' ? dados.codigo_barras : null;

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

