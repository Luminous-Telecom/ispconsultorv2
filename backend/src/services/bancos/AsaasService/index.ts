import { Banco } from '../../../models/cadastros/Banco';
import { Titulo } from '../../../models/financeiro/Titulo';
import { logger } from '../../../utils/logger';
import type { ApiResponse, TituloWithRelations, IBancoService } from '../types';
import { AsaasTituloService } from './AsaasTituloService';
import { AsaasWebhookService } from './AsaasWebhookService';

export class AsaasService implements IBancoService {
  /**
   * Obter token (API Key) do Asaas
   */
  async obterToken(banco: Banco): Promise<string | null> {
    let apiKey = banco.api_key;

    // Banco pode vir como instância do Sequelize Model ou como objeto simples
    interface BancoModelLike {
      dataValues?: { api_key?: string | null };
      getDataValue?: (key: string) => string | null;
    }
    const bancoModel = banco as BancoModelLike;

    if (!apiKey && bancoModel.dataValues) {
      apiKey = bancoModel.dataValues.api_key || null;
    }

    if (!apiKey && typeof bancoModel.getDataValue === 'function') {
      const value = bancoModel.getDataValue('api_key');
      apiKey = value || null;
    }

    if (!apiKey) {
      logger.error('API Key não configurada para Asaas', {
        banco_id: banco.id,
        banco_nome: banco.nome
      });
      return null;
    }

    return apiKey;
  }

  /**
   * Gerar título/boleto no Asaas (delegado para AsaasTituloService)
   */
  async gerarTitulo(titulo: TituloWithRelations, banco: Banco, token: string): Promise<ApiResponse> {
    return await AsaasTituloService.gerarTitulo(titulo, banco, token);
  }

  /**
   * Cancelar título no Asaas (delegado para AsaasTituloService)
   */
  async cancelarTitulo(titulo: Titulo, banco: Banco, token: string): Promise<ApiResponse> {
    return await AsaasTituloService.cancelarTitulo(titulo, banco, token);
  }

  /**
   * Liquidar título no Asaas (delegado para AsaasTituloService)
   */
  async liquidarTitulo(titulo: Titulo, banco: Banco, token: string): Promise<ApiResponse> {
    return await AsaasTituloService.liquidarTitulo(titulo, banco, token);
  }

  /**
   * Consultar status do título no Asaas (delegado para AsaasTituloService)
   */
  async consultarStatus(titulo: Titulo, banco: Banco, token: string): Promise<ApiResponse> {
    return await AsaasTituloService.consultarStatus(titulo, banco, token);
  }

  /**
   * Configurar webhook do Asaas (delegado para AsaasWebhookService)
   */
  async configurarWebhook(banco: Banco, token: string): Promise<ApiResponse> {
    return await AsaasWebhookService.configurarWebhook(banco, token);
  }
}
