import { Request, Response } from 'express';
import { DiasVencimento } from '../models/DiasVencimento';
import { logger } from '../utils/logger';

export class DiasVencimentoController {
  /**
   * Buscar configuração de dias de vencimento
   */
  static async get(req: Request, res: Response): Promise<void> {
    try {
      const dias = await DiasVencimento.findAll({
        order: [['dia', 'ASC']],
      });

      res.json({
        success: true,
        data: dias,
        message: 'Dias de vencimento encontrados'
      });
    } catch (error) {
      logger.error('Erro ao buscar dias de vencimento:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Atualizar configuração de dias de vencimento
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { dias } = req.body;
      
      await DiasVencimento.update({ ativo: false }, { where: {} });
      
      if (dias.length > 0) {
        await DiasVencimento.update({ ativo: true }, { where: { dia: dias } });
      }

      res.json({ success: true, message: 'Dias de vencimento atualizados com sucesso' });
    } catch (error) {
      logger.error('Erro ao atualizar dias de vencimento:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { dias } = req.body;
      
      await DiasVencimento.update({ ativo: false }, { where: {} });
      
      if (dias.length > 0) {
        await DiasVencimento.update({ ativo: true }, { where: { dia: dias } });
      }

      res.status(201).json({ success: true, message: 'Dias de vencimento criados com sucesso' });
    } catch (error) {
      logger.error('Erro ao criar dias de vencimento:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

}
