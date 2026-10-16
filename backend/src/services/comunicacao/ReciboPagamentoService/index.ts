import { Op } from 'sequelize';
import { Titulo } from '../../../models/financeiro/Titulo';
import { Cliente } from '../../../models/clientes/Cliente';
import { Plano } from '../../../models/cadastros/Plano';
import { Banco } from '../../../models/cadastros/Banco';
import { MensagemHistorico } from '../../../models/comunicacao/MensagemHistorico';
import { logger } from '../../../utils/logger';
import { EmailService } from '../EmailService';
import { WhatsAppBoletoService } from '../WhatsAppBoletoService';
import type { TituloComRelacoes } from '../../../controllers/titulos/TituloHelpers/types';

/** Marcador gravado no histórico (assunto do e-mail e título do WhatsApp). */
export const RECIBO_HISTORICO_MARCADOR = 'Recibo de Pagamento';

/** Janela curta para dois webhooks do mesmo pagamento não dispararem o recibo em paralelo. */
const DEDUP_RECIBO_MS = 15 * 60 * 1000;
const recibosRecentes = new Map<number, number>();

/**
 * Serviço que envia recibo de pagamento por email e WhatsApp
 * quando um título é marcado como pago na base.
 */
export class ReciboPagamentoService {
  /**
   * Envia recibo por email e WhatsApp para o título (em background).
   * Só envia se o título estiver pago e existir mensagem ativa "recibo_pagamento".
   * Não bloqueia: erros são apenas logados.
   */
  static enviarRecibo(tituloId: number): void {
    const disparadoEm = recibosRecentes.get(tituloId);
    if (disparadoEm != null && Date.now() - disparadoEm < DEDUP_RECIBO_MS) {
      logger.info('[Recibo] Envio recente já disparado para este título, ignorando', { titulo_id: tituloId });
      return;
    }
    recibosRecentes.set(tituloId, Date.now());

    logger.info('[Recibo] Disparando envio de recibo (título pago)', { titulo_id: tituloId });
    ReciboPagamentoService.enviarReciboAsync(tituloId).catch((err) => {
      recibosRecentes.delete(tituloId);
      logger.error('ReciboPagamentoService.enviarRecibo - falha ao enviar recibo', {
        titulo_id: tituloId,
        error: err instanceof Error ? err.message : String(err)
      });
    });
  }

  private static async enviarReciboAsync(tituloId: number): Promise<void> {
    const titulo = await Titulo.findByPk(tituloId, {
      include: [
        { model: Cliente, as: 'cliente' },
        { model: Plano, as: 'plano' },
        { model: Banco, as: 'banco' }
      ]
    });

    if (!titulo) {
      recibosRecentes.delete(tituloId);
      logger.info('[Recibo] Título não encontrado, ignorando', { titulo_id: tituloId });
      return;
    }
    if (!titulo.pago) {
      recibosRecentes.delete(tituloId);
      logger.info('[Recibo] Título não está pago, ignorando', { titulo_id: tituloId, status: titulo.status });
      return;
    }

    if (await ReciboPagamentoService.reciboJaEnviado(tituloId, titulo.data_pagamento)) {
      logger.info('[Recibo] Recibo deste pagamento já consta no histórico, ignorando', { titulo_id: tituloId });
      return;
    }

    const tituloComRelacoes = titulo as unknown as TituloComRelacoes;
    const cliente = (tituloComRelacoes as TituloComRelacoes & { cliente?: Cliente }).cliente;
    if (!cliente) {
      recibosRecentes.delete(tituloId);
      logger.info('[Recibo] Cliente não encontrado no título, ignorando', { titulo_id: tituloId });
      return;
    }

    logger.info('[Recibo] Enviando recibo por email e WhatsApp', {
      titulo_id: tituloId,
      cliente_id: cliente.id,
      cliente_nome: cliente.razao_social || cliente.nome_fantasia
    });

    const [emailOk, whatsappOk] = await Promise.all([
      EmailService.enviarReciboPagamento(tituloComRelacoes),
      WhatsAppBoletoService.enviarReciboPagamento(titulo, cliente)
    ]);

    logger.info('[Recibo] Resultado do envio', {
      titulo_id: tituloId,
      email_enviado: emailOk,
      whatsapp_enviado: whatsappOk
    });

    if (!emailOk && !whatsappOk) {
      recibosRecentes.delete(tituloId);
    }
  }

