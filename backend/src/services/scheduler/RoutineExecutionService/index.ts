import { prisma } from '../../../db/prisma';
import { getSshDeviceBackupQueue } from '../../ssh-manager/SshDeviceBackupQueue';
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
import type { JsonValue } from '../../../types/index';
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
  data_validade_desconto?: Date | string | null;
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

interface ContratoPlanoAdicionalWithPlano {
  plano?: {
    id: number;
    nome_plano?: string;
    valor_mensal: number;
  };
}

type AnyRoutine = {
  id: number;
  nome?: string | null;
  tipo: string;
  empresa_id?: number | null;
  configuracao?: Record<string, JsonValue> | string | null;
  alvo?: string | null;
};

function isSaasRoutine(routine: AnyRoutine): boolean {
  return routine.alvo === 'saas' || routine.alvo === 'erp_global';
}

function erpRotinaConfiguracao(routine: AnyRoutine): Record<string, JsonValue> {
  if (isSaasRoutine(routine)) return {};
  const configuracao = routine.configuracao;
  if (configuracao && typeof configuracao === 'object') return configuracao;
  if (typeof configuracao === 'string') {
    try {
      return JSON.parse(configuracao) as Record<string, JsonValue>;
    } catch {
      return {};
    }
  }
  return {};
}

