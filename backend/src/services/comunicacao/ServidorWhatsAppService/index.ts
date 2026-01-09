import { ServidorWhatsApp } from '../../../models/comunicacao/ServidorWhatsApp/index';
import { WhereOptions } from 'sequelize';

export class ServidorWhatsAppService {
  /**
   * Listar todos os servidores de WhatsApp
   */
  static async list(): Promise<{ success: boolean; data: ServidorWhatsApp[] }> {
    const servidores = await ServidorWhatsApp.findAll({
      order: [['created_at', 'DESC']],
      attributes: {
        exclude: ['evolution_api_key', 'whatsapp_cloud_token'], // Não retornar tokens na listagem
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
  static async getById(id: string | number, options?: { excludeTokens?: boolean }): Promise<ServidorWhatsApp | null> {
    const attributes = options?.excludeTokens ? {
      exclude: ['evolution_api_key', 'whatsapp_cloud_token']
    } : undefined;

    return await ServidorWhatsApp.findByPk(id, {
      attributes
    });
  }

  /**
   * Buscar servidor por condições
   */
  static async findOne(where: WhereOptions): Promise<ServidorWhatsApp | null> {
    return await ServidorWhatsApp.findOne({ where });
  }

  /**
   * Criar servidor
   */
  static async create(dados: Partial<ServidorWhatsApp>): Promise<ServidorWhatsApp> {
    return await ServidorWhatsApp.create(dados as any);
  }

  /**
   * Deletar servidor
   */
  static async delete(id: string | number): Promise<ServidorWhatsApp> {
    const servidor = await ServidorWhatsApp.findByPk(id);
    
    if (!servidor) {
      throw new Error('Servidor de WhatsApp não encontrado');
    }
    
    await servidor.destroy();
    
    return servidor;
  }

  /**
   * Atualizar instância de servidor (método auxiliar para atualizar instância existente)
   */
  static async updateInstance(
    servidor: ServidorWhatsApp,
    dados: Partial<ServidorWhatsApp>
  ): Promise<ServidorWhatsApp> {
    await servidor.update(dados);
    await servidor.reload();
    return servidor;
  }

  /**
   * Atualizar múltiplos servidores (bulk update)
   */
  static async updateBulk(where: WhereOptions, dados: Partial<ServidorWhatsApp>): Promise<number> {
    const [rowsAffected] = await ServidorWhatsApp.update(dados, { where });
    return rowsAffected;
  }
}

