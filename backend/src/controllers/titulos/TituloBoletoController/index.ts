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
        res.status(404).json({ success: false, message: 'Título não encontrado' });
        return;
      }

      if (titulo.status === 'cancelado') {
        res.status(400).json({ success: false, message: 'Não é possível marcar como pago um título cancelado' });
        return;
      }
      if (titulo.status === 'pago') {
        res.status(400).json({ success: false, message: 'Este título já foi marcado como pago' });
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

      res.json({ success: true, message: 'Título marcado como pago', data: titulo });
    } catch (error: unknown) {
      logger.error('Erro ao marcar título como pago', { error });
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
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
        res.status(404).json({ success: false, message: 'Título não encontrado' });
        return;
      }

      const dadosAnteriores = titulo.toJSON();
      await titulo.desmarcarPago();
      await titulo.reload();

      await registrarAtualizacao(
        req as AuthenticatedRequest,
        'Titulo',
        titulo.id,
        dadosAnteriores as Record<string, unknown>,
        titulo.toJSON() as Record<string, unknown>
      );

      res.json({ success: true, message: 'Título desmarcado como pago', data: titulo });
    } catch (error: unknown) {
      logger.error('Erro ao desmarcar título como pago', { error });
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
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
        res.status(404).json({ success: false, message: 'Título não encontrado' });
        return;
      }
      if (!titulo.charge_id) {
        res.status(400).json({ success: false, message: 'Título não possui charge_id (não foi registrado no banco)' });
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

          await registrarAtualizacao(
            req as AuthenticatedRequest,
            'Titulo',
            titulo.id,
            dadosAnteriores as Record<string, unknown>,
            titulo.toJSON() as Record<string, unknown>
          );

          res.json({
            success: true,
            message: 'Título atualizado com sucesso',
            data: { titulo_id: titulo.id, status_novo: titulo.status, valor_pago: valorPago, data_pagamento: dataPagamento }
          });
        } else {
          res.json({
            success: true,
            message: 'Título consultado - sem alterações (ainda não foi pago)',
            data: { titulo_id: titulo.id, status: titulo.status, status_banco: resultado.data.status }
          });
        }
      } else {
        res.status(400).json({ success: false, message: resultado.message || 'Erro ao consultar status no banco' });
      }
    } catch (error: unknown) {
      logger.error('Erro ao consultar recebimento', { error });
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
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
        res.status(404).json({ success: false, message: 'Título não encontrado' });
        return;
      }

      if (titulo.status !== 'pago') {
        res.status(400).json({ success: false, message: 'Só é possível estornar títulos que estão pagos' });
        return;
      }

      const dadosAnteriores = titulo.toJSON();
      await titulo.desmarcarPago();
      await titulo.reload();

      await registrarAtualizacao(
        req as AuthenticatedRequest,
        'Titulo',
        titulo.id,
        dadosAnteriores as Record<string, unknown>,
        titulo.toJSON() as Record<string, unknown>
      );

      res.json({ success: true, message: 'Título estornado com sucesso', data: titulo });
    } catch (error: unknown) {
      logger.error('Erro ao estornar título', { error });
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }
}

