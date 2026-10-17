import axios, { AxiosError, AxiosInstance } from 'axios';
import { NotaFiscal } from '../../../models/nfse/NotaFiscal';
import { Cliente } from '../../../models/clientes/Cliente';
import { DadosEmpresa } from '../../../models/sistema/DadosEmpresa';
import { logger } from '../../../utils/logger';
import { NFSeConfigService } from '../NFSeConfigService';
import { BancoService } from '../../cadastros/BancoService';
import { formatDateOnly } from '../../../utils/timezoneUtils';
import asaasConfig from '../../../config/bancos/asaas';

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
  private static async getConfig(empresaId?: number | null): Promise<AsaasConfig | null> {
    try {
      const bancoAsaas = await BancoService.findAsaasNFSeIntegracao(empresaId);

      if (!bancoAsaas) {
        logger.warn('Banco Asaas não habilitado para emissão de NFS-e');
        return null;
      }

      const baseUrl = bancoAsaas.sandbox
        ? (asaasConfig.sandbox_url || asaasConfig.api_base_url)
        : (asaasConfig.api_base_url || asaasConfig.api_url);

      return {
        apiKey: bancoAsaas.api_key || '',
        sandbox: bancoAsaas.sandbox,
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
        const url = axiosError.config?.url || '';
        const status = axiosError.response?.status;
        const errorDescription = errorData?.errors?.[0]?.description || errorData?.message || axiosError.message;
        
        // Erros esperados que não devem ser logados como erro crítico:
        // - 400 em /authorize (falta de saldo ou outros problemas esperados)
        // - Erros relacionados a saldo
        const isExpectedError = 
          (url.includes('/authorize') && status === 400) ||
          (errorDescription && (errorDescription.includes('saldo') || errorDescription.includes('Saldo')));
        
        if (isExpectedError) {
          // Logar apenas como debug para não poluir os logs
          logger.debug('Resposta esperada do Asaas (não crítico)', {
            status,
            url,
            error: errorDescription
          });
        } else {
          // Logar como erro apenas para erros inesperados
          logger.error('Erro na resposta do Asaas', {
            message: axiosError.message,
            status,
            url,
            error: errorDescription
          });
        }
        
        return Promise.reject(error);
      }
    );
    
    return apiClient;
  }

  static async gerarNFSe(
    notaFiscal: NotaFiscal,
    cliente: Cliente,
    dadosEmpresa: DadosEmpresa,
    empresaId?: number | null
  ): Promise<GerarNFSeResponse> {
    try {
      const config = await this.getConfig(empresaId ?? notaFiscal.empresa_id ?? (cliente as { empresa_id?: number | null }).empresa_id);
      if (!config) {
        return {
          success: false,
          codigo_erro: 'CONFIG_001',
          erro: 'Banco Asaas não habilitado para emissão de NFS-e. Habilite a integração no cadastro do banco.'
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

      const dadosNFSe = await this.prepararDadosNFSe(notaFiscal, cliente, dadosEmpresa, customerId, empresaId);
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
            const resultado = this.processarRespostaNota(invoiceDetails.data || authorizeResponse.data, invoiceId);

            // Tentar parsear XML se disponível para extrair dados completos
            if (resultado.xml) {
              try {
                const axios = await import('axios');
                const xmlResponse = await axios.default.get(resultado.xml, { responseType: 'text' });
                const { NFSeXmlParserService } = await import('../NFSeXmlParserService');
                const dadosXmlExtraidos = await NFSeXmlParserService.parseXml(xmlResponse.data);

                // Atualizar resultado com dados do XML se disponíveis
                if (dadosXmlExtraidos.numero && !resultado.numero) {
                  resultado.numero = dadosXmlExtraidos.numero;
                }
                if (dadosXmlExtraidos.serie && !resultado.serie) {
                  resultado.serie = dadosXmlExtraidos.serie;
                }
                if (dadosXmlExtraidos.chave_acesso && !resultado.chave_acesso) {
                  resultado.chave_acesso = dadosXmlExtraidos.chave_acesso;
                }

                logger.info('Dados extraídos do XML após autorização', {
                  numero: dadosXmlExtraidos.numero,
                  chave_acesso: dadosXmlExtraidos.chave_acesso,
                  valor_total: dadosXmlExtraidos.valor_total
                });
              } catch (xmlError) {
                logger.warn('Não foi possível extrair dados do XML após autorização', {
                  error: xmlError instanceof Error ? xmlError.message : String(xmlError)
                });
              }
            }

            return resultado;
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
          const config = await this.getConfig(empresaId ?? notaFiscal.empresa_id ?? (cliente as { empresa_id?: number | null }).empresa_id);
          const isSandbox = config?.sandbox || false;
          
          // Se o erro for por falta de saldo, deixar agendada e o webhook atualizará quando autorizar
          if (errorDescription?.includes('saldo') || errorDescription?.includes('Saldo')) {
            // Invoice agendada - será autorizada quando houver saldo. O webhook atualizará quando autorizada.
            logger.debug('Invoice agendada (sem saldo disponível). Será autorizada quando houver saldo.', {
              invoice_id: invoiceId,
              ambiente: isSandbox ? 'SANDBOX' : 'PRODUÇÃO'
            });
          } else {
            // Logar como warning apenas para erros não relacionados a saldo
            logger.warn('Erro ao autorizar nota fiscal imediatamente', {
              invoice_id: invoiceId,
              error: axiosError.message,
              status: axiosError.response?.status,
              statusText: axiosError.response?.statusText,
              error_description: errorDescription,
              error_data: errorData,
              ambiente: isSandbox ? 'SANDBOX' : 'PRODUÇÃO',
              nota: 'Invoice criada com sucesso, mas não foi possível autorizar imediatamente. O webhook atualizará quando autorizada.'
            });
          }
          
          // Retornar resposta da criação (invoice agendada)
          // O webhook atualizará quando a invoice for autorizada
          const resultado = this.processarRespostaNota(response.data, invoiceId);

          // Tentar parsear XML se disponível para extrair dados completos
          if (resultado.xml) {
            try {
              const axios = await import('axios');
              const xmlResponse = await axios.default.get(resultado.xml, { responseType: 'text' });
              const { NFSeXmlParserService } = await import('../NFSeXmlParserService');
              const dadosXmlExtraidos = await NFSeXmlParserService.parseXml(xmlResponse.data);

              // Atualizar resultado com dados do XML se disponíveis
              if (dadosXmlExtraidos.numero && !resultado.numero) {
                resultado.numero = dadosXmlExtraidos.numero;
              }
              if (dadosXmlExtraidos.serie && !resultado.serie) {
                resultado.serie = dadosXmlExtraidos.serie;
              }
              if (dadosXmlExtraidos.chave_acesso && !resultado.chave_acesso) {
                resultado.chave_acesso = dadosXmlExtraidos.chave_acesso;
              }

              logger.info('Dados extraídos do XML na emissão', {
                numero: dadosXmlExtraidos.numero,
                chave_acesso: dadosXmlExtraidos.chave_acesso,
                valor_total: dadosXmlExtraidos.valor_total
              });
            } catch (xmlError) {
              logger.warn('Não foi possível extrair dados do XML na emissão', {
                error: xmlError instanceof Error ? xmlError.message : String(xmlError)
              });
            }
          }

          return resultado;
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

    try {
      const searchResponse = await apiClient.get(`/customers?cpfCnpj=${cpfCnpj}&limit=1`);
      const customers = searchResponse.data?.data || [];

      if (customers.length > 0) {
        const id = customers[0]?.id;
        const customerId = typeof id === 'string' ? id : typeof id === 'number' ? String(id) : null;

        return customerId;
      }
    } catch (error) {
      // Ignorar erro e tentar criar
    }

    try {
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
    const numero = dados.number || 
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
    customerId: string,
    empresaId?: number | null
  ): Promise<Record<string, any>> {
    const config = await NFSeConfigService.getConfig(empresaId ?? notaFiscal.empresa_id ?? (cliente as { empresa_id?: number | null }).empresa_id);
    if (!config) {
      throw new Error('Configuração de NFS-e não encontrada');
    }

    const serviceDescription = notaFiscal.descricao || config.descricao_servico || '';
    const aliquotaIss = Number(notaFiscal.aliquota_iss) || Number(config.aliquota_iss) || 0;

    // Calcular valor total e deduções
    const valorTotal = Number(notaFiscal.valor_total) || 0;
    const valorDesconto = notaFiscal.valor_desconto ? Number(notaFiscal.valor_desconto) : 0;
    
    // Validar: deduções não podem ser superiores ao valor total
    const deductions = Math.min(valorDesconto, valorTotal);
    
    if (valorDesconto > valorTotal) {
      logger.warn('Valor de desconto ajustado para não exceder valor total da nota', {
        nota_fiscal_id: notaFiscal.id,
        valor_total: valorTotal,
        valor_desconto_original: valorDesconto,
        valor_desconto_ajustado: deductions
      });
    }

    return {
      customer: customerId,
      serviceDescription: serviceDescription,
      observations: notaFiscal.observacoes || '',
      value: valorTotal,
      deductions: deductions,
      effectiveDate: formatDateOnly(notaFiscal.data_emissao) || formatDateOnly(new Date()) || '',
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

  static async consultarStatus(chaveAcesso: string, empresaId?: number | null): Promise<{
    success: boolean;
    status?: string;
    erro?: string;
  }> {
    try {
      const config = await this.getConfig(empresaId);
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

  static async cancelarNFSe(chaveAcesso: string, justificativa: string, empresaId?: number | null): Promise<{
    success: boolean;
    mensagem?: string;
    erro?: string;
  }> {
    try {
      const config = await this.getConfig(empresaId);
      if (!config) {
        return { success: false, erro: 'Configuração não encontrada' };
      }

      const apiClient = this.createApiClient(config);
      const response = await apiClient.post(`/invoices/${chaveAcesso}/cancel`, {
        reason: justificativa
      });

      if (response.status === 200 || response.status === 204) {
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
      logger.error('Erro ao cancelar NFS-e no Asaas', {
        identificador: chaveAcesso,
        erro: error.response?.data?.message || error.message
      });
      return {
        success: false,
        erro: 'ERRO_CANCELAMENTO',
        mensagem: error.response?.data?.message || 'Erro ao cancelar NFS-e no Asaas'
      };
    }
  }
}
