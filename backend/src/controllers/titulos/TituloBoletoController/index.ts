import { toPlain } from '../../../utils/toPlain';
import { Request, Response } from 'express';
import { Titulo } from '../../../models/financeiro/Titulo';
import { TituloService } from '../../../services/financeiro/TituloService';
import { Cliente } from '../../../models/clientes/Cliente';
import { Plano } from '../../../models/cadastros/Plano';
import { Banco } from '../../../models/cadastros/Banco';
import { logger } from '../../../utils/logger';
import { BancoApiService } from '../../../services/bancos/BancoApiService';
import { TituloComRelacoes } from '../TituloHelpers/types';
import {
  extrairStatusConsultaBanco,
  extrairValorPagoConsultaBanco,
  isStatusPagoNoBanco,
} from '../TituloHelpers';
import { registrarAtualizacao } from '../../../services/sistema/AuditoriaService/index';
import type { AuthenticatedRequest } from '../../../types/auth';
import { sendSuccess, sendError, sendNotFound, sendValidationError } from '../../../utils/responseUtils';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';
import { PaymentCommonService } from '../../../services/webhooks/PaymentCommonService';
import { ReciboPagamentoService } from '../../../services/comunicacao/ReciboPagamentoService';
import type { JsonValue } from '../../../types/index';

export class TituloBoletoController {
  