  /**
   * Envio manual pelo dropdown Enviar. Não aplica a deduplicação do envio automático:
   * o usuário pediu o recibo de novo. Só títulos pagos (pago ou pago_atraso).
   */
  static async enviarReciboManual(
    tituloId: number,
    empresaId: number | null
  ): Promise<{ sucesso: boolean; mensagem: string }> {
    const titulo = await Titulo.findByPk(tituloId, {
      include: [
        { model: Cliente, as: 'cliente' },
        { model: Plano, as: 'plano' },
        { model: Banco, as: 'banco' }
      ]
    });

    if (!titulo) {
      return { sucesso: false, mensagem: 'Título não encontrado' };
    }

    const tituloEmpresaId = titulo.empresa_id ?? null;
    if (empresaId != null && tituloEmpresaId !== empresaId) {
      return { sucesso: false, mensagem: 'Título não encontrado' };
    }

    if (!titulo.pago || (titulo.status !== 'pago' && titulo.status !== 'pago_atraso')) {
      return { sucesso: false, mensagem: 'Só é possível enviar recibo de título pago' };
    }

    const tituloComRelacoes = titulo as unknown as TituloComRelacoes;
    const cliente = (tituloComRelacoes as TituloComRelacoes & { cliente?: Cliente }).cliente;
    if (!cliente) {
      return { sucesso: false, mensagem: 'Cliente não encontrado' };
    }

    logger.info('[Recibo] Envio manual de recibo', { titulo_id: tituloId, empresa_id: tituloEmpresaId });

    const [emailOk, whatsappOk] = await Promise.all([
      EmailService.enviarReciboPagamento(tituloComRelacoes),
      WhatsAppBoletoService.enviarReciboPagamento(titulo, cliente)
    ]);

    logger.info('[Recibo] Resultado do envio manual', {
      titulo_id: tituloId,
      email_enviado: emailOk,
      whatsapp_enviado: whatsappOk
    });

    if (!emailOk && !whatsappOk) {
      return { sucesso: false, mensagem: 'Não foi possível enviar o recibo' };
    }

    return { sucesso: true, mensagem: 'Recibo enviado com sucesso' };
  }

  /** Recibo já registrado para este pagamento (desde o dia da baixa). */
  private static async reciboJaEnviado(tituloId: number, dataPagamento: Date | string | null): Promise<boolean> {
    const desde = ReciboPagamentoService.inicioDoDiaPagamento(dataPagamento);
    const existente = await MensagemHistorico.findOne({
      where: {
        entidade_tipo: 'titulo',
        entidade_id: tituloId,
        status: 'enviada',
        titulo: { [Op.like]: `%${RECIBO_HISTORICO_MARCADOR}%` },
        ...(desde ? { created_at: { [Op.gte]: desde } } : {}),
      },
      attributes: ['id'],
    });
    return existente != null;
  }

  private static inicioDoDiaPagamento(dataPagamento: Date | string | null): Date | null {
    if (dataPagamento == null || dataPagamento === '') return null;
    if (dataPagamento instanceof Date) {
      if (Number.isNaN(dataPagamento.getTime())) return null;
      return new Date(dataPagamento.getFullYear(), dataPagamento.getMonth(), dataPagamento.getDate());
    }
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dataPagamento);
    if (match) {
      return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }
    const parsed = new Date(dataPagamento);
    if (Number.isNaN(parsed.getTime())) return null;
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }
}
