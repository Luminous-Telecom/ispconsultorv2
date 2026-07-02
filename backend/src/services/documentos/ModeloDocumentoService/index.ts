import { Op } from 'sequelize';
import { ModeloDocumento } from '../../../models/documentos/ModeloDocumento';
import { WhereOptions } from 'sequelize';

export interface ListModeloDocumentoFilters {
  tipo?: string;
  ativo?: boolean;
  empresa_id?: number | null;
}

export class ModeloDocumentoService {
  /**
   * Listar modelos de documento (filtra por empresa_id quando informado)
   */
  static async list(filters: ListModeloDocumentoFilters = {}): Promise<{ success: boolean; data: ModeloDocumento[] }> {
    const { tipo, ativo, empresa_id } = filters;
    
    const whereClause: WhereOptions = {};
    if (tipo) {
      whereClause.tipo = tipo;
    }
    if (ativo !== undefined) {
      whereClause.ativo = ativo;
    }
    if (typeof empresa_id === 'number') {
      (whereClause as WhereOptions & { [Op.or]?: unknown[] })[Op.or] = [{ empresa_id }, { empresa_id: null }];
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
   * Buscar modelos por tipo (filtra por empresa_id quando informado)
   */
  static async getByType(tipo: string, ativo = true, empresaId?: number | null): Promise<ModeloDocumento[]> {
    const where: WhereOptions = { tipo: tipo as never, ativo };
    if (typeof empresaId === 'number') {
      (where as WhereOptions & { [Op.or]?: unknown[] })[Op.or] = [{ empresa_id: empresaId }, { empresa_id: null }];
    }
    return await ModeloDocumento.findAll({
      where,
      order: [['nome', 'ASC']]
    });
  }

  /**
   * Buscar modelo padrão por tipo (filtra por empresa_id quando informado)
   */
  static async getDefaultByType(tipo: string, empresaId?: number | null): Promise<ModeloDocumento | null> {
    const where: WhereOptions = { tipo: tipo as never, ativo: true };
    if (typeof empresaId === 'number') {
      (where as WhereOptions & { [Op.or]?: unknown[] })[Op.or] = [{ empresa_id: empresaId }, { empresa_id: null }];
    }
    return await ModeloDocumento.findOne({
      where,
      order: [['created_at', 'ASC']]
    });
  }

  /**
   * Listar tipos disponíveis (filtra por empresa_id quando informado)
   */
  static async getTypes(empresaId?: number | null): Promise<string[]> {
    const where: WhereOptions = { ativo: true };
    if (typeof empresaId === 'number') {
      (where as WhereOptions & { [Op.or]?: unknown[] })[Op.or] = [{ empresa_id: empresaId }, { empresa_id: null }];
    }
    const tipos = await ModeloDocumento.findAll({
      attributes: ['tipo'],
      group: ['tipo'],
      where,
      order: [['tipo', 'ASC']]
    });

    return tipos.map((doc) => doc.tipo);
  }

  /**
   * Modelo de contrato com aba Recibos preenchida (única fonte do PDF de recibo).
   * Prioriza o modelo vinculado ao contrato; senão, o primeiro contrato ativo da empresa.
   */
  static async resolveModeloReciboContrato(params: {
    empresaId?: number | null;
    modeloDocumentoId?: number | null;
  }): Promise<ModeloDocumento | null> {
    const { empresaId, modeloDocumentoId } = params;

    const temRecibo = (modelo: ModeloDocumento): boolean =>
      Boolean(modelo.conteudo_recibo?.trim());

    if (modeloDocumentoId) {
      const vinculado = await this.getById(modeloDocumentoId);
      if (vinculado?.tipo === 'contrato' && vinculado.ativo && temRecibo(vinculado)) {
        return vinculado;
      }
    }

    const modelosContrato = await this.getByType('contrato', true, empresaId);
    return modelosContrato.find(temRecibo) ?? null;
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

