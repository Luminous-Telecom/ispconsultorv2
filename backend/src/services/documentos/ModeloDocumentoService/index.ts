import { ModeloDocumento } from '../../../models/documentos/ModeloDocumento';
import { WhereOptions } from 'sequelize';

export interface ListModeloDocumentoFilters {
  tipo?: string;
  ativo?: boolean;
}

export class ModeloDocumentoService {
  /**
   * Listar modelos de documento
   */
  static async list(filters: ListModeloDocumentoFilters = {}): Promise<{ success: boolean; data: ModeloDocumento[] }> {
    const { tipo, ativo } = filters;
    
    const whereClause: WhereOptions = {};
    if (tipo) {
      whereClause.tipo = tipo;
    }
    if (ativo !== undefined) {
      whereClause.ativo = ativo;
    }

    const documentos = await ModeloDocumento.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']]
    });

    return {
      success: true,
      data: documentos
    };
  }

  /**
   * Buscar modelos por tipo
   */
  static async getByType(tipo: string, ativo: boolean = true): Promise<ModeloDocumento[]> {
    return await ModeloDocumento.findAll({
      where: { 
        tipo: tipo as any, 
        ativo 
      },
      order: [['nome', 'ASC']]
    });
  }

  /**
   * Buscar modelo padrão por tipo
   */
  static async getDefaultByType(tipo: string): Promise<ModeloDocumento | null> {
    return await ModeloDocumento.findOne({
      where: { 
        tipo: tipo as any, 
        ativo: true 
      },
      order: [['created_at', 'ASC']]
    });
  }

  /**
   * Listar tipos disponíveis
   */
  static async getTypes(): Promise<string[]> {
    const tipos = await ModeloDocumento.findAll({
      attributes: ['tipo'],
      group: ['tipo'],
      where: { ativo: true },
      order: [['tipo', 'ASC']]
    });

    return tipos.map((doc) => doc.tipo);
  }

  /**
   * Buscar modelo por ID
   */
  static async getById(id: string | number): Promise<ModeloDocumento | null> {
    return await ModeloDocumento.findByPk(id);
  }

  /**
   * Criar modelo de documento
   */
  static async create(dados: Partial<ModeloDocumento>): Promise<ModeloDocumento> {
    return await ModeloDocumento.create(dados as any);
  }

  /**
   * Atualizar modelo de documento
   */
  static async update(id: string | number, dados: Partial<ModeloDocumento>): Promise<ModeloDocumento> {
    const documento = await ModeloDocumento.findByPk(id);
    
    if (!documento) {
      throw new Error('Modelo de documento não encontrado');
    }
    
    await documento.update(dados);
    await documento.reload();
    
    return documento;
  }

  /**
   * Deletar modelo de documento
   */
  static async delete(id: string | number): Promise<ModeloDocumento> {
    const documento = await ModeloDocumento.findByPk(id);
    
    if (!documento) {
      throw new Error('Modelo de documento não encontrado');
    }
    
    await documento.destroy();
    
    return documento;
  }
}

