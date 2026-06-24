import { Op } from 'sequelize';
import { logger } from '../../../utils/logger';
import { IntegracaoIxcProvedor } from '../../../models/integracao/IntegracaoIxcProvedor';
import { ContratoIntegracaoIxcVinculo } from '../../../models/contratos/ContratoIntegracaoIxcVinculo';
import { Contrato } from '../../../models/contratos/Contrato';
import { Cliente } from '../../../models/clientes/Cliente';
import { OrdemServicoLocal } from '../../../models/ordens/OrdemServicoLocal';
import { IntegracaoIxcProvedorService } from '../../integracao/IntegracaoIxcProvedorService';
import { runWithIntegracaoCredentials } from '../../externos/ixcApiContext';
import { clienteNomeParaOrdemServico } from '../clienteNomeOrdemServico';
import {
  IXC_EVENTO_ABERTURA,
  IXC_EVENTO_FINALIZAR,
  IXC_EVENTO_OBSERVACAO,
} from '../../externos/IxcOssChamadoService/constants';
import {
  fetchMensagensOs,
  fetchOsListByClienteIdx,
  fetchOsRawById,
} from '../../externos/IxcOssChamadoService/ossData';
import { OrdemServicoLocalService, fetchUsuarioNomeById } from '../OrdemServicoLocalService';
import { IxcOsSyncLogService } from '../IxcOsSyncLogService';

interface SchedulerResult {
  success: boolean;
  message: string;
  total: number;
  sucesso: number;
  erro: number;
}

interface ClienteVinculo {
  clienteId: number;
  empresaId: number | null;
  clienteNome: string;
}

async function listClientesPorIntegracao(integracaoId: number): Promise<ClienteVinculo[]> {
  const vinculos = (await ContratoIntegracaoIxcVinculo.findAll({
    where: { integracao_ixc_provedor_id: integracaoId },
    include: [
      {
        model: Contrato,
        as: 'contrato',
        required: true,
        attributes: ['cliente_id', 'empresa_id'],
        include: [
          {
            model: Cliente,
            as: 'cliente',
            required: true,
            attributes: ['id', 'razao_social', 'nome_fantasia'],
          },
        ],
      },
    ],
  })) as Array<
    ContratoIntegracaoIxcVinculo & {
      contrato?: (Contrato & { cliente?: Cliente | null }) | null;
    }
  >;

  const mapa = new Map<number, ClienteVinculo>();
  for (const vinculo of vinculos) {
    const contrato = vinculo.contrato;
    const cliente = contrato?.cliente;
    if (!cliente) continue;

    mapa.set(cliente.id, {
      clienteId: cliente.id,
      empresaId: contrato.empresa_id ?? null,
      clienteNome: clienteNomeParaOrdemServico(cliente, cliente.id),
    });
  }

  return [...mapa.values()];
}

function resolveOperadorIxcNome(ixcMensagens: Array<{ id_evento?: string; operador_nome?: string }>, evento: string): string {
  const msg = ixcMensagens.find((item) => String(item.id_evento) === evento);
  return msg?.operador_nome?.trim() || '';
}

export class IxcOsSchedulerRoutineService {
  static async syncAllIntegracoes(triggerType: 'scheduled' | 'manual' = 'scheduled'): Promise<SchedulerResult> {
    const integracoes = await IntegracaoIxcProvedorService.findAtivos();
    let total = 0;
    let sucesso = 0;
    let erro = 0;

    for (const integracao of integracoes) {
      total++;
      try {
        const resultado = await IxcOsSchedulerRoutineService.syncIntegracao(integracao, triggerType);
        if (resultado.success) sucesso++;
        else erro++;
      } catch (err) {
        erro++;
        const message = err instanceof Error ? err.message : String(err);
        logger.error('IxcOsSchedulerRoutineService: erro na integração', {
          context: 'IxcOsSchedulerRoutineService',
          integracaoId: integracao.id,
          error: message,
        });
        IxcOsSyncLogService.registrar({
          empresaId: integracao.empresa_id,
          integracaoId: integracao.id,
          integracaoNome: integracao.nome,
          eventType: 'sync_batch',
          status: 'failed',
          triggerType,
          message: `Falha na sincronização IXC (${integracao.nome}): ${message}`,
        });
      }
    }

    const message =
      erro === 0
        ? `IXC OS: ${sucesso}/${total} integrações sincronizadas`
        : `IXC OS: ${sucesso}/${total} integrações OK, ${erro} com erro`;

    return { success: erro === 0, message, total, sucesso, erro };
  }

