import { Parametro } from '../../../models/sistema/Parametro';
import { WhereOptions } from 'sequelize';

export interface ListParametrosFilters {
  categoria?: string;
  ativo?: boolean;
}

export class ParametroService {
  /**
   * Listar parâmetros
   */
  static async list(filters: ListParametrosFilters = {}): Promise<{ success: boolean; data: Parametro[] }> {
    const { categoria, ativo } = filters;
    
    const whereClause: WhereOptions = {};
    
    if (categoria) {
      whereClause.categoria = categoria;
    }
    
    if (ativo !== undefined) {
      whereClause.ativo = ativo;
    }

    const parametros = await Parametro.findAll({
      where: whereClause,
      order: [['categoria', 'ASC'], ['chave', 'ASC']]
    });

    return {
      success: true,
      data: parametros
    };
  }

  /**
   * Buscar parâmetro por chave
   */
  static async getByChave(chave: string): Promise<Parametro | null> {
    return await Parametro.findOne({
      where: { chave }
    });
  }

  /**
   * Criar parâmetro
   */
  static async create(dados: Partial<Parametro>): Promise<Parametro> {
    return await Parametro.create(dados as any);
  }

  /**
   * Atualizar parâmetro
   */
  static async update(chave: string, dados: Partial<Parametro>): Promise<Parametro> {
    const parametro = await Parametro.findOne({
      where: { chave }
    });

    if (!parametro) {
      throw new Error('Parâmetro não encontrado');
    }

    await parametro.update(dados);
    await parametro.reload();

    return parametro;
  }

  /**
   * Buscar ou criar parâmetro
   */
  static async findOrCreate(chave: string, defaults: Partial<Parametro>): Promise<[Parametro, boolean]> {
    return await Parametro.findOrCreate({
      where: { chave },
      defaults: defaults as any
    });
  }

  /**
   * Buscar parâmetros por categoria
   */
  static async getByCategoria(categoria: string): Promise<{ success: boolean; data: Parametro[] }> {
    const parametros = await Parametro.findAll({
      where: { 
        categoria,
        ativo: true
      },
      order: [['chave', 'ASC']]
    });

    return {
      success: true,
      data: parametros
    };
  }

  /**
   * Atualizar instância de parâmetro (método auxiliar para atualizar instância existente)
   */
  static async updateInstance(
    parametro: Parametro,
    dados: Partial<Parametro>
  ): Promise<Parametro> {
    await parametro.update(dados);
    await parametro.reload();
    return parametro;
  }
}

