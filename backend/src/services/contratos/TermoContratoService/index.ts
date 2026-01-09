import { TermoContrato } from '../../../models/contratos/TermoContrato';

export class TermoContratoService {
  /**
   * Buscar termos por contrato
   */
  static async getByContrato(contratoId: number): Promise<TermoContrato[]> {
    return await TermoContrato.findByContrato(contratoId);
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

