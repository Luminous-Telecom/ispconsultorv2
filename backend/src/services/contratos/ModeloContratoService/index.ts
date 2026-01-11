import { ModeloContrato } from '../../../models/contratos/ModeloContrato';
import { WhereOptions } from 'sequelize';

export interface ListModeloContratoFilters {
  tipo?: string;
}

export class ModeloContratoService {
  /**
   * Listar modelos de contrato
   */
  static async list(filters: ListModeloContratoFilters = {}): Promise<{ success: boolean; data: ModeloContrato[] }> {
    const { tipo } = filters;
    
    const whereClause: WhereOptions = {};
    if (tipo) {
      whereClause.tipo = tipo;
    }

    const documentos = await ModeloContrato.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']]
    });

    return {
      success: true,
      data: documentos
    };
  }

  /**
   * Buscar modelo por ID
   */
  static async getById(id: string | number): Promise<ModeloContrato | null> {
    return await ModeloContrato.findByPk(id);
  }

  /**
   * Buscar modelo por tipo (primeiro ativo)
   */
  static async getByTipo(tipo: string, ativo = true): Promise<ModeloContrato | null> {
    return await ModeloContrato.findOne({
      where: { tipo, ativo },
      order: [['created_at', 'ASC']]
    });
  }

  /**
   * Listar tipos disponíveis
   */
  static async getTypes(): Promise<string[]> {
    const tipos = await ModeloContrato.findAll({
      attributes: ['tipo'],
      group: ['tipo'],
      order: [['tipo', 'ASC']]
    });

    return tipos.map((doc) => doc.tipo);
  }

  /**
   * Criar modelo de contrato
   */
  static async create(dados: Partial<ModeloContrato>): Promise<ModeloContrato> {
    return await ModeloContrato.create(dados as any);
  }

  /**
   * Atualizar modelo de contrato
   */
  static async update(id: string | number, dados: Partial<ModeloContrato>): Promise<ModeloContrato> {
    const documento = await ModeloContrato.findByPk(id);
    
    if (!documento) {
      throw new Error('Modelo de contrato não encontrado');
    }
    
    await documento.update(dados);
    await documento.reload();
    
    return documento;
  }

  /**
   * Deletar modelo de contrato
   */
  static async delete(id: string | number): Promise<ModeloContrato> {
    const documento = await ModeloContrato.findByPk(id);
    
    if (!documento) {
      throw new Error('Modelo de contrato não encontrado');
    }
    
    await documento.destroy();
    
    return documento;
  }
}

