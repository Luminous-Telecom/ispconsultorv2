import { ScheduledRoutine } from '../../../models/sistema/ScheduledRoutine';
import SaasScheduledRoutine from '../../../models/saas/SaasScheduledRoutine';
import { ContratoPlanoAdicional } from '../../../models/contratos/ContratoPlanoAdicional';
import { logger } from '../../../utils/logger';
import { BarcodeService } from '../../bancos/BarcodeService';
import { TituloGenerationHelper } from './helpers/TituloGenerationHelper';
import { ContratoDataLoader } from './helpers/ContratoDataLoader';
import { ContratoTituloProcessor } from './helpers/ContratoTituloProcessor';
import type { SaasContratoWithPlano } from './helpers/SaasContratoTituloProcessor';
import type {
  RoutineExecutionResult,
  GeracaoTitulosResult,
  EnvioBoletosResult,
  RemessaBancariaResult
} from '../../../types/scheduler';
import type { RoutineResult } from '../../../interfaces/IRoutine';

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
  tipo_cobranca_contrato_id?: number | null;
  plano?: {
    valor_mensal: number;
    nome_plano?: string;
    periodicidade?: string | null;
  };
  tipoCobrancaContrato?: {
    quantidade_titulos: number;
    periodicidade: string;
  } | null;
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
type AnyRoutine = ScheduledRoutine | SaasScheduledRoutine;

function isSaasRoutine(routine: AnyRoutine): routine is SaasScheduledRoutine {
  return routine instanceof SaasScheduledRoutine;
}

