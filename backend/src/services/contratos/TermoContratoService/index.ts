import { TermoContrato } from '../../../models/contratos/TermoContrato';
import { SortHelper } from '../../../utils/sortHelper';
import { TERMO_CONTRATO_SORT_CONFIG } from '../../../config/sortConfigs';
import { logger } from '../../../utils/logger';

export interface GetByContratoOptions {
  sortColumn?: string;
  sortDirection?: 'ASC' | 'DESC';
}

export class TermoContratoService {
  /**
   * Buscar termos por contrato com ordenação
   */
  static async getByContrato(contratoId: number, options?: GetByContratoOptions): Promise<TermoContrato[]> {
    const { sortColumn, sortDirection } = options || {};

    // Construir ordenação - ordena TODOS os dados antes da paginação
    let order: any[] = [['created_at', 'DESC']]; // Padrão
    if (sortColumn && sortDirection) {
      const sortResult = SortHelper.buildOrder(
        TERMO_CONTRATO_SORT_CONFIG,
        sortColumn,
        sortDirection.toUpperCase() as 'ASC' | 'DESC'
      );

      if (sortResult.isValid) {
        order = sortResult.order;
      } else {
        logger.warn('TermoContratoService.getByContrato - Coluna de ordenação inválida', {
          column: sortColumn,
          error: sortResult.error
        });
        // Manter ordenação padrão se coluna inválida
      }
    }

    return await TermoContrato.findAll({
      where: { contrato_id: contratoId },
      include: [
        {
          association: 'modeloDocumento',
          attributes: ['id', 'nome', 'tipo']
        }
      ],
      order
    });
  }

  /**
   * Buscar termo por ID
   */
  static async getById(id: string | number): Promise<TermoContrato | null> {
    return await TermoContrato.findByPk(id);
  }

  /**
   * Listar todos os termos
   */
  static async list(ativo?: boolean): Promise<TermoContrato[]> {
    const where: any = {};
    if (ativo !== undefined) {
      where.ativo = ativo;
    }
    
    return await TermoContrato.findAll({
      where,
      include: [
        {
          association: 'contrato',
          include: [
            { association: 'cliente' },
            { association: 'plano' }
          ]
        }
      ],
      order: [['created_at', 'DESC']]
    });
  }

  /**
   * Criar termo
   */
  static async create(dados: Partial<TermoContrato>): Promise<TermoContrato> {
    return await TermoContrato.create(dados as any);
  }

  /**
   * Atualizar termo
   */
  static async update(id: string | number, dados: Partial<TermoContrato>): Promise<TermoContrato> {
    const termo = await TermoContrato.findByPk(id);
    
    if (!termo) {
      throw new Error('Termo não encontrado');
    }
    
    await termo.update(dados);
    await termo.reload();
    
    return termo;
  }

  /**
   * Deletar termo
   */
  static async delete(id: string | number): Promise<TermoContrato> {
    const termo = await TermoContrato.findByPk(id);
    
    if (!termo) {
      throw new Error('Termo não encontrado');
    }
    
    await termo.destroy();
    
    return termo;
  }
}

