import { prisma } from '../../../db/prisma';
import { logger } from '../../../utils/logger';
import { EmailService } from '../EmailService';
import { WhatsAppService } from '../WhatsAppService';
import { HISTORICO_ORIGEM_ERP } from '../mensagemHistoricoOrigens';
import {
  mensagemHistoricoFromLog,
  whereFalhasCobrancaLog,
} from '../../sistema/mensagemHistoricoLog';
import {
  selecionarFalhasCobrancaPendentes,
  tituloAceitaReenvioCobranca,
  type CanalNotificacao,
  type HistoricoCobrancaRow,
  type OrigemHistorico,
} from './selecao';

const LIMITE_REENVIO = 50;

export interface ReenviarFalhasInput {
  tipo: CanalNotificacao;
  ids?: number[];
  /** null = admin/SaaS sem filtro de tenant */
  empresaId: number | null;
  origens: OrigemHistorico[];
}

export interface ReenviarFalhasResultado {
  total: number;
  reenviadas: number;
  erros: number;
  ignoradas: number;
}

export class ReenviarNotificacoesCobrancaService {
  static async reenviar(input: ReenviarFalhasInput): Promise<ReenviarFalhasResultado> {
    const origens = input.origens.length > 0 ? input.origens : [HISTORICO_ORIGEM_ERP];
    const erros = (await prisma.sistema_logs_operacionais.findMany({
      where: whereFalhasCobrancaLog({
        tipo: input.tipo,
        origens,
        empresaId: input.empresaId,
        ids: input.ids,
        status: 'erro',
      }),
      orderBy: { created_at: 'desc' },
      take: 500,
    })).map(mensagemHistoricoFromLog);

    if (erros.length === 0) {
      return { total: 0, reenviadas: 0, erros: 0, ignoradas: 0 };
    }

    const entidadeIds = [...new Set(erros.map((row) => row.entidade_id).filter((id): id is number => id != null && id > 0))];
    const maisAntigo = erros.reduce((min, row) => {
      const em = new Date(row.created_at).getTime();
      return em < min ? em : min;
    }, new Date(erros[0].created_at).getTime());

    const sucessos = (await prisma.sistema_logs_operacionais.findMany({
      where: whereFalhasCobrancaLog({
        tipo: input.tipo,
        origens,
        empresaId: input.empresaId,
        status: 'enviada',
        createdAfter: new Date(maisAntigo),
        entidadeIds,
      }),
    })).map(mensagemHistoricoFromLog);

    const pendentes = selecionarFalhasCobrancaPendentes([
      ...erros,
      ...sucessos,
    ] as HistoricoCobrancaRow[]).slice(0, LIMITE_REENVIO);

    let reenviadas = 0;
    let falhas = 0;
    let ignoradas = 0;

    for (const falha of pendentes) {
      const tituloId = falha.entidade_id;
      if (tituloId == null) {
        ignoradas += 1;
        continue;
      }

      const estado = await this.carregarEstadoTitulo(falha.historico_origem, tituloId);
      if (!tituloAceitaReenvioCobranca(estado)) {
        ignoradas += 1;
        continue;
      }

      const resultado = await this.enviar(falha.historico_origem, falha.tipo, tituloId);
      if (resultado.sucesso) {
        reenviadas += 1;
      } else {
        falhas += 1;
        logger.warn('Falha ao reenviar notificação de cobrança', {
          context: 'ReenviarNotificacoesCobrancaService',
          historico_id: falha.id,
          entidade_id: tituloId,
          tipo: falha.tipo,
          historico_origem: falha.historico_origem,
          mensagem: resultado.mensagem,
        });
      }
    }

    return {
      total: pendentes.length,
      reenviadas,
      erros: falhas,
      ignoradas,
    };
  }

  private static async carregarEstadoTitulo(_origem: OrigemHistorico, tituloId: number) {
    const titulo = await prisma.financeiro_titulos.findUnique({
      where: { id: Number(tituloId) },
      select: { id: true, status: true, pago: true },
    });
    if (!titulo) return null;
    return { status: titulo.status, pago: !!titulo.pago };
  }

  private static async enviar(
    origem: OrigemHistorico,
    tipo: CanalNotificacao,
    tituloId: number
  ): Promise<{ sucesso: boolean; mensagem?: string }> {
    if (tipo === 'email') return EmailService.enviarTituloManual(tituloId);
    return WhatsAppService.enviarTituloManual(tituloId);
  }
}