export class RoutineExecutionService {
  /**
   * Executa uma rotina baseada no seu tipo (ERP ou SaaS)
   * @param routine - Rotina a ser executada
   * @returns Resultado da execução
   */
  public async executeRoutineByType(
    routine: AnyRoutine
  ): Promise<RoutineExecutionResult> {
    const saas = isSaasRoutine(routine);

    if (saas && !['geracao_titulos', 'envio_boletos', 'remessa_bancaria', 'bloquear_saas_atraso'].includes(routine.tipo)) {
      logger.warn('RoutineExecutionService - Tipo não suportado no SaaS', {
        context: 'RoutineExecutionService',
        tipo: routine.tipo,
        routineId: routine.id
      });
      return { success: false, message: `Tipo de rotina não suportado no SaaS: ${routine.tipo}` };
    }

    switch (routine.tipo) {
      case 'geracao_titulos':
        logger.info('RoutineExecutionService.executeRoutine - Executando geração de títulos', {
          context: 'RoutineExecutionService',
          routineId: routine.id,
          saas
        });
        if (saas) {
          return await this.executeGeracaoTitulosSaas(routine as SaasScheduledRoutine);
        }
        return await this.executeGeracaoTitulos(routine as ScheduledRoutine);

      case 'envio_boletos':
        logger.info('RoutineExecutionService.executeRoutine - Executando envio de boletos', {
          context: 'RoutineExecutionService',
          routineId: routine.id,
          saas
        });
        return await this.executeEnvioBoletos(routine, saas);

      case 'remessa_bancaria':
        logger.info('RoutineExecutionService.executeRoutine - Executando remessa bancária', {
          context: 'RoutineExecutionService',
          routineId: routine.id,
          saas
        });
        if (saas) {
          return await this.executeRemessaBancariaSaas(routine as SaasScheduledRoutine);
        }
        return await this.executeRemessaBancaria(routine);

      case 'desbloquear_blockdomi':
        if (saas) return { success: false, message: 'Tipo não suportado no SaaS' };
        return await this.executeDesbloquearBlockdomi(routine as ScheduledRoutine);

      case 'bloquear_saas_atraso':
        if (!saas) return { success: false, message: 'Tipo exclusivo do SaaS' };
        return await this.executeBloquearSaasAtraso();

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
  public async executeGeracaoTitulos(routine: ScheduledRoutine): Promise<GeracaoTitulosResult> {
    const { Contrato: ContratoModel } = await import('../../../models/contratos/Contrato');
    const { Titulo } = await import('../../../models/financeiro/Titulo');
    const { Plano } = await import('../../../models/cadastros/Plano');
    const { default: Parametros } = await import('../../../models/sistema/Parametros');
    
    try {
      const parametros = await Parametros.findOne();
      const quantidadeMinimaTitulos = 12;
      
      // Buscar modelo Cliente e TipoCobrancaContrato
      const { Cliente } = await import('../../../models/clientes/Cliente');
      const { TipoCobrancaContrato } = await import('../../../models/cadastros/TipoCobrancaContrato');
      
      const whereContrato: Record<string, unknown> = { status: 'ativo' };
      if (routine.empresa_id != null) {
        whereContrato.empresa_id = routine.empresa_id;
      }
      
      // Buscar todos os contratos ativos
      const contratos = await ContratoModel.findAll({
        where: whereContrato,
        include: [
          {
            model: Plano,
            as: 'plano',
            attributes: ['id', 'nome_plano', 'valor_mensal', 'periodicidade']
          },
          {
            model: Cliente,
            as: 'cliente',
            attributes: ['id', 'ativo']
          },
          {
            model: TipoCobrancaContrato,
            as: 'tipoCobrancaContrato',
            attributes: ['id', 'quantidade_titulos', 'periodicidade'],
            required: false
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

      // Log resumo: contratos por cliente e quais têm taxa isenta (para debug: cliente com 2 contratos e 1 isento)
      const contratosPorCliente = new Map<number, Array<{ id: number; isento_mensalidade: boolean }>>();
      for (const c of contratos) {
        const contratoAny = c as unknown as { id: number; cliente_id: number; isento_mensalidade?: boolean };
        const clienteId = contratoAny.cliente_id;
        if (!contratosPorCliente.has(clienteId)) {
          contratosPorCliente.set(clienteId, []);
        }
        contratosPorCliente.get(clienteId)!.push({
          id: contratoAny.id,
          isento_mensalidade: contratoAny.isento_mensalidade === true
        });
      }
      logger.info('RoutineExecutionService.executeGeracaoTitulos - Contratos ativos carregados', {
        totalContratos: contratos.length,
        totalClientesComContrato: contratosPorCliente.size,
        clientesComMaisDeUmContrato: [...contratosPorCliente.entries()]
          .filter(([, list]) => list.length > 1)
          .map(([clienteId, list]) => ({
            cliente_id: clienteId,
            contratos: list,
            algumIsento: list.some(x => x.isento_mensalidade)
          }))
      });

      let titulosGerados = 0;
      let contratosProcessados = 0;
      let erros = 0;

      for (const contrato of contratos) {
        try {
          const contratoWithCliente = contrato as unknown as ContratoWithCliente;
          const contratoAny = contrato as unknown as { id: number; cliente_id: number; isento_mensalidade?: boolean; conta_boleto?: number | null; dia_vencimento_id?: number | null };
          logger.info('RoutineExecutionService.executeGeracaoTitulos - Processando contrato', {
            contratoId: contratoAny.id,
            clienteId: contratoAny.cliente_id,
            isento_mensalidade: contratoAny.isento_mensalidade === true,
            conta_boleto: contratoAny.conta_boleto ?? null,
            dia_vencimento_id: contratoAny.dia_vencimento_id ?? null,
            clienteAtivo: contratoWithCliente.cliente?.ativo ?? null
          });

          if (!TituloGenerationHelper.validateContrato(contratoWithCliente)) {
            const motivo =
              contratoAny.isento_mensalidade === true ? 'isento_mensalidade' :
              !contratoWithCliente.cliente ? 'cliente_ausente' :
              !contratoWithCliente.cliente.ativo ? 'cliente_inativo' :
              !contratoAny.conta_boleto ? 'sem_conta_boleto' :
              !contratoAny.dia_vencimento_id ? 'sem_dia_vencimento' : 'desconhecido';
            logger.info('RoutineExecutionService.executeGeracaoTitulos - Contrato ignorado (não gera títulos)', {
              contratoId: contratoAny.id,
              clienteId: contratoAny.cliente_id,
              motivo
            });
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

          const contratoWithPlano = contratoValidado as unknown as ContratoWithPlano & { conta_boleto: number; dia_vencimento_id: number };
          const tipoCobranca = contratoWithPlano.tipoCobrancaContrato;
          const qtdTitulos = tipoCobranca ? tipoCobranca.quantidade_titulos : quantidadeMinimaTitulos;
          const resultado = await ContratoTituloProcessor.processContrato(
            contratoWithPlano as any,
            titulosEmAberto,
            todosTitulos,
            diaVencimento,
            qtdTitulos,
            parametros,
            servicosAdicionais
          );

          logger.info('RoutineExecutionService.executeGeracaoTitulos - Resultado do contrato', {
            contratoId: contratoWithPlano.id,
            clienteId: contratoWithPlano.cliente_id,
            titulosGeradosNesteContrato: resultado.titulosGerados,
            titulosEmAberto: titulosEmAberto.length,
            todosTitulos: todosTitulos.length
          });

          titulosGerados += resultado.titulosGerados;
          if (resultado.titulosGerados > 0) {
            contratosProcessados++;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
          const errorStack = error instanceof Error ? error.stack : undefined;
          const contratoWithCliente = contrato as unknown as ContratoWithCliente;
          const contratoAny = contrato as unknown as { id: number; isento_mensalidade?: boolean };

          logger.error('RoutineExecutionService.executeGeracaoTitulos - Erro ao processar contrato na geração de títulos', {
            context: 'RoutineExecutionService',
            contratoId: contrato.id,
            clienteId: contratoWithCliente.cliente_id,
            isento_mensalidade: contratoAny.isento_mensalidade === true,
            error: errorMessage,
            stack: errorStack
          });
          erros++;
        }
      }

      logger.info('RoutineExecutionService.executeGeracaoTitulos - Concluído', {
        success: true,
        titulos_gerados: titulosGerados,
        contratos_processados: contratosProcessados,
        contratos_com_erro: erros,
        total_contratos_ativos: contratos.length
      });

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
      logger.error('RoutineExecutionService.executeGeracaoTitulos - Erro na execução da rotina de geração de títulos', {
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
   * Executa a rotina de geração de títulos para contratos SaaS
   */
  public async executeGeracaoTitulosSaas(_routine: SaasScheduledRoutine): Promise<GeracaoTitulosResult> {
    const { SaasContrato } = await import('../../../models/saas/SaasContrato');
    const { SaasPlano } = await import('../../../models/saas/SaasPlano');
    const { SaasContratoDataLoader } = await import('./helpers/SaasContratoDataLoader');
    const { SaasContratoTituloProcessor } = await import('./helpers/SaasContratoTituloProcessor');
    const { SaasTituloGenerationHelper } = await import('./helpers/SaasTituloGenerationHelper');
    const { SaasParametrosService } = await import('../../saas/SaasParametrosService');

    const parametros = await SaasParametrosService.get();
    const quantidadeMinimaTitulos = parametros.manter_numeros_titulos && parametros.quantidade_titulos_manter != null
      ? Math.min(24, Math.max(1, parametros.quantidade_titulos_manter))
      : 1;

    try {
      const contratos = await SaasContrato.findAll({
        where: { status: 'ativo' },
        include: [
          { model: SaasPlano, as: 'plano', attributes: ['id', 'nome', 'valor_mensal'] },
        ],
      });

      const empresaIds = [...new Set(contratos.map((c) => c.empresa_id))];
      const empresaDefaults = await SaasContratoDataLoader.loadEmpresaDefaults(empresaIds);

      const contratoIds = contratos.map((c) => c.id);
      const { titulosEmAbertoPorContrato, todosTitulosPorContrato } =
        await SaasContratoDataLoader.loadRelatedData(contratoIds, empresaDefaults);

      let titulosGerados = 0;
      let contratosProcessados = 0;
      let erros = 0;

      for (const contrato of contratos) {
        try {
          const defaults = empresaDefaults.get(contrato.empresa_id);
          if (!defaults) {
            logger.info('RoutineExecutionService.executeGeracaoTitulosSaas - Empresa sem banco ou dia de vencimento configurado', {
              contratoId: contrato.id,
              empresaId: contrato.empresa_id,
            });
            continue;
          }

          const contratoPlain = contrato.get({ plain: true }) as Record<string, unknown> & { banco_id?: number | null };
          const contaBoleto = contratoPlain.banco_id ?? defaults.conta_boleto;
          const contratoEnriquecido = {
            ...contratoPlain,
            conta_boleto: contaBoleto,
            dia_vencimento_id: defaults.dia_vencimento_id,
            plano: (contrato as { plano?: unknown }).plano,
          } as SaasContratoWithPlano;

          if (!SaasTituloGenerationHelper.validateContrato(contratoEnriquecido)) {
            logger.info('RoutineExecutionService.executeGeracaoTitulosSaas - Contrato ignorado', {
              contratoId: contrato.id,
              empresaId: contrato.empresa_id,
            });
            continue;
          }

          const titulosEmAberto = titulosEmAbertoPorContrato.get(contrato.id) || [];
          const todosTitulos = todosTitulosPorContrato.get(contrato.id) || [];
          const diaVencimento = (contratoPlain.dia_vencimento as number | null | undefined) ?? defaults.dia;

          const resultado = await SaasContratoTituloProcessor.processContrato(
            contratoEnriquecido,
            titulosEmAberto,
            todosTitulos,
            diaVencimento,
            quantidadeMinimaTitulos
          );

          titulosGerados += resultado.titulosGerados;
          if (resultado.titulosGerados > 0) contratosProcessados++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
          logger.error('RoutineExecutionService.executeGeracaoTitulosSaas - Erro ao processar contrato', {
            context: 'RoutineExecutionService',
            contratoId: contrato.id,
            empresaId: contrato.empresa_id,
            error: errorMessage,
          });
          erros++;
        }
      }

      logger.info('RoutineExecutionService.executeGeracaoTitulosSaas - Concluído', {
        titulos_gerados: titulosGerados,
        contratos_processados: contratosProcessados,
        contratos_com_erro: erros,
        total_contratos_ativos: contratos.length,
      });

      return {
        success: true,
        titulos_gerados: titulosGerados,
        contratos_processados: contratosProcessados,
        contratos_com_erro: erros,
        message: `Geração de títulos SaaS concluída. ${titulosGerados} títulos gerados em ${contratosProcessados} contratos.`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('RoutineExecutionService.executeGeracaoTitulosSaas - Erro na execução', {
        context: 'RoutineExecutionService',
        error: errorMessage,
      });
      return {
        success: false,
        titulos_gerados: 0,
        contratos_processados: 0,
        contratos_com_erro: 0,
        message: `Erro ao gerar títulos SaaS: ${errorMessage}`,
      };
    }
  }

  /**
   * Executa a rotina de remessa bancária para SaaS (registra saas_titulos no banco)
   */
  public async executeRemessaBancariaSaas(_routine: SaasScheduledRoutine): Promise<RemessaBancariaResult> {
    const { SaasTitulo } = await import('../../../models/saas/SaasTitulo');
    const { SaasBanco } = await import('../../../models/saas/SaasBanco');
    const { SaasDadosEmpresa } = await import('../../../models/saas/SaasDadosEmpresa');
    const { SaasPlano } = await import('../../../models/saas/SaasPlano');
    const { BancoApiService } = await import('../../bancos/BancoApiService');

    try {
      const titulosParaRegistrar = await SaasTitulo.findAll({
        where: { status: 'pendente', charge_id: null },
        include: [
          { model: SaasBanco, as: 'banco', required: true, attributes: ['id', 'nome', 'tipo_banco', 'codigo', 'sandbox', 'client_id_producao', 'client_secret_producao', 'url_retorno', 'percentual_multa', 'percentual_juros'] },
          { model: SaasDadosEmpresa, as: 'empresa', required: true, attributes: ['id', 'razao_social', 'nome_fantasia', 'nome_empresa', 'cnpj', 'telefone', 'celular', 'email', 'cep', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado'] },
          { model: SaasPlano, as: 'plano', required: true, attributes: ['id', 'nome'] },
        ],
        limit: 100,
      });

      let registrados = 0;
      let erros = 0;
      const detalhes: RemessaBancariaResult['detalhes'] = [];

      for (const titulo of titulosParaRegistrar) {
        try {
          const empresa = (titulo as unknown as { empresa?: { id: number; get: (o: { plain: boolean }) => Record<string, unknown> } }).empresa;
          if (!empresa) continue;
          const emp = empresa.get({ plain: true }) as Record<string, unknown>;
          const clienteData: Record<string, unknown> = {
            id: empresa.id,
            razao_social: emp.razao_social || emp.nome_empresa || 'Sacado',
            nome_fantasia: emp.nome_fantasia || null,
            cnpj: emp.cnpj || '',
            email: emp.email || '',
            telefone: emp.telefone || emp.celular || null,
            cep: emp.cep || null,
            endereco: emp.endereco || null,
            numero: emp.numero || null,
            complemento: emp.complemento || null,
            bairro: emp.bairro || null,
            cidade: emp.cidade || null,
            estado: emp.estado || null,
          };
          const tituloData = titulo.get({ plain: true }) as Record<string, unknown>;
          const plano = (titulo as unknown as { plano?: { nome?: string; get: (o: { plain: boolean }) => Record<string, unknown> } }).plano;
          const banco = (titulo as unknown as { banco?: { nome?: string; get: (o: { plain: boolean }) => Record<string, unknown> } }).banco;
          const planoData = plano?.get({ plain: true }) as Record<string, unknown> || {};
          const bancoData = banco?.get({ plain: true }) as Record<string, unknown> || {};
          const tituloLike = {
            ...tituloData,
            cliente: clienteData,
            banco: bancoData,
            plano: { ...planoData, nome_plano: planoData.nome ?? planoData.nome_plano },
          } as unknown as Parameters<typeof BancoApiService.gerarTitulo>[0];

          const resultado = await BancoApiService.gerarTitulo(tituloLike, { bancoTable: 'saas_bancos' });

          if (resultado.success && resultado.data) {
            registrados++;
            const dados = resultado.data;
            const chargeId = typeof dados.charge_id === 'string' ? dados.charge_id : undefined;
            const codigoBarrasFinal = typeof dados.codigo_barras === 'string' ? dados.codigo_barras : null;
            const codigoBarrasParaSalvar = codigoBarrasFinal !== null ? codigoBarrasFinal : null;
            await titulo.update({
              charge_id: chargeId ?? titulo.charge_id,
              url_boleto: typeof dados.url_boleto === 'string' ? dados.url_boleto : titulo.url_boleto,
              qrcode: typeof dados.qrcode === 'string' ? dados.qrcode : titulo.qrcode,
              qrcode_image: typeof dados.qrcode_image === 'string' ? dados.qrcode_image : titulo.qrcode_image,
              codigo_barras: codigoBarrasParaSalvar,
              linha_digitavel: typeof dados.linha_digitavel === 'string' ? dados.linha_digitavel : titulo.linha_digitavel,
              nosso_numero: typeof dados.nosso_numero === 'string' ? dados.nosso_numero : titulo.nosso_numero,
            });
            detalhes.push({ titulo_id: titulo.id, banco: banco?.nome, status: 'sucesso', message: 'Título registrado no banco', charge_id: chargeId });
          } else {
            erros++;
            detalhes.push({ titulo_id: titulo.id, banco: banco?.nome, status: 'erro', message: resultado.message || 'Erro ao registrar título' });
          }
        } catch (error) {
          erros++;
          const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
          logger.error('Erro ao processar título SaaS na remessa bancária', {
            context: 'RoutineExecutionService',
            action: 'executeRemessaBancariaSaas',
            tituloId: titulo.id,
            error: errorMsg,
          });
          detalhes.push({ titulo_id: titulo.id, banco: (titulo as unknown as { banco?: { nome?: string } }).banco?.nome, status: 'erro', message: errorMsg });
        }
      }

      return {
        titulos_registrados: registrados,
        titulos_erro: erros,
        total_processados: titulosParaRegistrar.length,
        detalhes,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao executar remessa bancária SaaS', {
        context: 'RoutineExecutionService',
        action: 'executeRemessaBancariaSaas',
        error: errorMsg,
      });
      return {
        titulos_registrados: 0,
        titulos_erro: 0,
        total_processados: 0,
        detalhes: [],
        message: `Erro ao executar remessa bancária: ${errorMsg}`,
      };
    }
  }

  /**
   * Executa a rotina de envio de boletos
   * @param routine - Rotina com configurações
   * @param saas - Se é rotina SaaS (usa saas_titulos e saas_dados_empresa)
   * @returns Resultado do envio de boletos
   */
  public async executeEnvioBoletos(routine: AnyRoutine, saas = false): Promise<EnvioBoletosResult> {
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

      const empresaId = (routine as { empresa_id?: number | null }).empresa_id;
      const resultado = await envioBoletosRoutine.execute(config, { saas, empresa_id: empresaId ?? undefined });

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
  public async executeRemessaBancaria(routine: AnyRoutine): Promise<RemessaBancariaResult> {
    const { Titulo: TituloModel } = await import('../../../models/financeiro/Titulo');
    const { Banco } = await import('../../../models/cadastros/Banco');
    const { Cliente } = await import('../../../models/clientes/Cliente');
    const { Plano } = await import('../../../models/cadastros/Plano');
    const { BancoApiService } = await import('../../bancos/BancoApiService');
    
    try {
      const whereTitulo: Record<string, unknown> = {
        status: 'pendente',
        charge_id: null // Apenas títulos que ainda não foram registrados
      };
      const empresaId = (routine as { empresa_id?: number | null }).empresa_id;
      if (empresaId != null) {
        whereTitulo.empresa_id = empresaId;
      }
      
      // Buscar títulos pendentes que ainda não foram registrados no banco (sem charge_id)
      const titulosParaRegistrar = await TituloModel.findAll({
        where: whereTitulo,
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

  /**
   * Executa a rotina de desbloqueio blockdomi (inativar por data fim de bloqueio)
   * Só executa se o tenant tiver o módulo blockdomi ativo no plano.
   * @param routine - Rotina com configurações
   * @returns Resultado da execução
   */
  public async executeDesbloquearBlockdomi(routine: ScheduledRoutine): Promise<RoutineExecutionResult> {
    try {
      const { getModulosDoPlano, tenantTemModulo } = await import('../../saas/PlanoModulosService');
      const { DadosEmpresa } = await import('../../../models/sistema/DadosEmpresa');

      let empresaId = routine.empresa_id ?? null;
      if (empresaId == null) {
        const primeiraEmpresa = await DadosEmpresa.findOne({ attributes: ['id'], order: [['id', 'ASC']] });
        empresaId = primeiraEmpresa?.id ?? null;
      }
      if (empresaId != null) {
        const modulos = await getModulosDoPlano(empresaId);
        if (!tenantTemModulo(modulos, 'blockdomi')) {
          return {
            success: false,
            message: 'Módulo blockdomi não está ativo no plano. A rotina de desbloquear domínios só pode ser executada quando o módulo está habilitado.',
            dominios_inativados: 0,
            ipv4_inativados: 0,
            ipv6_inativados: 0,
            total: 0
          };
        }
      }

      const { DesbloquearBlockdomiRoutine } = await import('../routines/DesbloquearBlockdomiRoutine');
      const desbloquearRoutine = new DesbloquearBlockdomiRoutine();
      const config = { ...(routine.configuracao || {}), empresa_id: empresaId };
      const resultado = await desbloquearRoutine.execute(config);
      return {
        success: resultado.success,
        message: resultado.message,
        ...(resultado.data || {})
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao executar desbloqueio blockdomi', {
        context: 'RoutineExecutionService',
        action: 'executeDesbloquearBlockdomi',
        routineId: routine.id,
        error: errorMessage
      });
      return {
        success: false,
        message: `Erro ao desbloquear blockdomi: ${errorMessage}`
      };
    }
  }

  /**
   * Executa a rotina de bloqueio SaaS por atraso (faturas vencidas além do limite de dias)
   * @returns Resultado da execução
   */
  public async executeBloquearSaasAtraso(): Promise<RoutineExecutionResult> {
    try {
      const { BloquearSaasAtrasoRoutine } = await import('../routines/BloquearSaasAtrasoRoutine');
      const routine = new BloquearSaasAtrasoRoutine();
      const resultado = await routine.execute({}) as RoutineResult & { empresasBloqueadas?: number; empresasDesbloqueadas?: number };
      return {
        success: resultado.success,
        message: resultado.message,
        empresasBloqueadas: resultado.empresasBloqueadas ?? 0,
        empresasDesbloqueadas: resultado.empresasDesbloqueadas ?? 0
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao executar bloqueio SaaS por atraso', {
        context: 'RoutineExecutionService',
        action: 'executeBloquearSaasAtraso',
        error: errorMessage
      });
      return {
        success: false,
        message: `Erro na rotina de bloqueio por atraso: ${errorMessage}`,
        empresasBloqueadas: 0,
        empresasDesbloqueadas: 0
      };
    }
  }
}

export default RoutineExecutionService;

