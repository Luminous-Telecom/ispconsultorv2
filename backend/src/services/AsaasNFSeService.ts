import axios, { AxiosError, AxiosInstance } from 'axios';
import { NotaFiscal } from '../models/NotaFiscal';
import { Cliente } from '../models/Cliente';
import { DadosEmpresa } from '../models/DadosEmpresa';
import { logger } from '../utils/logger';
import { NFSeConfigService } from './NFSeConfigService';
import asaasConfig from '../config/bancos/asaas';

interface AsaasConfig {
  apiKey: string;
  sandbox: boolean;
  baseUrl: string;
}

interface GerarNFSeResponse {
  success: boolean;
  invoice_id?: string;
  status?: string;
  numero?: string | null;
  serie?: string | null;
  chave_acesso?: string | null;
  protocolo?: string | null;
  data_autorizacao?: Date;
  xml?: string | null;
  pdf_url?: string | null;
  danfe_url?: string | null;
  erro?: string;
  codigo_erro?: string;
}

export class AsaasNFSeService {
  private static async getConfig(): Promise<AsaasConfig | null> {
    try {
      const config = await NFSeConfigService.getConfig();

      if (!config.asaas_api_key) {
        logger.warn('API Key do Asaas não configurada para NFS-e');
        return null;
      }

      const baseUrl = config.asaas_sandbox
        ? (asaasConfig.sandbox_url || asaasConfig.api_base_url)
        : (asaasConfig.api_base_url || asaasConfig.api_url);

      return {
        apiKey: config.asaas_api_key,
        sandbox: config.asaas_sandbox,
        baseUrl: baseUrl
      };
    } catch (error) {
      logger.error('Erro ao obter configuração do Asaas:', error);
      return null;
    }
  }

