import axios, { AxiosInstance } from 'axios';
import { logger } from '../../../utils/logger';
import { PDFGenerationService } from '../../pdf-generation/PDFGenerationService';
import { AssinaturaDigitalProviderService } from '../AssinaturaDigitalProviderService';
import { AssinaturaDigital } from '../../../models/assinatura-digital/AssinaturaDigital';

interface AssinafyConfig {
  apiKey: string;
  apiUrl?: string;
  accountId?: string; // Workspace Account ID
}

interface AssinafySigner {
  name: string;
  email: string;
  cpf?: string;
  cnpj?: string;
  order?: number;
}

interface AssinafyDocument {
  name: string;
  file: string; // base64
  signers: AssinafySigner[];
  expiresAt?: string;
  message?: string;
}

interface AssinafyResponse {
  success: boolean;
  data?: {
    id: string;
    url?: string;
    status: string;
    [key: string]: unknown;
  };
  message?: string;
  error?: string;
}

/**
 * Serviço de integração com Assinafy API
 * Documentação: https://assinafy.com.br/docs
 * 
 * Plano gratuito: 100 assinaturas/mês
 * 
 * URLs por ambiente:
 * - Produção: https://api.assinafy.com.br/v1
 * - Staging: https://app-staging.assinafy.com.br/v1
 */
export const ASSINAFY_API_URL_PRODUCTION = 'https://api.assinafy.com.br/v1';
export const ASSINAFY_API_URL_STAGING = 'https://app-staging.assinafy.com.br/v1';
export const ASSINAFY_API_URL_DEFAULT = ASSINAFY_API_URL_PRODUCTION;

export class AssinafyService {
  private api: AxiosInstance;
  private apiKey: string;
  private apiUrl: string;
  private accountId?: string;

