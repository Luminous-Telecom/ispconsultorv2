import axios, { AxiosInstance } from 'axios';
import { logger } from '../../../utils/logger';
import { PDFGenerationService } from '../../pdf-generation/PDFGenerationService';
import { AssinaturaDigitalProviderService } from '../AssinaturaDigitalProviderService';
import { AssinaturaDigital } from '../../../models/assinatura-digital/AssinaturaDigital';

interface ZapsignConfig {
  apiKey: string;
  apiUrl?: string;
}

interface ZapsignSigner {
  name: string;
  email: string;
  cpf?: string;
  cnpj?: string;
  order?: number;
}

interface ZapsignDocument {
  name: string;
  file: string; // base64
  signers: ZapsignSigner[];
  expiresAt?: string;
  message?: string;
}

interface ZapsignResponse {
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
 * Serviço de integração com ZAPSIGN API
 * Documentação: https://docs.zapsign.com.br
 * 
 * Sandbox: https://sandbox.api.zapsign.com.br/api/v1/ (não possui validade jurídica)
 * Produção: https://api.zapsign.com.br/api/v1/ (possui validade jurídica)
 */
export const ZAPSIGN_API_URL_SANDBOX = 'https://sandbox.api.zapsign.com.br/api/v1';
export const ZAPSIGN_API_URL_PRODUCTION = 'https://api.zapsign.com.br/api/v1';
export const ZAPSIGN_API_URL_DEFAULT = ZAPSIGN_API_URL_SANDBOX;

export class ZapsignService {
  private api: AxiosInstance;
  private apiKey: string;
  private apiUrl: string;

  constructor(config: ZapsignConfig) {
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl || ZAPSIGN_API_URL_DEFAULT;
    
    const baseUrl = this.apiUrl.replace(/\/$/, '');
    
    this.api = axios.create({
      baseURL: baseUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json'
        // Não definir Content-Type aqui, será definido dinamicamente (JSON ou multipart/form-data)
      },
      timeout: 30000,
      httpAgent: new (require('http').Agent)({ keepAlive: true, maxSockets: 50 }),
      httpsAgent: new (require('https').Agent)({ keepAlive: true, maxSockets: 50 })
    });
  }

  /**
   * Cria instância do serviço buscando configuração do banco de dados (por empresa ou global)
   */
  static async createFromDatabase(empresaId?: number | null): Promise<ZapsignService | null> {
    try {
      const provider = await AssinaturaDigitalProviderService.getByProvider('zapsign', empresaId);
      
      if (!provider || !provider.habilitado || !provider.api_key) {
        return null;
      }

      // Usar URL hardcoded baseada no provider
      // Por padrão, usar sandbox
      const apiUrl = ZAPSIGN_API_URL_SANDBOX;

      return new ZapsignService({
        apiKey: provider.api_key,
        apiUrl: apiUrl
      });
    } catch (error) {
      logger.error('Erro ao criar ZapsignService do banco:', error);
      return null;
    }
  }

  /**
   * Verifica se a funcionalidade está habilitada (por empresa ou global)
   */
  static async isEnabled(empresaId?: number | null): Promise<boolean> {
    try {
      const provider = await AssinaturaDigitalProviderService.getByProvider('zapsign', empresaId);
      return provider?.habilitado === true && !!provider?.api_key;
    } catch (error) {
      logger.error('Erro ao verificar se assinatura digital está habilitada:', error);
      return false;
    }
  }

