import { Request, Response } from 'express';
import logger from '../utils/logger';

export class AtualizacoesController {
  static async get(req: Request, res: Response): Promise<void> {
    try {
      // Por enquanto retorna dados mockados
      // No futuro, pode buscar de um banco de dados ou arquivo
      const atualizacoes = [
        {
          id: 1,
          versao: '1.1.0',
          data: '2025-01-27',
          descricao: 'Melhorias e correções no sistema',
          tipo: 'melhoria' as const,
        },
        {
          id: 2,
          versao: '1.0.0',
          data: '2025-01-26',
          descricao: 'Versão inicial do sistema',
          tipo: 'feature' as const,
        }
      ];

      res.json({
        success: true,
        data: atualizacoes,
        versao_atual: atualizacoes[atualizacoes.length - 1].versao
      });
    } catch (error) {
      logger.error('Erro ao buscar atualizações', { error });
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar atualizações'
      });
    }
  }
}