  /**
   * Marca título como pago
   */
  public static async marcarComoPago(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { valor_pago, data_pagamento } = req.body;

      const titulo = await TituloService.getById(id);
      if (!titulo) {
        sendNotFound(res, 'Título não encontrado');
        return;
      }

      if (titulo.status === 'cancelado') {
        sendValidationError(res, 'Não é possível marcar como pago um título cancelado');
        return;
      }
      if (titulo.status === 'pago') {
        sendValidationError(res, 'Este título já foi marcado como pago');
        return;
      }

      const dadosAnteriores = toPlain(titulo);
      // Usar normalizePaymentDate para interpretar "YYYY-MM-DD" como data local (evita 21h por timezone UTC)
      const dataPagamentoNormalizada = data_pagamento
        ? (typeof data_pagamento === 'string'
            ? PaymentCommonService.normalizePaymentDate(data_pagamento) ?? undefined
            : data_pagamento)
        : undefined;

      await titulo.marcarComoPago(valor_pago, dataPagamentoNormalizada);
      await TituloService.reloadTituloComRelacoes(titulo);

      const empresaIdAudit = getEmpresaIdOrNull(req) ?? titulo.empresa_id ?? null;
      await registrarAtualizacao(
        req as AuthenticatedRequest,
        'Titulo',
        titulo.id,
        dadosAnteriores as Record<string, unknown>,
        toPlain(titulo) as Record<string, unknown>,
        undefined,
        empresaIdAudit
      );

      if (titulo.pago) {
        ReciboPagamentoService.enviarRecibo(titulo.id);
      }
      sendSuccess(res, titulo, 'Título marcado como pago');
    } catch (error: unknown) {
      sendError(res, error, 'Erro interno do servidor', 500, true, {
        context: 'TituloBoletoController',
        action: 'marcarComoPago'
      });
    }
  }

  /**
   * Desmarca título como pago
   */
  public static async desmarcarPago(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const titulo = await TituloService.getById(id);
      if (!titulo) {
        sendNotFound(res, 'Título não encontrado');
        return;
      }

      const dadosAnteriores = toPlain(titulo);
      await titulo.desmarcarPago();
      await TituloService.reloadTituloComRelacoes(titulo);

      try {
        const empresaIdAudit = getEmpresaIdOrNull(req) ?? titulo.empresa_id ?? null;
        await registrarAtualizacao(
          req as AuthenticatedRequest,
          'Titulo',
          titulo.id,
          dadosAnteriores as Record<string, unknown>,
          toPlain(titulo) as Record<string, unknown>,
          undefined,
          empresaIdAudit
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }

      sendSuccess(res, titulo, 'Título desmarcado como pago');
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao desmarcar título como pago', 500, true);
    }
  }

  /**
   * Consulta recebimento na API do banco
   */
  public static async consultarRecebimento(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const titulo = await TituloService.getById(id);

      if (!titulo) {
        sendNotFound(res, 'Título não encontrado');
        return;
      }
      if (!titulo.charge_id) {
        sendValidationError(res, 'Título não possui charge_id (não foi registrado no banco)');
        return;
      }

      const resultado = await BancoApiService.consultarStatus(
        titulo as unknown as Parameters<typeof BancoApiService.consultarStatus>[0]
      );

      if (resultado.success && (resultado.data || resultado.status)) {
        const statusBanco = extrairStatusConsultaBanco({
          status: resultado.status,
          data: resultado.data as Record<string, JsonValue | undefined> | undefined,
        });
        const statusPago = isStatusPagoNoBanco(statusBanco);

        if (statusPago && !titulo.pago) {
          const dadosAnteriores = toPlain(titulo);
          const valorPago = extrairValorPagoConsultaBanco(
            { data: resultado.data as Record<string, JsonValue | undefined> | undefined },
            Number(titulo.valor)
          );
          const rawData = (resultado.data as { data_pagamento?: unknown } | undefined)?.data_pagamento;
          const dataPagamento = rawData
            ? (typeof rawData === 'string'
                ? PaymentCommonService.normalizePaymentDate(rawData) ?? new Date()
                : typeof rawData === 'number' || rawData instanceof Date
                  ? new Date(rawData)
                  : new Date())
            : new Date();

          // Banco já confirma o pagamento — não chamar /settle de novo (EFI retorna 500 se já settled).
          await titulo.marcarComoPago(Number(valorPago), dataPagamento, true);
          await TituloService.reloadTituloComRelacoes(titulo);

          try {
            const empresaIdAudit = getEmpresaIdOrNull(req) ?? titulo.empresa_id ?? null;
            await registrarAtualizacao(
              req as AuthenticatedRequest,
              'Titulo',
              titulo.id,
              dadosAnteriores as Record<string, unknown>,
              toPlain(titulo) as Record<string, unknown>,
              undefined,
              empresaIdAudit
            );
          } catch (auditError) {
            // Não interromper o fluxo
          }

          ReciboPagamentoService.enviarRecibo(titulo.id);
          sendSuccess(res, { titulo_id: titulo.id, status_novo: titulo.status, valor_pago: valorPago, data_pagamento: dataPagamento }, 'Título atualizado com sucesso — pagamento confirmado no banco');
        } else if (statusPago) {
          sendSuccess(res, { titulo_id: titulo.id, status: titulo.status, status_banco: statusBanco }, 'Título já estava pago');
        } else {
          sendSuccess(res, { titulo_id: titulo.id, status: titulo.status, status_banco: statusBanco }, 'Título consultado - sem alterações (ainda não foi pago)');
        }
      } else {
        sendError(res, new Error(resultado.message || 'Erro ao consultar status no banco'), resultado.message || 'Erro ao consultar status no banco', 400, false);
      }
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao consultar recebimento', 500, true);
    }
  }

  /**
   * Estorna título pago
   */
  public static async estornar(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const titulo = await TituloService.getById(id);
      if (!titulo) {
        sendNotFound(res, 'Título não encontrado');
        return;
      }

      const statusPermitido = ['pago', 'pago_atraso', 'parcial'].includes(titulo.status || '');
      if (!statusPermitido) {
        sendValidationError(res, 'Só é possível estornar títulos que estão pagos');
        return;
      }

      const dadosAnteriores = toPlain(titulo);
      await titulo.desmarcarPago();
      await TituloService.reloadTituloComRelacoes(titulo);

      try {
        const empresaIdAudit = getEmpresaIdOrNull(req) ?? titulo.empresa_id ?? null;
        await registrarAtualizacao(
          req as AuthenticatedRequest,
          'Titulo',
          titulo.id,
          dadosAnteriores as Record<string, unknown>,
          toPlain(titulo) as Record<string, unknown>,
          undefined,
          empresaIdAudit
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }

      sendSuccess(res, titulo, 'Título estornado com sucesso');
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao estornar título', 500, true);
    }
  }
}