  /**
   * Faz upload do documento e retorna imediatamente
   * Conforme documentação: https://docs.zapsign.com.br/documentos/criar-documento
   * A ZAPSIGN aceita JSON com base64_pdf, não multipart/form-data
   * IMPORTANTE: A ZAPSIGN requer que os signatários sejam enviados junto com a criação do documento
   */
  async uploadDocumento(documento: { name: string; file: string; signers?: ZapsignSigner[] }): Promise<ZapsignResponse> {
    try {
      const base64Data = documento.file.replace(/^data:.*,/, '');
      const filename = documento.name.endsWith('.pdf') ? documento.name : `${documento.name}.pdf`;
      const endpoint = '/docs/';
      
      const payload: Record<string, unknown> = {
        name: filename,
        base64_pdf: base64Data
      };
      
      if (documento.signers && documento.signers.length > 0) {
        payload.signers = documento.signers.map((signer, index) => ({
          name: signer.name,
          email: signer.email,
          action: 'SIGN',
          order: signer.order || index + 1,
          send_automatic_email: true,
          ...(signer.cpf && { cpf: signer.cpf }),
          ...(signer.cnpj && { cnpj: signer.cnpj })
        }));
      }
      
      const uploadResponse = await this.api.post(endpoint, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      const documentId = uploadResponse.data?.token || uploadResponse.data?.open_id || uploadResponse.data?.id;
      if (!documentId) {
        throw new Error('Documento enviado mas ID não retornado pela API');
      }

      const signers = uploadResponse.data?.signers || [];
      const signingUrl = signers.length > 0 && signers[0]?.sign_url ? signers[0].sign_url : null;

      return {
        success: true,
        data: {
          id: String(documentId),
          status: uploadResponse.data?.status || 'pending',
          url: signingUrl || undefined
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
          baseURL?: string;
          headers?: Record<string, string>;
        };
        request?: {
          path?: string;
        };
      };
      
      const errorData = axiosError?.response?.data;
      const errorMessage = errorData 
        ? (typeof errorData === 'string' ? errorData : JSON.stringify(errorData))
        : axiosError?.message || 'Erro desconhecido ao fazer upload';
      
      logger.error('Erro ao fazer upload do documento para ZAPSIGN', {
        statusCode: axiosError?.response?.status,
        error: errorMessage
      });
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async processarDocumentoEmBackground(
    documentId: string,
    documento: { signers: ZapsignSigner[]; expiresAt?: string; message?: string }
  ): Promise<void> {
    // Não é mais necessário - email já é enviado automaticamente no upload
    return;
  }

  /**
   * Consulta status de um documento
   */
  async consultarStatus(documentId: string): Promise<ZapsignResponse> {
    try {
      const response = await this.api.get(`/docs/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      const data = response.data?.data || response.data;
      const signedFileUrl = data?.signed_file || data?.signed_file_url || data?.download_url || data?.pdf_url;
      
      return {
        success: true,
        data: {
          id: data?.id || documentId,
          url: data?.signing_url || data?.url || signedFileUrl,
          status: this.mapearStatusZapsign(data?.status || 'unknown')
        }
      };
    } catch (error) {
      const axiosError = error as {
        response?: {
          status?: number;
          statusText?: string;
          data?: unknown;
        };
        message?: string;
      };
      
      logger.error('Erro ao consultar status do documento', {
        documentId,
        statusCode: axiosError?.response?.status,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  private mapearStatusZapsign(status: string): string {
    const statusMap: Record<string, string> = {
      'pending': 'pendente',
      'sent': 'enviado',
      'signed': 'assinado',
      'completed': 'assinado',
      'canceled': 'cancelado',
      'expired': 'expirado',
      'error': 'erro'
    };
    return statusMap[status.toLowerCase()] || status;
  }

  async baixarPdfAssinado(documentId: string, url?: string): Promise<Buffer | null> {
    try {
      let urlDoStatus: string | undefined;
      try {
        const statusResult = await this.consultarStatus(documentId);
        if (statusResult.success) {
          const docStatus = statusResult.data?.status;
          urlDoStatus = statusResult.data?.url;
          if (docStatus && docStatus !== 'signed' && docStatus !== 'completed' && docStatus !== 'assinado') {
            return null;
          }
          if (urlDoStatus && (urlDoStatus.includes('.pdf') || urlDoStatus.includes('signed') || urlDoStatus.includes('download'))) {
            url = urlDoStatus;
          }
        }
      } catch (statusError) {
        // Continuar tentativa de download
      }
      
      if (url) {
        const urlCorrigida = url.replace(/&amp;/g, '&');
        try {
          const response = await axios.get(urlCorrigida, {
            responseType: 'arraybuffer',
            timeout: 30000,
            maxRedirects: 5,
            validateStatus: (status) => status >= 200 && status < 400
          });
          return Buffer.from(response.data);
        } catch (urlError) {
          // Continuar para tentativas de API
        }
      }
      
      const tentativas = [
        `/docs/${documentId}/download?api_token=${this.apiKey}`,
        `/documents/${documentId}/download?api_token=${this.apiKey}`,
        `/docs/${documentId}/download`,
        `/docs/${documentId}/download/`
      ];
      
      for (const endpoint of tentativas) {
        try {
          const response = await this.api.get(endpoint, {
            headers: {
              'Accept': 'application/pdf',
              ...(endpoint.includes('api_token') ? {} : { 'Authorization': `Bearer ${this.apiKey}` })
            },
            responseType: 'arraybuffer',
            timeout: 30000,
            validateStatus: (status) => status >= 200 && status < 400
          }) as { data: ArrayBuffer; status: number };
          
          return Buffer.from(response.data);
        } catch (error) {
          continue;
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Erro ao baixar PDF ZAPSIGN', {
        documentId,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      return null;
    }
  }

  async cancelarAssinatura(documentId: string): Promise<ZapsignResponse> {
    try {
      await this.api.post(`/docs/${documentId}/cancel`, {}, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      return {
        success: true,
        data: {
          id: documentId,
          status: 'canceled'
        }
      };
    } catch (error) {
      logger.error('Erro ao cancelar assinatura', {
        documentId,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  static pdfToBase64(pdfBuffer: Buffer): string {
    return pdfBuffer.toString('base64');
  }

  static async gerarPdfBase64(
    conteudoHtml: string,
    nomeArquivo = 'documento.pdf'
  ): Promise<string> {
    try {
      const pdfBuffer = await PDFGenerationService.generateFromContent(
        conteudoHtml,
        'html-pdf-node',
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