  constructor(config: AssinafyConfig) {
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl || ASSINAFY_API_URL_DEFAULT;
    this.accountId = config.accountId;
    
    
    this.api = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'X-Api-Key': this.apiKey,
        'Accept': 'application/json'
      },
      timeout: 30000,
      httpAgent: new (require('http').Agent)({ keepAlive: true, maxSockets: 50 }),
      httpsAgent: new (require('https').Agent)({ keepAlive: true, maxSockets: 50 })
    });
  }

  /**
   * Cria instância do serviço buscando configuração do banco de dados (por empresa ou global)
   */
  static async createFromDatabase(empresaId?: number | null): Promise<AssinafyService | null> {
    try {
      const provider = await AssinaturaDigitalProviderService.getByProvider('assinafy', empresaId);
      
      if (!provider || !provider.habilitado || !provider.api_key) {
        return null;
      }

      const apiUrl = ASSINAFY_API_URL_PRODUCTION;

      return new AssinafyService({
        apiKey: provider.api_key,
        apiUrl,
        accountId: provider.account_id || undefined
      });
    } catch (error) {
      logger.error('Erro ao criar AssinafyService do banco:', error);
      return null;
    }
  }

  /**
   * Verifica se a funcionalidade está habilitada (por empresa ou global)
   */
  static async isEnabled(empresaId?: number | null): Promise<boolean> {
    try {
      const provider = await AssinaturaDigitalProviderService.getByProvider('assinafy', empresaId);
      return provider?.habilitado === true && !!provider?.api_key;
    } catch (error) {
      logger.error('Erro ao verificar se assinatura digital está habilitada:', error);
      return false;
    }
  }

  /**
   * Constrói caminho de endpoint para accounts
   * O /v1 está na URL base para produção, não no caminho do endpoint
   */
  private getAccountPath(endpoint: string): string {
    return `/accounts/${this.accountId}${endpoint}`;
  }


  /**
   * Busca signer existente por email
   */
  private async buscarSignerPorEmail(email: string): Promise<string | null> {
    try {
      const response = await this.api.get(this.getAccountPath('/signers'));
      const signers = response.data?.data || response.data || [];
      
      if (Array.isArray(signers)) {
        const signerEncontrado = signers.find((s: { email?: string }) => 
          s.email?.toLowerCase() === email.toLowerCase()
        );
        
        if (signerEncontrado) {
          const signerId = signerEncontrado.id || signerEncontrado.data?.id;
          if (signerId) {
            return signerId;
          }
        }
      }
      
      return null;
    } catch (error) {
      logger.warn('Erro ao buscar signer existente, continuando...', {
        email,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      return null;
    }
  }

  /**
   * Faz upload do documento e retorna imediatamente
   */
  async uploadDocumento(documento: { name: string; file: string }): Promise<AssinafyResponse> {
    const uploadUrl = this.getAccountPath('/documents');
    
    try {
      if (!this.accountId) {
        throw new Error('Workspace Account ID não configurado. Configure em Parâmetros > Assinatura Digital');
      }
      
      const FormData = require('form-data');
      const formData = new FormData();
      
      const base64Data = documento.file.replace(/^data:.*,/, '');
      const pdfBuffer = Buffer.from(base64Data, 'base64');
      
      formData.append('file', pdfBuffer, {
        filename: documento.name.endsWith('.pdf') ? documento.name : `${documento.name}.pdf`,
        contentType: 'application/pdf'
      });
      
      // Usar a instância do axios configurada (com baseURL e headers padrão)
      const uploadResponse = await this.api.post(uploadUrl, formData, {
        headers: {
          ...formData.getHeaders()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 30000
      });
      
      const documentId = uploadResponse.data?.id || uploadResponse.data?.data?.id;
      if (!documentId) {
        throw new Error('Documento enviado mas ID não retornado pela API');
      }


      return {
        success: true,
        data: {
          id: documentId,
          status: uploadResponse.data?.status || uploadResponse.data?.data?.status || 'uploaded'
        }
      };
    } catch (error) {
      const axiosError = error as { 
        response?: { 
          status?: number; 
          statusText?: string;
          data?: unknown;
          headers?: Record<string, string>;
        };
        message?: string;
        code?: string;
        config?: {
          method?: string;
          url?: string;
          headers?: Record<string, string>;
        };
      };
      
      const errorMessage = axiosError?.response?.data 
        ? JSON.stringify(axiosError.response.data)
        : axiosError?.message || 'Erro desconhecido ao fazer upload';
      
      logger.error(`Erro ao fazer upload do documento - Status: ${axiosError?.response?.status || 'N/A'}, Message: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Processa documento em background (polling, signers, assignment)
   */
  async processarDocumentoEmBackground(
    documentId: string,
    documento: AssinafyDocument
  ): Promise<void> {
    try {
      // Aguardar documento estar pronto
      const statusValidos = ['uploaded', 'metadata_ready'];
      let documentStatus = '';
      let tentativas = 0;
      const maxTentativas = 30;

      while (!statusValidos.includes(documentStatus) && tentativas < maxTentativas) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        tentativas++;
        
        try {
          const statusResponse = await this.api.get(`/documents/${documentId}`);
          const responseData = statusResponse.data?.data || statusResponse.data;
          documentStatus = responseData?.status || documentStatus;
        } catch (error) {
          // Continuar tentando
        }
      }

      // Criar signers
      const signerIds: string[] = [];
      
      for (const signer of documento.signers) {
        try {
          const signerPayload = {
            full_name: signer.name,
            email: signer.email
          };
          
          const signerResponse = await this.api.post(this.getAccountPath('/signers'), signerPayload);
          const responseData = signerResponse.data?.data || signerResponse.data;
          const signerId = responseData?.id || signerResponse.data?.id;

          if (signerId) {
            signerIds.push(signerId);
          }
        } catch (error) {
          const axiosError = error as { 
            response?: { 
              status?: number; 
              data?: { message?: string };
            };
          };
          
          const statusCode = axiosError?.response?.status;
          const errorMessage = axiosError?.response?.data?.message || '';
          
          if (statusCode === 400 && (errorMessage.includes('já existe') || errorMessage.includes('already exists'))) {
            const signerIdExistente = await this.buscarSignerPorEmail(signer.email);
            if (signerIdExistente) {
              signerIds.push(signerIdExistente);
              continue;
            }
          }
          
          logger.error('❌ Erro ao criar signer', { email: signer.email, statusCode });
        }
      }
      
      if (signerIds.length === 0) {
        const errorMsg = 'Nenhum signer foi criado com sucesso';
        logger.error(errorMsg);
        throw new Error(errorMsg);
      }

      // Criar assignment
      const assignmentPayload: Record<string, unknown> = {
        method: 'virtual',
        signer_ids: signerIds
      };
      
      if (documento.expiresAt) {
        assignmentPayload.expires_at = documento.expiresAt;
      }
      
      if (documento.message) {
        assignmentPayload.message = documento.message;
      }
      
      try {
        await this.api.post(`/documents/${documentId}/assignments`, assignmentPayload);
        logger.info('✅ Assignment criado com sucesso', { documentId });
      } catch (assignmentError) {
        const axiosError = assignmentError as { 
          response?: { 
            status?: number; 
            data?: unknown;
            statusText?: string;
          };
          message?: string;
        };
        
        const errorData = axiosError?.response?.data;
        const errorMessage = typeof errorData === 'object' && errorData !== null && 'message' in errorData
          ? String(errorData.message)
          : axiosError?.message || 'Erro desconhecido';
        
        logger.error('❌ Erro ao criar assignment', {
          documentId,
          statusCode: axiosError?.response?.status,
          statusText: axiosError?.response?.statusText,
          error: errorMessage,
          errorData: errorData,
          assignmentPayload: {
            method: assignmentPayload.method,
            signer_ids: assignmentPayload.signer_ids,
            expires_at: assignmentPayload.expires_at,
            message: assignmentPayload.message ? 'presente' : 'ausente'
          }
        });
        throw assignmentError;
      }

      // Buscar documento atualizado para obter signing_url
      try {
        const docResponse = await this.api.get(`/documents/${documentId}`);
        const docData = docResponse.data?.data || docResponse.data;
        const signingUrl = docData?.signing_url;
        
        if (signingUrl) {
          await AssinaturaDigital.update(
            { url_assinatura: signingUrl },
            { where: { api_document_id: documentId } }
          );
        }
      } catch (updateError) {
        // Não crítico, continua
      }

    } catch (error) {
      logger.error('Erro ao processar documento em background', {
        documentId,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  /**
   * Consulta status de um documento
   */
  async consultarStatus(documentId: string): Promise<AssinafyResponse> {
    try {
      const response = await this.api.get(`/documents/${documentId}`);
      const data = response.data?.data || response.data;

      return {
        success: true,
        data: {
          id: data?.id || documentId,
          url: data?.url || data?.signature_url,
          status: data?.status || 'unknown'
        }
      };
    } catch (error) {
      logger.error('Erro ao consultar status do documento:', { documentId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Baixa PDF assinado
   * @param documentId - ID do documento
   * @param url - URL direta do PDF (opcional, não usado pelo Assinafy)
   */
  async baixarPdfAssinado(documentId: string, url?: string): Promise<Buffer | null> {
    try {
      const response = await this.api.get(`/documents/${documentId}/download/certificated`, {
        responseType: 'arraybuffer'
      });
      return Buffer.from(response.data);
    } catch (error) {
      try {
        const response = await this.api.get(`/documents/${documentId}/download`, {
          responseType: 'arraybuffer'
        });
        return Buffer.from(response.data);
      } catch {
        return null;
      }
    }
  }

  /**
   * Cancela assinatura pendente
   */
  async cancelarAssinatura(documentId: string): Promise<AssinafyResponse> {
    try {
      await this.api.post(`/documents/${documentId}/cancel`);

      return {
        success: true,
        data: {
          id: documentId,
          status: 'canceled'
        }
      };
    } catch (error) {
      logger.error('Erro ao cancelar assinatura:', { documentId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Converte PDF Buffer para base64
   */
  static pdfToBase64(pdfBuffer: Buffer): string {
    return pdfBuffer.toString('base64');
  }

  /**
   * Gera PDF a partir de conteúdo HTML e converte para base64
   */
  static async gerarPdfBase64(
    conteudoHtml: string,
    nomeArquivo = 'documento.pdf'
  ): Promise<string> {
    try {
      const pdfBuffer = await PDFGenerationService.generateFromContent(
        conteudoHtml,
        {
          format: 'A4',
          margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
          printBackground: true
        }
      );

      return this.pdfToBase64(pdfBuffer);
    } catch (error) {
      logger.error('Erro ao gerar PDF:', error);
      throw error;
    }
  }
}