  private static createApiClient(config: AsaasConfig): AxiosInstance {
    const apiClient = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'access_token': config.apiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });
    
    apiClient.interceptors.request.use(
      (request) => {
        return request;
      },
      (error) => {
        logger.error('Erro ao preparar requisição', { error: error.message });
        return Promise.reject(error);
      }
    );
    
    apiClient.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        const axiosError = error as AxiosError;
        const errorData = axiosError.response?.data as any;
        
        logger.error('Erro na resposta do Asaas', {
          message: axiosError.message,
          status: axiosError.response?.status,
          url: axiosError.config?.url,
          error: errorData?.errors?.[0]?.description || errorData?.message || axiosError.message
        });
        return Promise.reject(error);
      }
    );
    
    return apiClient;
  }

  static async gerarNFSe(
    notaFiscal: NotaFiscal,
    cliente: Cliente,
    dadosEmpresa: DadosEmpresa
  ): Promise<GerarNFSeResponse> {
    try {
      const config = await this.getConfig();
      if (!config) {
        return {
          success: false,
          codigo_erro: 'CONFIG_001',
          erro: 'Configuração do Asaas não encontrada. Configure API Key nos parâmetros do sistema.'
        };
      }

      const apiClient = this.createApiClient(config);
      
      const customerId = await this.obterOuCriarCliente(config, cliente);
      if (!customerId) {
        return {
          success: false,
          codigo_erro: 'CLIENT_001',
          erro: 'Falha ao sincronizar cliente no Asaas. Verifique se o cliente possui todos os dados necessários.'
        };
      }

      const dadosNFSe = await this.prepararDadosNFSe(notaFiscal, cliente, dadosEmpresa, customerId);
      const endpoint = '/invoices';
      
      const response = await apiClient.post(endpoint, dadosNFSe);

      if (response.data?.id) {
        const invoiceId = response.data.id;

        // Tentar autorizar imediatamente (pode falhar se não houver saldo)
        try {
          const authorizeResponse = await apiClient.post(`/invoices/${invoiceId}/authorize`);
          
          // Consultar invoice novamente após autorização para obter dados completos
          try {
            const invoiceDetails = await apiClient.get(`/invoices/${invoiceId}`);
            
            return this.processarRespostaNota(invoiceDetails.data || authorizeResponse.data, invoiceId);
          } catch (detailError) {
            logger.warn('Erro ao consultar detalhes da invoice', {
              invoice_id: invoiceId,
              error: (detailError as AxiosError).message
            });
            return this.processarRespostaNota(authorizeResponse.data || response.data, invoiceId);
          }
        } catch (authorizeError) {
          const axiosError = authorizeError as AxiosError;
          const errorData = axiosError.response?.data as any;
          const errorDescription = errorData?.errors?.[0]?.description || axiosError.message;
          
          // Verificar se está em sandbox
          const config = await this.getConfig();
          const isSandbox = config?.sandbox || false;
          
          // Se o erro for por falta de saldo, deixar agendada e o webhook atualizará quando autorizar
          if (errorDescription?.includes('saldo') || errorDescription?.includes('Saldo')) {
            // Invoice agendada - será autorizada quando houver saldo. O webhook atualizará quando autorizada.
          } else {
            logger.warn('Erro ao autorizar nota fiscal imediatamente', {
              invoice_id: invoiceId,
              error: axiosError.message,
              status: axiosError.response?.status,
              statusText: axiosError.response?.statusText,
              error_description: errorDescription,
              ambiente: isSandbox ? 'SANDBOX' : 'PRODUÇÃO'
            });
          }
          
          // Retornar resposta da criação (invoice agendada)
          // O webhook atualizará quando a invoice for autorizada
          return this.processarRespostaNota(response.data, invoiceId);
        }
      }

      const erro = response.data?.errors?.[0]?.description || response.data?.message || 'Erro desconhecido';
      const codigoErro = (response.data?.errors?.[0]?.code || 'GEN_001').substring(0, 10);
      
      return {
        success: false,
        codigo_erro: codigoErro,
        erro: erro
      };
    } catch (apiError) {
      const axiosError = apiError as AxiosError;
      const errorData = axiosError.response?.data as any;
      
      const codigoErro = (errorData?.errors?.[0]?.code || String(axiosError.response?.status || '500')).substring(0, 10);
      const erroMensagem = errorData?.errors?.[0]?.description || errorData?.message || axiosError.message || 'Erro ao gerar NFS-e no Asaas';
      
      logger.error('Erro ao gerar NFS-e no Asaas', {
        status: axiosError.response?.status,
        error: erroMensagem
      });
      
      return {
        success: false,
        codigo_erro: codigoErro,
        erro: erroMensagem
      };
    }
  }

  private static async obterOuCriarCliente(
    config: AsaasConfig,
    cliente: Cliente
  ): Promise<string | null> {
    const apiClient = this.createApiClient(config);
    const cpfCnpj = cliente.cnpj?.replace(/\D/g, '') || '';

    if (!cpfCnpj) {
      return null;
    }

    try {
      const searchResponse = await apiClient.get(`/customers?cpfCnpj=${cpfCnpj}&limit=1`);
      const customers = searchResponse.data?.data || [];

      if (customers.length > 0) {
        const id = customers[0]?.id;
        return typeof id === 'string' ? id : typeof id === 'number' ? String(id) : null;
      }
    } catch (error) {
      // Ignorar erro e tentar criar
    }

    try {
      const payload: Record<string, any> = {
        name: cliente.razao_social || cliente.nome_fantasia || `Cliente ${cliente.id}`,
        email: cliente.email,
        cpfCnpj: cpfCnpj,
        postalCode: cliente.cep?.replace(/\D/g, '') || '',
        address: cliente.endereco || '',
        addressNumber: cliente.numero || '',
        city: cliente.cidade || '',
        state: cliente.estado || '',
        notify: false,
        externalReference: `cliente_${cliente.id}`,
        notificationDisabled: true,
        companyName: cliente.nome_fantasia || cliente.razao_social,
        phone: cliente.telefone?.replace(/\D/g, ''),
        mobilePhone: (cliente.whatsapp || cliente.telefone)?.replace(/\D/g, ''),
        complement: cliente.complemento,
        province: cliente.bairro
      };

      const response = await apiClient.post('/customers', payload);
      const id = response.data?.id;
      return typeof id === 'string' ? id : typeof id === 'number' ? String(id) : null;
    } catch (error) {
      logger.error('Erro ao criar cliente no Asaas', {
        cliente_id: cliente.id,
        error: (error as AxiosError).message
      });
      return null;
    }
  }

  private static processarRespostaNota(dados: any, invoiceId: string): GerarNFSeResponse {
    // Tentar múltiplos campos possíveis para o número
    const camposTestados = {
      number: dados.number,
      rpsNumber: dados.rpsNumber,
      invoiceNumber: dados.invoiceNumber,
      numero: dados.numero,
      nfseNumber: dados.nfseNumber,
      nfse_number: dados.nfse_number,
      nfse_number_field: dados.nfse?.number,
      data_number: dados.data?.number,
      rps: dados.rps,
      rps_number: dados.rps?.number,
      id: dados.id, // O ID pode ser usado temporariamente
      validationCode: dados.validationCode // Código de validação pode ser usado
    };


    // O número da NFS-e pode não estar disponível imediatamente após criação/autorização
    // O Asaas pode demorar alguns segundos para emitir a nota e gerar o número
    // O webhook atualizará quando o número estiver disponível
    let numero = dados.number || 
                 dados.rpsNumber || 
                 dados.invoiceNumber || 
                 dados.numero || 
                 dados.nfseNumber ||
                 dados.nfse_number ||
                 dados.nfse?.number ||
                 dados.data?.number ||
                 dados.rps?.number ||
                 null;
    
    // Se não encontrou número, deixar null - o webhook atualizará quando o número estiver disponível

    // Normalizar status
    const statusOriginal = dados.status || 'AUTHORIZED';
    const statusNormalizado = typeof statusOriginal === 'string' 
      ? statusOriginal.toUpperCase() 
      : 'AUTHORIZED';

    const pdfUrl = dados.pdfUrl || dados.invoiceUrl || null;
    const danfeUrl = dados.danfeUrl || dados.pdfUrl || null;
    
    const chaveAcesso = dados.validationCode || dados.accessKey || dados.chaveAcesso || dados.accessKeyCode || dados.validation_code || null;

    return {
      success: true,
      invoice_id: invoiceId,
      status: statusNormalizado,
      numero: numero,
      serie: dados.rpsSerie || dados.serie || null,
      chave_acesso: chaveAcesso,
      protocolo: dados.protocol || dados.protocolo || null,
      data_autorizacao: dados.authorizationDate ? new Date(dados.authorizationDate) : new Date(),
      xml: dados.xmlUrl || dados.xml || null,
      pdf_url: pdfUrl,
      danfe_url: danfeUrl
    };
  }

  private static async prepararDadosNFSe(
    notaFiscal: NotaFiscal,
    cliente: Cliente,
    dadosEmpresa: DadosEmpresa,
    customerId: string
  ): Promise<Record<string, any>> {
    const config = await NFSeConfigService.getConfig();
    const serviceDescription = notaFiscal.descricao || config.descricao_servico || '';
    const aliquotaIss = Number(notaFiscal.aliquota_iss) || Number(config.aliquota_iss) || 0;

    return {
      customer: customerId,
      serviceDescription: serviceDescription,
      observations: notaFiscal.observacoes || '',
      value: Number(notaFiscal.valor_total),
      deductions: notaFiscal.valor_desconto ? Number(notaFiscal.valor_desconto) : 0,
      effectiveDate: notaFiscal.data_emissao?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
      municipalServiceName: config.descricao_servico || serviceDescription,
      municipalServiceCode: config.codigo_servico_municipal || null,
      municipalServiceId: null,
      taxes: {
        retainIss: false,
        iss: aliquotaIss,
        cofins: 0,
        csll: 0,
        inss: 0,
        ir: 0,
        pis: 0
      }
    };
  }

  static async consultarStatus(chaveAcesso: string): Promise<{
    success: boolean;
    status?: string;
    erro?: string;
  }> {
    try {
      const config = await this.getConfig();
      if (!config) {
        return { success: false, erro: 'Configuração não encontrada' };
      }

      const apiClient = this.createApiClient(config);
      const response = await apiClient.get(`/invoices/${chaveAcesso}`);
      
      return {
        success: true,
        status: response.data?.status || response.data?.situation
      };
    } catch (error) {
      logger.error('Erro ao consultar status da NFS-e no Asaas:', error);
      return {
        success: false,
        erro: error instanceof Error ? error.message : 'Erro ao consultar status'
      };
    }
  }

  static async cancelarNFSe(chaveAcesso: string, justificativa: string): Promise<{
    success: boolean;
    mensagem?: string;
    erro?: string;
  }> {
    try {
      const config = await this.getConfig();
      if (!config) {
        return { success: false, erro: 'Configuração não encontrada' };
      }

      logger.info('Cancelando NFS-e no Asaas', {
        identificador: chaveAcesso,
        justificativa_length: justificativa.length
      });

      const apiClient = this.createApiClient(config);

      // Endpoint correto para cancelar NFS-e: /invoices/{id}/cancel
      const cancelEndpoint = `/invoices/${chaveAcesso}/cancel`;

      logger.info('Fazendo requisição DELETE para cancelar NFS-e', {
        endpoint: cancelEndpoint,
        baseURL: config.baseUrl
      });

      const response = await apiClient.delete(cancelEndpoint, {
        data: {
          reason: justificativa,
          id: chaveAcesso  // Alguns endpoints podem precisar do ID também
        }
      });

      logger.info('Resposta do cancelamento Asaas', {
        status: response.status,
        statusText: response.statusText,
        invoice_status: response.data?.status,
        invoice_id: response.data?.id
      });

      if (response.status === 200 || response.status === 204) {
        logger.info('NFS-e cancelada com sucesso no Asaas');
        return {
          success: true,
          mensagem: 'NFS-e cancelada com sucesso no Asaas'
        };
      }

      return {
        success: false,
        erro: `Erro HTTP ${response.status}`,
        mensagem: response.data?.message || 'Erro ao cancelar NFS-e'
      };
    } catch (error: any) {
      logger.error('Erro na resposta do Asaas', error.message);
      logger.error('Erro ao cancelar NFS-e no Asaas:', {
        identificador: chaveAcesso,
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers
      });
      return {
        success: false,
        erro: 'ERRO_CANCELAMENTO',
        mensagem: error.response?.data?.message || 'Erro ao cancelar NFS-e no Asaas'
      };
    }
  }
}
