import { ModeloRecibo } from '../../../models/documentos/ModeloRecibo';

export class ModeloReciboService {
  /**
   * Listar modelos de recibo
   */
  static async list(): Promise<{ success: boolean; data: ModeloRecibo[] }> {
    const recibos = await ModeloRecibo.findAll({
      order: [['created_at', 'DESC']]
    });

    return {
      success: true,
      data: recibos
    };
  }

  /**
   * Buscar modelo por ID
   */
  static async getById(id: string | number): Promise<ModeloRecibo | null> {
    return await ModeloRecibo.findByPk(id);
  }

  /**
   * Criar modelo de recibo
   */
  static async create(dados: Partial<ModeloRecibo>): Promise<ModeloRecibo> {
    return await ModeloRecibo.create(dados as any);
  }

  /**
   * Atualizar modelo de recibo
   */
  static async update(id: string | number, dados: Partial<ModeloRecibo>): Promise<ModeloRecibo> {
    const recibo = await ModeloRecibo.findByPk(id);
    
    if (!recibo) {
      throw new Error('Modelo de recibo não encontrado');
    }
    
    await recibo.update(dados);
    await recibo.reload();
    
    return recibo;
  }

  /**
   * Deletar modelo de recibo
   */
  static async delete(id: string | number): Promise<ModeloRecibo> {
    const recibo = await ModeloRecibo.findByPk(id);
    
    if (!recibo) {
      throw new Error('Modelo de recibo não encontrado');
    }
    
    await recibo.destroy();
    
    return recibo;
  }
}

