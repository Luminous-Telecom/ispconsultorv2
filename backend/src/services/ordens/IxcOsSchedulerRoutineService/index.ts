import type { integracao_ixc_provedor, ordens_servico } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { logger } from '../../../utils/logger';
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
  fetchOsRawById,
  fetchOsForSync,
  fetchOsListForImport,
  indexOsListById,
  resolveClienteIdFromOs,
} from '../../externos/IxcOssChamadoService/ossData';
import type { IxcOssChamado } from '../../externos/IxcOssChamadoService/types';
import { mapMensagensIxcOperadorIspconsultor } from '../ordemServicoMensagemFormat';
import { SYSTEM_NAME } from '../../../constants/systemBrand';
import { OrdemServicoLocalService, fetchUsuarioNomeById } from '../OrdemServicoLocalService';
import { IxcOsSyncLogService } from '../IxcOsSyncLogService';

interface SchedulerResult {
  success: boolean;
  message: string;
  total: number;
  sucesso: number;
  erro: number;
  ignoradas?: number;
  desvinculadas?: number;
  importadas?: number;
}

type MirrorSyncResult = 'synced' | 'ignorada' | 'desvinculada';

interface ClienteVinculo {
  clienteId: number;
  empresaId: number | null;
  clienteNome: string;
}

async function listClientesPorIntegracao(integracaoId: number): Promise<ClienteVinculo[]> {
  const vinculos = await prisma.contratos_integracao_ixc_vinculos.findMany({
    where: { integracao_ixc_provedor_id: integracaoId },
    include: {
      contratos: {
        select: {
          cliente_id: true,
          empresa_id: true,
          clientes: { select: { id: true, razao_social: true, nome_fantasia: true } },
        },
      },
    },
  });

  const mapa = new Map<number, ClienteVinculo>();
  for (const vinculo of vinculos) {
    const contrato = vinculo.contratos;
    const cliente = contrato?.clientes;
    if (!cliente) continue;

    mapa.set(cliente.id, {
      clienteId: cliente.id,
      empresaId: contrato.empresa_id ?? null,
      clienteNome: clienteNomeParaOrdemServico(cliente, cliente.id),
    });
  }

  return [...mapa.values()];
}

