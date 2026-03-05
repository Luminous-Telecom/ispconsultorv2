import axios from 'axios';
import { Banco } from '../../../models/cadastros/Banco';
import { Titulo } from '../../../models/financeiro/Titulo';
import { logger } from '../../../utils/logger';
import { efiConfig } from '../../../config/bancos/efi';
import type { ApiResponse, TituloWithRelations, AxiosErrorResponse, IBancoService } from '../types';
import { EfiTituloService } from './EfiTituloService';

export class EfiService implements IBancoService {
  /**
   * Obter token OAuth da Efi
   */
  async obterToken(banco: Banco): Promise<string | null> {
    const maxTentativas = 3;
    let delay = 2000;

    for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
      try {
        const baseUrl = banco.sandbox ? efiConfig.sandbox_url : efiConfig.api_url;
        const endpoint = baseUrl + efiConfig.api_endpoints.auth;

        const bancoWithIdentificador = banco as Banco & { identificador_conta?: string | null };
        const identificadorConta = bancoWithIdentificador.identificador_conta?.trim();
        const authData: Record<string, string | null> = {
          [efiConfig.client_id_field]: banco.client_id_producao || null,
          [efiConfig.client_secret_field]: banco.client_secret_producao || null,
          grant_type: 'client_credentials'
        };
        if (identificadorConta) {
          authData.identificador_conta = identificadorConta;
        }

        const response = await axios.post(endpoint, authData, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        });

        if (response.data && response.data.access_token) {
          return response.data.access_token;
        }

        logger.warn('Token não encontrado na resposta', {
          response_keys: Object.keys(response.data || {}),
          tentativa
        });
        return null;
      } catch (error) {
        const axiosError = error as Error & AxiosErrorResponse;
        const isTimeout = axiosError.code === 'ECONNABORTED' ||
          axiosError.response?.status === 504 ||
          axiosError.response?.status === 502 ||
          axiosError.response?.status === 503;
        const errorResponse = axiosError.response;

        if (tentativa < maxTentativas && isTimeout) {
          logger.warn(`Tentativa ${tentativa} falhou por timeout, tentando novamente em ${delay}ms`, {
            banco_id: banco.id,
            status: errorResponse?.status,
            tentativa
          });

          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
          continue;
        }

        if (errorResponse?.status === 401) {
          logger.warn('Token expirado/inválido, será renovado na próxima requisição', {
            banco_id: banco.id,
            status: errorResponse?.status,
            tentativa,
            isTimeout
          });
        } else {
          logger.error('Erro ao obter token', {
            banco_id: banco.id,
            tipo_banco: banco.tipo_banco,
            error: error instanceof Error ? error.message : 'Erro desconhecido',
            status: errorResponse?.status,
            tentativa,
            isTimeout
          });
        }
        return null;
      }
    }

    return null;
  }

  /**
   * Gerar título/boleto na Efi (delegado para EfiTituloService)
   */
  async gerarTitulo(titulo: TituloWithRelations, banco: Banco, token: string): Promise<ApiResponse> {
    return await EfiTituloService.gerarTitulo(titulo, banco, token);
  }

  /**
   * Cancelar título na Efi (delegado para EfiTituloService)
   */
  async cancelarTitulo(titulo: Titulo, banco: Banco, token: string): Promise<ApiResponse> {
    return await EfiTituloService.cancelarTitulo(titulo, banco, token);
  }

  /**
   * Liquidar título na Efi (delegado para EfiTituloService)
   */
  async liquidarTitulo(titulo: Titulo, banco: Banco, token: string): Promise<ApiResponse> {
    return await EfiTituloService.liquidarTitulo(titulo, banco, token);
  }

  /**
   * Consultar status do título na Efi (delegado para EfiTituloService)
   */
  async consultarStatus(titulo: Titulo, banco: Banco, token: string): Promise<ApiResponse> {
    return await EfiTituloService.consultarStatus(titulo, banco, token);
  }
}