  static async syncIntegracao(
    integracao: IntegracaoIxcProvedor,
    triggerType: 'scheduled' | 'manual' = 'scheduled'
  ): Promise<SchedulerResult> {
    const apiUrl = integracao.api_url?.trim().replace(/\/+$/, '');
    const apiToken = integracao.api_token?.trim();
    if (!apiUrl || !apiToken) {
      return {
        success: false,
        message: `Integração ${integracao.nome} sem URL ou token`,
        total: 0,
        sucesso: 0,
        erro: 1,
      };
    }

    let processadas = 0;
    let sucesso = 0;
    let erro = 0;

    await runWithIntegracaoCredentials({ apiUrl, apiToken }, async () => {
      const clientes = await listClientesPorIntegracao(integracao.id);
      const clienteIds = clientes.map((c) => c.clienteId);

      const mirrors =
        clienteIds.length > 0
          ? await OrdemServicoLocal.findAll({
              where: {
                ixc_id: { [Op.ne]: null },
                cliente_id: { [Op.in]: clienteIds },
              },
            })
          : [];

      const mirrorsPorIxcId = new Map(mirrors.map((m) => [String(m.ixc_id).trim(), m]));

      for (const mirror of mirrors) {
        processadas++;
        try {
          await IxcOsSchedulerRoutineService.syncMirrorRecord(
            mirror,
            integracao,
            triggerType,
            clientes.find((c) => c.clienteId === mirror.cliente_id)?.clienteNome ?? ''
          );
          sucesso++;
        } catch (err) {
          erro++;
          logger.warn('IxcOsSchedulerRoutineService: erro ao sincronizar OS local', {
            context: 'IxcOsSchedulerRoutineService',
            ordemServicoId: mirror.id,
            ixcId: mirror.ixc_id,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      for (const cliente of clientes) {
        try {
          const ixcOsList = await fetchOsListByClienteIdx(cliente.clienteId);
          for (const ixcOs of ixcOsList) {
            const ixcId = String(ixcOs.id ?? '').trim();
            if (!ixcId || mirrorsPorIxcId.has(ixcId)) continue;

            processadas++;
            const record = await OrdemServicoLocalService.createIxcMirror(
              ixcOs,
              {},
              cliente.empresaId,
              null,
              cliente.clienteId
            );
            mirrorsPorIxcId.set(ixcId, record);

            IxcOsSyncLogService.registrar({
              empresaId: cliente.empresaId,
              integracaoId: integracao.id,
              integracaoNome: integracao.nome,
              eventType: 'os_abertura',
              status: 'info',
              triggerType,
              ordemServicoId: record.id,
              ixcOsId: ixcId,
              protocolo: record.protocolo,
              clienteNome: cliente.clienteNome,
              origemAbertura: 'ixc',
              operadorNome: resolveOperadorIxcNome(
                await fetchMensagensOs(ixcId),
                IXC_EVENTO_ABERTURA
              ),
              message: `OS aberta diretamente no IXC Provedor (${record.protocolo})`,
            });

            const { inseridas } = await OrdemServicoLocalService.syncMensagensFromIxc(
              record,
              await fetchMensagensOs(ixcId),
              cliente.empresaId
            );
            for (const msg of inseridas) {
              if (String(msg.id_evento) === IXC_EVENTO_OBSERVACAO) {
                IxcOsSyncLogService.registrar({
                  empresaId: cliente.empresaId,
                  integracaoId: integracao.id,
                  integracaoNome: integracao.nome,
                  eventType: 'os_mensagem',
                  status: 'info',
                  triggerType,
                  ordemServicoId: record.id,
                  ixcOsId: ixcId,
                  protocolo: record.protocolo,
                  clienteNome: cliente.clienteNome,
                  origemAbertura: 'ixc',
                  operadorNome: msg.operador_nome ?? '',
                  message: `Nova mensagem sincronizada do IXC (${record.protocolo})`,
                });
              }
            }

            sucesso++;
          }
        } catch (err) {
          erro++;
          logger.warn('IxcOsSchedulerRoutineService: erro ao importar OS do cliente', {
            context: 'IxcOsSchedulerRoutineService',
            clienteId: cliente.clienteId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    });

    const message = `IXC OS (${integracao.nome}): ${sucesso}/${processadas} processadas${erro > 0 ? `, ${erro} com erro` : ''}`;

    IxcOsSyncLogService.registrar({
      empresaId: integracao.empresa_id,
      integracaoId: integracao.id,
      integracaoNome: integracao.nome,
      eventType: 'sync_batch',
      status: erro === 0 ? 'success' : 'failed',
      triggerType,
      message,
    });

    return {
      success: erro === 0,
      message,
      total: processadas,
      sucesso,
      erro,
    };
  }

  private static async syncMirrorRecord(
    record: OrdemServicoLocal,
    integracao: IntegracaoIxcProvedor,
    triggerType: 'scheduled' | 'manual',
    clienteNome: string
  ): Promise<void> {
    const ixcId = String(record.ixc_id ?? '').trim();
    if (!ixcId) return;

    const ixcOs = await fetchOsRawById(ixcId);
    if (!ixcOs || Number(ixcOs.id_estrutura) <= 0) {
      throw new Error(`OS IXC #${ixcId} não encontrada`);
    }

    const statusAnterior = record.status;
    await OrdemServicoLocalService.syncFromIxcOs(ixcId, ixcOs, {}, record.empresa_id);
    await record.reload();

    const statusNovo = record.status;
    const hadStatusChange = statusAnterior !== statusNovo;

    if (hadStatusChange) {
      IxcOsSyncLogService.registrar({
        empresaId: record.empresa_id,
        integracaoId: integracao.id,
        integracaoNome: integracao.nome,
        eventType: 'os_status',
        status: 'info',
        triggerType,
        ordemServicoId: record.id,
        ixcOsId: ixcId,
        protocolo: record.protocolo,
        clienteNome,
        statusAnterior,
        statusNovo,
      });
    }

    const ixcMensagens = await fetchMensagensOs(ixcId);
    const { inseridas } = await OrdemServicoLocalService.syncMensagensFromIxc(
      record,
      ixcMensagens,
      record.empresa_id
    );

    for (const msg of inseridas) {
      const idEvento = String(msg.id_evento ?? '');
      if (idEvento === IXC_EVENTO_OBSERVACAO) {
        IxcOsSyncLogService.registrar({
          empresaId: record.empresa_id,
          integracaoId: integracao.id,
          integracaoNome: integracao.nome,
          eventType: 'os_mensagem',
          status: 'info',
          triggerType,
          ordemServicoId: record.id,
          ixcOsId: ixcId,
          protocolo: record.protocolo,
          clienteNome,
          origemAbertura: 'ixc',
          operadorNome: msg.operador_nome ?? '',
          message: `Nova mensagem sincronizada do IXC (${record.protocolo})`,
        });
      }
    }

    if (statusAnterior !== 'F' && statusNovo === 'F') {
      IxcOsSyncLogService.registrar({
        empresaId: record.empresa_id,
        integracaoId: integracao.id,
        integracaoNome: integracao.nome,
        eventType: 'os_fechamento',
        status: 'info',
        triggerType,
        ordemServicoId: record.id,
        ixcOsId: ixcId,
        protocolo: record.protocolo,
        clienteNome,
        origemAbertura: 'ixc',
        operadorNome: resolveOperadorIxcNome(ixcMensagens, IXC_EVENTO_FINALIZAR),
        message: `OS finalizada no IXC (${record.protocolo})`,
      });
    }
  }

  static async registrarAberturaBacknet(params: {
    record: OrdemServicoLocal;
    integracaoId?: number | null;
    integracaoNome?: string | null;
    usuarioId?: number | null;
    clienteNome?: string | null;
  }): Promise<void> {
    const operadorNome = await fetchUsuarioNomeById(params.usuarioId ?? null);
    IxcOsSyncLogService.registrar({
      empresaId: params.record.empresa_id,
      integracaoId: params.integracaoId,
      integracaoNome: params.integracaoNome,
      eventType: 'os_abertura',
      status: 'success',
      triggerType: 'create',
      ordemServicoId: params.record.id,
      ixcOsId: params.record.ixc_id,
      protocolo: params.record.protocolo,
      clienteNome: params.clienteNome,
      origemAbertura: 'backnet',
      operadorNome,
      message: `OS aberta pelo BackNet (${params.record.protocolo})`,
    });
  }
}