function saasAlvo(routine: AnyRoutine): 'saas' | 'erp_global' {
  return routine.alvo === 'erp_global' ? 'erp_global' : 'saas';
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

    if (saas) {
      const alvo = saasAlvo(routine);
      const tiposSaas = ['geracao_titulos', 'envio_boletos', 'remessa_bancaria', 'bloquear_saas_atraso'] as const;
      const tiposErpGlobal = [
        'geracao_titulos',
        'envio_boletos',
        'remessa_bancaria',
        'verificar_vencimentos',
        'desbloquear_blockdomi',
        'backup_equipamentos_ssh',
        'rpki_sync_parent_resources',
        'rpki_sync_repositories',
        'consulta_titulos_asaas',
        'consulta_titulos_efi',
        'ixc_sync_ordens_servico',
        'suspender_contratos_atraso',
        'outros'
      ] as const;
      const ok =
        (alvo === 'saas' && (tiposSaas as readonly string[]).includes(routine.tipo)) ||
        (alvo === 'erp_global' && (tiposErpGlobal as readonly string[]).includes(routine.tipo));
      if (!ok) {
        logger.warn('RoutineExecutionService - Combinação alvo/tipo inválida', {
          context: 'RoutineExecutionService',
          tipo: routine.tipo,
          alvo,
          routineId: routine.id
        });
        return { success: false, message: `Combinação de alvo e tipo inválida: ${routine.tipo}` };
      }
    }

    switch (routine.tipo) {
      case 'geracao_titulos':
        if (saas) {
          if (saasAlvo(routine) === 'erp_global') {
            return await this.executeGeracaoTitulos(this.saasErpGlobalAsScheduledRoutine(routine));
          }
          return await this.executeGeracaoTitulosSaas(routine);
        }
        return await this.executeGeracaoTitulos(routine);

      case 'envio_boletos': {
        if (saas) {
          const alvo = saasAlvo(routine);
          const asErp = this.saasErpGlobalAsScheduledRoutine(routine);
          return await this.executeEnvioBoletos(asErp, alvo === 'saas');
        }
        return await this.executeEnvioBoletos(routine, false);
      }

      case 'remessa_bancaria':
        if (saas) {
          if (saasAlvo(routine) === 'erp_global') {
            return await this.executeRemessaBancaria(this.saasErpGlobalAsScheduledRoutine(routine));
          }
          return await this.executeRemessaBancariaSaas(routine);
        }
        return await this.executeRemessaBancaria(routine);

      case 'verificar_vencimentos': {
        if (saas && saasAlvo(routine) !== 'erp_global') {
          return { success: false, message: 'Verificar vencimentos só pode ser agendado com alvo ERP (todos os clientes) no painel SaaS.' };
        }
        const { VerificarVencimentosRoutine } = await import('../routines/VerificarVencimentosRoutine');
        const r = new VerificarVencimentosRoutine();
        const cfg = saas ? {} : ((routine).configuracao || {});
        return (await r.execute(cfg as Record<string, JsonValue>)) as RoutineExecutionResult;
      }

      case 'desbloquear_blockdomi':
        if (saas) {
          if (saasAlvo(routine) !== 'erp_global') {
            return { success: false, message: 'Configure esta rotina com alvo ERP (todos os clientes) no painel SaaS.' };
          }
          return await this.executeDesbloquearBlockdomiErpGlobal();
        }
        return await this.executeDesbloquearBlockdomi(routine);

      case 'backup_equipamentos_ssh':
        if (saas) {
          if (saasAlvo(routine) !== 'erp_global') {
            return { success: false, message: 'Backup SSH deve usar escopo ERP (todos os clientes).' };
          }
          return await this.executeBackupEquipamentosSsh(this.saasErpGlobalAsScheduledRoutine(routine));
        }
        return {
          success: false,
          message:
            'Backup de equipamentos SSH é configurado apenas no painel SaaS (uma rotina para todos os clientes).',
        };

      case 'bloquear_saas_atraso':
        if (!saas) return { success: false, message: 'Tipo exclusivo do SaaS' };
        if (saasAlvo(routine) !== 'saas') {
          return { success: false, message: 'Bloquear por atraso só aplica ao alvo SaaS (cobrança do produto).' };
        }
        return await this.executeBloquearSaasAtraso();

      case 'rpki_sync_parent_resources':
        if (saas && saasAlvo(routine) !== 'erp_global') {
          return { success: false, message: 'Sincronização RPKI com CA-pai deve usar alvo ERP (todos os clientes).' };
        }
        return await this.executeRpkiSyncParentResources();

      case 'rpki_sync_repositories':
        if (saas && saasAlvo(routine) !== 'erp_global') {
          return { success: false, message: 'Sincronização de repositórios RPKI deve usar alvo ERP (todos os clientes).' };
        }
        return await this.executeRpkiSyncRepositories();

      case 'consulta_titulos_asaas':
        if (saas && saasAlvo(routine) !== 'erp_global') {
          return { success: false, message: 'Consulta de títulos Asaas deve usar alvo ERP (todos os clientes).' };
        }
        return await this.executeConsultaTitulosAsaas();

      case 'consulta_titulos_efi':
        if (saas && saasAlvo(routine) !== 'erp_global') {
          return { success: false, message: 'Consulta de títulos Efi deve usar alvo ERP (todos os clientes).' };
        }
        return await this.executeConsultaTitulosEfi();

      case 'ixc_sync_ordens_servico':
        if (saas && saasAlvo(routine) !== 'erp_global') {
          return { success: false, message: 'Sincronização IXC de OS deve usar alvo ERP (todos os clientes).' };
        }
        return await this.executeIxcSyncOrdensServico();

      case 'suspender_contratos_atraso': {
        if (saas && saasAlvo(routine) !== 'erp_global') {
          return { success: false, message: 'Suspender contratos por atraso deve usar alvo ERP (todos os clientes).' };
        }
        const { SuspenderContratosAtrasoRoutine } = await import('../routines/SuspenderContratosAtrasoRoutine');
        const r = new SuspenderContratosAtrasoRoutine();
        return (await r.execute({})) as RoutineExecutionResult;
      }

      default:
        logger.warn('RoutineExecutionService.executeRoutine - Tipo de rotina não implementado', {
          context: 'RoutineExecutionService',
          routineTipo: routine.tipo,
          routineId: routine.id
        });
        return { message: 'Tipo de rotina não implementado' };
    }
  }

  /** Adapta rotina SaaS para a mesma assinatura usada pelos handlers que esperam {@link ScheduledRoutine}. */
  private saasErpGlobalAsScheduledRoutine(routine: AnyRoutine): AnyRoutine {
    return routine;
  }

  /**
   * Desbloqueio blockdomi para todos os tenants (sem filtrar empresa_id no repositório).
   */
  private async executeDesbloquearBlockdomiErpGlobal(): Promise<RoutineExecutionResult> {
    try {
      const { DesbloquearBlockdomiRoutine } = await import('../routines/DesbloquearBlockdomiRoutine');
      const r = new DesbloquearBlockdomiRoutine();
      return (await r.execute({})) as RoutineExecutionResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao executar desbloqueio blockdomi (ERP global)', {
        context: 'RoutineExecutionService',
        action: 'executeDesbloquearBlockdomiErpGlobal',
        error: errorMessage
      });
      return { success: false, message: `Erro ao desbloquear blockdomi: ${errorMessage}` };
    }
  }

  /** Enfileira backup de todos os equipamentos SSH elegíveis (rotina global no SaaS). */
  private async executeBackupEquipamentosSsh(_routine: AnyRoutine): Promise<RoutineExecutionResult> {
    const rows = await prisma.ssh_manager_devices.findMany({
      where: { backup_enabled: true, is_active: true },
      select: { id: true },
    });

    const queue = getSshDeviceBackupQueue();
    for (const d of rows) {
      queue.enqueue(d.id);
    }

    return {
      success: true,
      message: `Enfileirados ${rows.length} backup(s) na fila.`,
      jobs_enqueued: rows.length,
      skipped_tunnel: 0,
      devices_eligible: rows.length,
    };
  }

  /**
   * Executa a rotina de geração de títulos
   * @param _routine - Rotina (não utilizado, mas mantido para compatibilidade)
   * @returns Resultado da geração de títulos
   */
  public async executeGeracaoTitulos(routine: AnyRoutine): Promise<GeracaoTitulosResult> {
    try {
      const parametros = await prisma.sistema_parametros.findFirst({ orderBy: { id: 'asc' } });
      const quantidadeMinimaTitulos = 12;

      const contratos = await prisma.contratos.findMany({
        where: {
          status: 'ativo',
          ...(routine.empresa_id != null ? { empresa_id: routine.empresa_id } : {}),
        },
        include: {
          cadastros_planos: { select: { id: true, nome_plano: true, valor_mensal: true, periodicidade: true } },
          clientes: { select: { id: true, ativo: true } },
          cadastros_tipos_cobranca_contrato: { select: { id: true, quantidade_titulos: true, periodicidade: true } },
        },
      });
      const contratosMapeados = contratos.map((contrato) => ({
        ...contrato,
        valor_final: contrato.valor_final != null ? Number(contrato.valor_final) : null,
        desconto_valor: contrato.desconto_valor != null ? Number(contrato.desconto_valor) : null,
        desconto_percentual: contrato.desconto_percentual != null ? Number(contrato.desconto_percentual) : null,
        plano: {
          ...contrato.cadastros_planos,
          valor_mensal: Number(contrato.cadastros_planos.valor_mensal),
        },
        cliente: contrato.clientes,
        tipoCobrancaContrato: contrato.cadastros_tipos_cobranca_contrato,
      }));

      // Buscar e agrupar dados relacionados (otimização N+1)
      const contratoIds = contratosMapeados.map((c) => c.id);
      const diaVencimentoIds = contratos
        .map((c) => c.dia_vencimento_id)
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
        diasVencimentoTodos.filter((item): item is { id: number; dia: number } => item.dia != null),
        servicosAdicionaisTodos
      );

      let titulosGerados = 0;
      let contratosProcessados = 0;
      let erros = 0;

      for (const contrato of contratosMapeados) {
        try {
          const contratoWithCliente = contrato as unknown as ContratoWithCliente;

          if (!TituloGenerationHelper.validateContrato(contratoWithCliente)) continue;

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
            contratoWithPlano,
            titulosEmAberto as unknown as Parameters<typeof ContratoTituloProcessor.processContrato>[1],
            todosTitulos as unknown as Parameters<typeof ContratoTituloProcessor.processContrato>[2],
            diaVencimento,
            qtdTitulos,
            parametros,
            servicosAdicionais as unknown as Parameters<typeof ContratoTituloProcessor.processContrato>[6]
          );

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
  public async executeGeracaoTitulosSaas(_routine: AnyRoutine): Promise<GeracaoTitulosResult> {
    return {
      success: true,
      titulos_gerados: 0,
      contratos_processados: 0,
      contratos_com_erro: 0,
      message: 'Geração de títulos SaaS indisponível: tabelas de cobrança SaaS não existem.',
    };
  }

  public async executeRemessaBancariaSaas(_routine: AnyRoutine): Promise<RemessaBancariaResult> {
    return {
      titulos_registrados: 0,
      titulos_erro: 0,
      total_processados: 0,
      detalhes: [],
      message: 'Remessa SaaS indisponível: tabelas de cobrança SaaS não existem.',
    };
  }

  public async executeEnvioBoletos(routine: AnyRoutine, saas = false): Promise<EnvioBoletosResult> {
    logger.info('RoutineExecutionService.executeEnvioBoletos - Iniciando execução', {
      context: 'RoutineExecutionService',
      routineId: routine.id,
      routineNome: routine.nome,
      routineTipo: routine.tipo,
      routineAtiva: 'ativo' in routine ? routine.ativo : undefined,
      rotinaConfiguracao: JSON.stringify(erpRotinaConfiguracao(routine))
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

      // Ler configurações da rotina ou usar padrões (SaaS: sem coluna configuracao)
      const config = erpRotinaConfiguracao(routine);

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
        routineConfiguracao: JSON.stringify(erpRotinaConfiguracao(routine))
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
    const { BancoApiService } = await import('../../bancos/BancoApiService');

    try {
      const empresaId = routine.empresa_id;
      const titulosParaRegistrar = await prisma.financeiro_titulos.findMany({
        where: {
          status: 'pendente',
          charge_id: null,
          ...(empresaId != null ? { empresa_id: empresaId } : {}),
        },
        include: {
          cadastros_bancos: true,
          clientes: true,
          cadastros_planos: { select: { id: true, nome_plano: true } },
        },
        take: 100,
      });

      let registrados = 0;
      let erros = 0;
      const detalhes: RemessaBancariaResult['detalhes'] = [];

      for (const titulo of titulosParaRegistrar) {
        const tituloCompleto = {
          ...titulo,
          valor: Number(titulo.valor),
          banco: titulo.cadastros_bancos,
          cliente: titulo.clientes,
          plano: titulo.cadastros_planos,
        } as unknown as Parameters<typeof BancoApiService.gerarTitulo>[0];
        try {
          const resultado = await BancoApiService.gerarTitulo(tituloCompleto);

          if (resultado.success && resultado.data) {
            registrados++;
            const dados = resultado.data;
            const chargeId = typeof dados.charge_id === 'string' ? dados.charge_id : undefined;
            const { codigo_barras: codigoBarrasParaSalvar, linha_digitavel: linhaDigitavelParaSalvar } =
              BarcodeService.normalizarCodigosBoleto(dados.codigo_barras, dados.linha_digitavel);

            await prisma.financeiro_titulos.update({
              where: { id: titulo.id },
              data: {
                charge_id: chargeId ?? titulo.charge_id,
                url_boleto: typeof dados.url_boleto === 'string' ? dados.url_boleto : titulo.url_boleto,
                qrcode: typeof dados.qrcode === 'string' ? dados.qrcode : titulo.qrcode,
                qrcode_image: typeof dados.qrcode_image === 'string' ? dados.qrcode_image : titulo.qrcode_image,
                codigo_barras: codigoBarrasParaSalvar,
                linha_digitavel: linhaDigitavelParaSalvar ?? titulo.linha_digitavel,
                nosso_numero: typeof dados.nosso_numero === 'string' ? dados.nosso_numero : titulo.nosso_numero,
              },
            });

            detalhes.push({
              titulo_id: titulo.id,
              banco: titulo.cadastros_bancos?.nome,
              status: 'sucesso',
              message: 'Título registrado no banco',
              charge_id: chargeId,
            });
          } else {
            erros++;
            detalhes.push({
              titulo_id: titulo.id,
              banco: titulo.cadastros_bancos?.nome,
              status: 'erro',
              message: resultado.message || 'Erro desconhecido ao registrar título',
            });
          }
        } catch (error) {
          erros++;
          const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
          logger.error('Erro ao processar título na remessa bancária', {
            context: 'RoutineExecutionService',
            action: 'executeRemessaBancaria',
            tituloId: titulo.id,
            error: errorMsg,
          });
          detalhes.push({
            titulo_id: titulo.id,
            banco: titulo.cadastros_bancos?.nome,
            status: 'erro',
            message: errorMsg,
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
  public async executeDesbloquearBlockdomi(routine: AnyRoutine): Promise<RoutineExecutionResult> {
    try {
      const { getModulosDoPlano, tenantTemModulo } = await import('../../saas/PlanoModulosService');
      let empresaId = routine.empresa_id ?? null;
      if (empresaId == null) {
        const primeiraEmpresa = await prisma.sistema_tenants.findFirst({ select: { id: true }, orderBy: { id: 'asc' } });
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
      const configBase = routine.configuracao && typeof routine.configuracao === 'object'
        ? routine.configuracao as Record<string, unknown>
        : {};
      const config = { ...configBase, empresa_id: empresaId };
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

  public async executeRpkiSyncParentResources(): Promise<RoutineExecutionResult> {
    try {
      const { RpkiSchedulerRoutineService } = await import('../../rpki/RpkiSchedulerRoutineService');
      const resultado = await RpkiSchedulerRoutineService.syncAllParentResources();
      return {
        success: resultado.success,
        message: resultado.message,
        total: resultado.total,
        sucesso: resultado.sucesso,
        erro: resultado.erro,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao executar rotina RPKI de sincronização de CA-pai', {
        context: 'RoutineExecutionService',
        action: 'executeRpkiSyncParentResources',
        error: errorMessage,
      });
      return {
        success: false,
        message: `Erro ao sincronizar recursos RPKI com CAs-pai: ${errorMessage}`,
        total: 0,
        sucesso: 0,
        erro: 0,
      };
    }
  }

  public async executeRpkiSyncRepositories(): Promise<RoutineExecutionResult> {
    try {
      const { RpkiSchedulerRoutineService } = await import('../../rpki/RpkiSchedulerRoutineService');
      const resultado = await RpkiSchedulerRoutineService.syncAllRepositories();
      return {
        success: resultado.success,
        message: resultado.message,
        total: resultado.total,
        sucesso: resultado.sucesso,
        erro: resultado.erro,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao executar rotina RPKI de sincronização de repositórios', {
        context: 'RoutineExecutionService',
        action: 'executeRpkiSyncRepositories',
        error: errorMessage,
      });
      return {
        success: false,
        message: `Erro ao sincronizar repositórios RPKI: ${errorMessage}`,
        total: 0,
        sucesso: 0,
        erro: 0,
      };
    }
  }

  public async executeConsultaTitulosAsaas(): Promise<RoutineExecutionResult> {
    try {
      const { ConsultarTitulosAsaasRoutine } = await import('../routines/ConsultarTitulosAsaasRoutine');
      const routine = new ConsultarTitulosAsaasRoutine();
      const resultado = await routine.execute({});
      return {
        success: resultado.success,
        message: resultado.message,
        ...(resultado.data ?? {}),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao executar consulta de títulos Asaas', {
        context: 'RoutineExecutionService',
        action: 'executeConsultaTitulosAsaas',
        error: errorMessage,
      });
      return { success: false, message: `Erro na consulta de títulos Asaas: ${errorMessage}` };
    }
  }

  public async executeConsultaTitulosEfi(): Promise<RoutineExecutionResult> {
    try {
      const { ConsultarTitulosEfiRoutine } = await import('../routines/ConsultarTitulosEfiRoutine');
      const routine = new ConsultarTitulosEfiRoutine();
      const resultado = await routine.execute({});
      return {
        success: resultado.success,
        message: resultado.message,
        ...(resultado.data ?? {}),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao executar consulta de títulos Efi', {
        context: 'RoutineExecutionService',
        action: 'executeConsultaTitulosEfi',
        error: errorMessage,
      });
      return { success: false, message: `Erro na consulta de títulos Efi: ${errorMessage}` };
    }
  }

  public async executeIxcSyncOrdensServico(): Promise<RoutineExecutionResult> {
    try {
      const { IxcOsSchedulerRoutineService } = await import('../../ordens/IxcOsSchedulerRoutineService');
      const resultado = await IxcOsSchedulerRoutineService.syncAllIntegracoes('scheduled');
      return {
        success: resultado.success,
        message: resultado.message,
        total: resultado.total,
        sucesso: resultado.sucesso,
        erro: resultado.erro,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao executar sincronização IXC de ordens de serviço', {
        context: 'RoutineExecutionService',
        action: 'executeIxcSyncOrdensServico',
        error: errorMessage,
      });
      return {
        success: false,
        message: `Erro na sincronização IXC de OS: ${errorMessage}`,
        total: 0,
        sucesso: 0,
        erro: 0,
      };
    }
  }
}

export default RoutineExecutionService;

