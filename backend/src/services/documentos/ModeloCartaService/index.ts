import { ModeloCarta } from '../../../models/documentos/ModeloCarta';

export class ModeloCartaService {
  /**
   * Listar modelos de carta
   */
  static async list(): Promise<{ success: boolean; data: ModeloCarta[] }> {
    const cartas = await ModeloCarta.findAll({
      order: [['created_at', 'DESC']]
    });

    return {
      success: true,
      data: cartas
    };
  }

  /**
   * Buscar modelo por ID
   */
  static async getById(id: string | number): Promise<ModeloCarta | null> {
    return await ModeloCarta.findByPk(id);
  }

  /**
   * Criar modelo de carta
   */
  static async create(dados: Partial<ModeloCarta>): Promise<ModeloCarta> {
    return await ModeloCarta.create(dados as any);
  }

  /**
   * Atualizar modelo de carta
   */
  static async update(id: string | number, dados: Partial<ModeloCarta>): Promise<ModeloCarta> {
    const carta = await ModeloCarta.findByPk(id);
    
    if (!carta) {
      throw new Error('Modelo de carta não encontrado');
    }
    
    await carta.update(dados);
    await carta.reload();
    
    return carta;
  }

  /**
   * Deletar modelo de carta
   */
  static async delete(id: string | number): Promise<ModeloCarta> {
    const carta = await ModeloCarta.findByPk(id);
    
    if (!carta) {
      throw new Error('Modelo de carta não encontrado');
    }
    
    await carta.destroy();
    
    return carta;
  }
}