function resolveClienteParaImportacao(
  os: IxcOssChamado,
  clienteIdSet: Set<number>,
  clientes: ClienteVinculo[]
): ClienteVinculo | null {
  const porIdx = resolveClienteIdFromOs(os, clienteIdSet);
  if (porIdx != null) {
    return clientes.find((c) => c.clienteId === porIdx) ?? null;
  }
  return clientes[0] ?? null;
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
    integracao: integracao_ixc_provedor,
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
    let ignoradas = 0;
    let desvinculadas = 0;
    let importadas = 0;
    let encontradasIxc = 0;
    let clienteVinculados = 0;

    await runWithIntegracaoCredentials({ apiUrl, apiToken }, async () => {
      const clientes = await listClientesPorIntegracao(integracao.id);
      clienteVinculados = clientes.length;
      const clienteIdSet = new Set(clientes.map((c) => c.clienteId));

      const ixcOsBulk = await fetchOsListForImport(clientes.map((c) => c.clienteId));
      encontradasIxc = ixcOsBulk.length;
      const bulkById = indexOsListById(ixcOsBulk);

      const mirrors = await prisma.ordens_servico.findMany({
        where: {
          ixc_id: { not: null },
          ...(integracao.empresa_id != null ? { empresa_id: integracao.empresa_id } : {}),
        },
      });

      const mirrorsPorIxcId = new Map(mirrors.map((m) => [String(m.ixc_id).trim(), m]));

      for (const mirror of mirrors) {
        processadas++;
        try {
          const resultado = await IxcOsSchedulerRoutineService.syncMirrorRecord(
            mirror,
            integracao,
            triggerType,
            clientes.find((c) => c.clienteId === mirror.cliente_id)?.clienteNome ?? '',
            bulkById
          );
          if (resultado === 'synced') sucesso++;
          else if (resultado === 'desvinculada') desvinculadas++;
          else ignoradas++;
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

      for (const ixcOs of ixcOsBulk) {
        const ixcId = String(ixcOs.id ?? '').trim();
        if (!ixcId || mirrorsPorIxcId.has(ixcId)) continue;

        const cliente = resolveClienteParaImportacao(ixcOs, clienteIdSet, clientes);
        if (!cliente) continue;

        processadas++;
        try {
          const record = await OrdemServicoLocalService.createIxcMirror(
            ixcOs,
            {},
            cliente.empresaId,
            null,
            cliente.clienteId
          );
          mirrorsPorIxcId.set(ixcId, record);
          importadas++;
          sucesso++;

          const ixcMensagens = mapMensagensIxcOperadorIspconsultor(await fetchMensagensOs(ixcId));

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
            operadorNome:
              ixcMensagens.find((m) => String(m.id_evento) === IXC_EVENTO_ABERTURA)?.operador_nome ?? '',
            message: `OS aberta diretamente no IXC Provedor (${record.protocolo})`,
          });

          const { inseridas } = await OrdemServicoLocalService.syncMensagensFromIxc(
            record,
            ixcMensagens,
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
        } catch (err) {
          erro++;
          logger.warn('IxcOsSchedulerRoutineService: erro ao importar OS do IXC', {
            context: 'IxcOsSchedulerRoutineService',
            clienteId: cliente.clienteId,
            ixcOsId: ixcId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    });

    let message: string;
    if (clienteVinculados === 0) {
      message = `IXC OS (${integracao.nome}): nenhum cliente vinculado à integração`;
    } else if (processadas === 0) {
      message = `IXC OS (${integracao.nome}): ${encontradasIxc} OS no IXC, nada a sincronizar`;
    } else {
      const partes = [`${sucesso}/${processadas} OS sincronizadas`];
      if (importadas > 0) partes.push(`${importadas} importadas`);
      if (desvinculadas > 0) partes.push(`${desvinculadas} desvinculadas`);
      if (ignoradas > 0) partes.push(`${ignoradas} ignoradas`);
      if (erro > 0) partes.push(`${erro} com erro`);
      message = `IXC OS (${integracao.nome}): ${partes.join(', ')}`;
    }

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
      ignoradas,
      desvinculadas,
      importadas,
    };
  }

  private static async syncMirrorRecord(
    record: ordens_servico,
    integracao: integracao_ixc_provedor,
    triggerType: 'scheduled' | 'manual',
    clienteNome: string,
    bulkById: Map<string, IxcOssChamado>
  ): Promise<MirrorSyncResult> {
    const ixcId = String(record.ixc_id ?? '').trim();
    if (!ixcId) return 'ignorada';

    const ixcOs = await fetchOsForSync(ixcId, bulkById);
    if (!ixcOs?.id) {
      await prisma.ordens_servico.update({
        where: { id: record.id },
        data: { ixc_id: null, updated_at: new Date() },
      });
      record.ixc_id = null;
      return 'desvinculada';
    }

    const statusAnterior = record.status;
    await OrdemServicoLocalService.syncFromIxcOs(ixcId, ixcOs, {}, record.empresa_id);
    const refreshed = await prisma.ordens_servico.findUnique({ where: { id: record.id } });
    if (refreshed) Object.assign(record, refreshed);

    const statusNovo = record.status;
    if (statusAnterior !== statusNovo) {
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
      if (String(msg.id_evento) === IXC_EVENTO_OBSERVACAO) {
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
        operadorNome:
          mapMensagensIxcOperadorIspconsultor(ixcMensagens).find(
            (m) => String(m.id_evento) === IXC_EVENTO_FINALIZAR
          )?.operador_nome ?? '',
        message: `OS finalizada no IXC (${record.protocolo})`,
      });
    }

    return 'synced';
  }

  static async registrarAberturaIspconsultor(params: {
    record: ordens_servico;
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
      origemAbertura: 'ispconsultor' as const,
      operadorNome,
      message: `OS aberta pelo ${SYSTEM_NAME} (${params.record.protocolo})`,
    });
  }
}
