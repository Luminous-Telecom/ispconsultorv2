import { Request, Response } from 'express';
import { Titulo } from '../../../models/financeiro/Titulo';
import { TituloService } from '../../../services/financeiro/TituloService';
import { Cliente } from '../../../models/clientes/Cliente';
import { Plano } from '../../../models/cadastros/Plano';
import { Banco } from '../../../models/cadastros/Banco';
import { logger } from '../../../utils/logger';
import { BancoApiService } from '../../../services/bancos/BancoApiService';
import { TituloComRelacoes } from '../TituloHelpers/types';
import { registrarAtualizacao } from '../../../services/sistema/AuditoriaService/index';
import type { AuthenticatedRequest } from '../../../types/auth';
import { sendSuccess, sendError, sendNotFound, sendValidationError } from '../../../utils/responseUtils';

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

      const dadosAnteriores = titulo.toJSON();
      const dataPagamentoNormalizada = data_pagamento ? (typeof data_pagamento === 'string' ? new Date(data_pagamento) : data_pagamento) : undefined;
      
      await titulo.marcarComoPago(valor_pago, dataPagamentoNormalizada);
      await titulo.reload();

      await registrarAtualizacao(
        req as AuthenticatedRequest,
        'Titulo',
        titulo.id,
        dadosAnteriores as Record<string, unknown>,
        titulo.toJSON() as Record<string, unknown>
      );

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

      const dadosAnteriores = titulo.toJSON();
      await titulo.desmarcarPago();
      await titulo.reload();

      try {
        await registrarAtualizacao(
          req as AuthenticatedRequest,
          'Titulo',
          titulo.id,
          dadosAnteriores as Record<string, unknown>,
          titulo.toJSON() as Record<string, unknown>
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

      const resultado = await BancoApiService.consultarStatus(titulo as unknown as TituloComRelacoes);

      if (resultado.success && resultado.data) {
        const statusPago = resultado.data.status === 'paid' || resultado.data.status === 'settled';
        
        if (statusPago) {
          const dadosAnteriores = titulo.toJSON();
          const valorPago = resultado.data.valor_pago || titulo.valor;
          const dataPagamento = resultado.data.data_pagamento ? new Date(resultado.data.data_pagamento as string | number) : new Date();

          await titulo.marcarComoPago(Number(valorPago), dataPagamento);
          await titulo.reload();

          try {
            await registrarAtualizacao(
              req as AuthenticatedRequest,
              'Titulo',
              titulo.id,
              dadosAnteriores as Record<string, unknown>,
              titulo.toJSON() as Record<string, unknown>
            );
          } catch (auditError) {
            // Não interromper o fluxo
          }

          sendSuccess(res, { titulo_id: titulo.id, status_novo: titulo.status, valor_pago: valorPago, data_pagamento: dataPagamento }, 'Título atualizado com sucesso');
        } else {
          sendSuccess(res, { titulo_id: titulo.id, status: titulo.status, status_banco: resultado.data.status }, 'Título consultado - sem alterações (ainda não foi pago)');
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

      const dadosAnteriores = titulo.toJSON();
      await titulo.desmarcarPago();
      await titulo.reload();

      try {
        await registrarAtualizacao(
          req as AuthenticatedRequest,
          'Titulo',
          titulo.id,
          dadosAnteriores as Record<string, unknown>,
          titulo.toJSON() as Record<string, unknown>
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

