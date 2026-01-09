import { ServidorEmail } from '../../../models/comunicacao/ServidorEmail/index';
import { WhereOptions, FindOptions } from 'sequelize';

export class ServidorEmailService {
  /**
   * Listar todos os servidores de email
   */
  static async list(): Promise<{ success: boolean; data: ServidorEmail[] }> {
    const servidores = await ServidorEmail.findAll({
      order: [['created_at', 'DESC']],
      attributes: {
        exclude: ['senha'], // Não retornar a senha na listagem
      },
    });

    return {
      success: true,
      data: servidores
    };
  }

  /**
   * Buscar servidor por ID
   */
  static async getById(id: string | number, options?: { excludePassword?: boolean }): Promise<ServidorEmail | null> {
    const attributes = options?.excludePassword ? {
      exclude: ['senha']
    } : undefined;

    return await ServidorEmail.findByPk(id, {
      attributes
    });
  }

  /**
   * Buscar servidor por condições
   */
  static async findOne(options: WhereOptions | FindOptions): Promise<ServidorEmail | null> {
    // Se for apenas WhereOptions (objeto simples com condições como { ativo: true }), usar como where
    // Verifica se tem propriedades típicas de FindOptions
    if ('where' in options || 'attributes' in options || 'include' in options || 'order' in options) {
      return await ServidorEmail.findOne(options as FindOptions);
    }
    // Caso contrário, é WhereOptions simples
    return await ServidorEmail.findOne({ where: options as WhereOptions });
  }

  /**
   * Criar servidor
   */
  static async create(dados: Partial<ServidorEmail>): Promise<ServidorEmail> {
    return await ServidorEmail.create(dados as any);
  }

  /**
   * Atualizar servidor
   */
  static async update(id: string | number, dados: Partial<ServidorEmail>): Promise<ServidorEmail> {
    const servidor = await ServidorEmail.findByPk(id);
    
    if (!servidor) {
      throw new Error('Servidor de email não encontrado');
    }
    
    await servidor.update(dados);
    await servidor.reload();
    
    return servidor;
  }

  /**
   * Atualizar múltiplos servidores (bulk update)
   */
  static async updateBulk(where: WhereOptions, dados: Partial<ServidorEmail>): Promise<void> {
    await ServidorEmail.update(dados, { where });
  }

  /**
   * Deletar servidor
   */
  static async delete(id: string | number): Promise<ServidorEmail> {
    const servidor = await ServidorEmail.findByPk(id);
    
    if (!servidor) {
      throw new Error('Servidor de email não encontrado');
    }
    
    await servidor.destroy();
    
    return servidor;
  }

  /**
   * Atualizar instância de servidor (método auxiliar para atualizar instância existente)
   */
  static async updateInstance(
    servidor: ServidorEmail,
    dados: Partial<ServidorEmail>
  ): Promise<ServidorEmail> {
    await servidor.update(dados);
    await servidor.reload();
    return servidor;
  }
}

