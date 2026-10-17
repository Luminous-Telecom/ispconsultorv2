import type { cadastros_bancos, financeiro_titulos } from '@prisma/client';

type Banco = cadastros_bancos;
type Titulo = financeiro_titulos;
import { logger } from '../../../utils/logger';
import type { ApiResponse, TituloWithRelations, IBancoService } from '../types';
import { AsaasTituloService } from './AsaasTituloService';
import { AsaasWebhookService } from './AsaasWebhookService';

export class AsaasService implements IBancoService {
  /**
   * Obter token (API Key) do Asaas
   */
  async obterToken(banco: Banco): Promise<string | null> {
    const apiKey = banco.api_key?.trim() || null;
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
