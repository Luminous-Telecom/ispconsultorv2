import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '../../../utils/logger';
import { NFSeConfigService } from '../NFSeConfigService';
import { NotaFiscal } from '../../../models/nfse/NotaFiscal';
import { Cliente } from '../../../models/clientes/Cliente';
import { DadosEmpresa } from '../../../models/sistema/DadosEmpresa';
import { formatDateISOForAPI } from '../../../utils/timezoneUtils';

interface PortalNacionalConfig {
  username: string;
  password: string;
  baseUrl: string;
  ambiente: 'PRODUCAO' | 'HOMOLOGACAO';
}

interface AuthResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface GerarNFSeResponse {
  success: boolean;
  numero?: string;
  serie?: string;
  chave_acesso?: string;
  protocolo?: string;
  data_autorizacao?: Date;
  xml?: string;
  pdf_url?: string;
  danfe_url?: string;
  erro?: string;
  codigo_erro?: string;
}

/**
 * Service para integração com Portal Nacional da NFS-e (ADN Contribuinte)
 * Usa autenticação por usuário e senha
 */
export class PortalNacionalNFSeService {
  private static tokenCache: {
    token: string;
    expiresAt: number;
  } | null = null;

  /**
   * Obtém configuração do Portal Nacional da tabela nfse_config
   */
  private static async getConfig(empresaId?: number | null): Promise<PortalNacionalConfig | null> {
    try {
      const config = await NFSeConfigService.getConfig(empresaId);

      if (!config || !config.portal_nacional_username || !config.portal_nacional_password) {
        logger.warn('Configuração do Portal Nacional NFS-e não encontrada ou incompleta');
        return null;
      }

      // URLs fixas da API Sefin Nacional (Portal Nacional)
      // Homologação: https://sefin.producaorestrita.nfse.gov.br
      // Produção: https://sefin.nfse.gov.br
      // Endpoints: /sefinnacional/{endpoint}
      const baseUrl = config.portal_nacional_ambiente === 'PRODUCAO'
        ? 'https://sefin.nfse.gov.br'
        : 'https://sefin.producaorestrita.nfse.gov.br';

      return {
        username: config.portal_nacional_username,
        password: config.portal_nacional_password,
        baseUrl: baseUrl,
        ambiente: config.portal_nacional_ambiente
      };
    } catch (error) {
      logger.error('Erro ao buscar configuração do Portal Nacional NFS-e:', error);
      return null;
    }
  }

  /**
   * Autentica no Portal Nacional e obtém token de acesso
   */
  private static async autenticar(config: PortalNacionalConfig): Promise<string | null> {
    try {
      // Verificar se há token válido em cache
      if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
        return this.tokenCache.token;
      }

      // URL de autenticação - endpoint OAuth padrão usando caminho sefinnacional
      const authUrl = `${config.baseUrl}/sefinnacional/oauth/token`;

      // OAuth2 normalmente usa form-urlencoded
      const params = new URLSearchParams();
      params.append('grant_type', 'password');
      params.append('username', config.username);
      params.append('password', config.password);

      const response = await axios.post<AuthResponse>(
        authUrl,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          timeout: 30000
        }
      );

      if (response.data.access_token) {
        const expiresIn = response.data.expires_in || 3600; // Default 1 hora
        this.tokenCache = {
          token: response.data.access_token,
          expiresAt: Date.now() + (expiresIn * 1000) - 60000 // Expira 1 minuto antes
        };

        logger.info('Autenticação no Portal Nacional NFS-e realizada com sucesso');
        return response.data.access_token;
      }

      logger.error('Token não encontrado na resposta de autenticação', {
        response: response.data
      });
      return null;
    } catch (error) {
      const axiosError = error as AxiosError<AuthResponse>;
      logger.error('Erro ao autenticar no Portal Nacional NFS-e:', {
        error: axiosError.message,
        status: axiosError.response?.status,
        data: axiosError.response?.data
      });
      return null;
    }
  }

  /**
   * Cria instância do axios configurada para o Portal Nacional
   */
  private static async createApiClient(config: PortalNacionalConfig): Promise<AxiosInstance | null> {
    const token = await this.autenticar(config);
    if (!token) {
      return null;
    }

    return axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 60000 // 60 segundos para operações de NFS-e
    });
  }

  /**
   * Gera NFS-e no Portal Nacional
   */
  static async gerarNFSe(
    notaFiscal: NotaFiscal,
    cliente: Cliente,
    dadosEmpresa: DadosEmpresa
  ): Promise<GerarNFSeResponse> {
    try {
      const config = await this.getConfig(dadosEmpresa?.id);
      if (!config) {
        return {
          success: false,
          codigo_erro: 'CONFIG_001',
          erro: 'Configuração do Portal Nacional NFS-e não encontrada. Configure usuário e senha nos parâmetros do sistema.'
        };
      }

      const apiClient = await this.createApiClient(config);
      if (!apiClient) {
        return {
          success: false,
          codigo_erro: 'AUTH_001',
          erro: 'Erro ao autenticar no Portal Nacional NFS-e'
        };
      }

      // Preparar dados da NFS-e conforme formato esperado pelo Portal Nacional
      const dadosNFSe = await this.prepararDadosNFSe(notaFiscal, cliente, dadosEmpresa);

      // Endpoint de geração de NFS-e
      // POST /sefinnacional/nfse
      const endpoint = '/sefinnacional/nfse';

      try {
        const response = await apiClient.post(endpoint, dadosNFSe);

        if (response.data && response.data.success !== false) {
          // Processar resposta do Portal Nacional
          const dados = response.data;

          return {
            success: true,
            numero: dados.numero || dados.Numero,
            serie: dados.serie || dados.Serie || '1',
            chave_acesso: dados.chave_acesso || dados.ChaveAcesso,
            protocolo: dados.protocolo || dados.Protocolo,
            data_autorizacao: dados.data_autorizacao ? new Date(dados.data_autorizacao) : new Date(),
            xml: dados.xml || dados.ArquivoXml,
            pdf_url: dados.pdf_url || dados.PdfUrl,
            danfe_url: dados.danfe_url || dados.DanfeUrl
          };
        } else {
          const erro = response.data?.erro || response.data?.Erro || response.data?.message || 'Erro desconhecido';
          return {
            success: false,
            codigo_erro: response.data?.codigo_erro || response.data?.CodigoErro || 'GEN_001',
            erro: erro
          };
        }
      } catch (apiError) {
        const axiosError = apiError as AxiosError;
        const errorData = axiosError.response?.data as any;
        
        // Limitar codigo_erro a 10 caracteres (tamanho máximo do campo)
        const codigoErro = errorData?.codigo_erro || errorData?.CodigoErro || String(axiosError.response?.status || '500');
        const codigoErroLimitado = codigoErro.substring(0, 10);
        
        return {
          success: false,
          codigo_erro: codigoErroLimitado,
          erro: errorData?.erro || errorData?.Erro || errorData?.message || axiosError.message || 'Erro ao gerar NFS-e no Portal Nacional'
        };
      }
    } catch (error) {
      logger.error('Erro ao gerar NFS-e no Portal Nacional:', error);
      return {
        success: false,
        codigo_erro: 'INT_001',
        erro: error instanceof Error ? error.message : 'Erro interno ao gerar NFS-e'
      };
    }
  }

  /**
   * Prepara dados da NFS-e no formato esperado pelo Portal Nacional
   */
  private static async prepararDadosNFSe(
    notaFiscal: NotaFiscal,
    cliente: Cliente,
    dadosEmpresa: DadosEmpresa
  ): Promise<Record<string, any>> {
    // Buscar configurações de NFS-e
    const config = await NFSeConfigService.getConfig(dadosEmpresa?.id);
    if (!config) {
      throw new Error('Configuração de NFS-e não encontrada');
    }
    
    // Calcular valor total e deduções
    const valorTotal = Number(notaFiscal.valor_total) || 0;
    const valorServicos = Number(notaFiscal.valor_servicos) || valorTotal;
    const valorDesconto = notaFiscal.valor_desconto ? Number(notaFiscal.valor_desconto) : 0;
    
    // Validar: deduções não podem ser superiores ao valor total
    const valorDeducoes = Math.min(valorDesconto, valorTotal);
    
    if (valorDesconto > valorTotal) {
      logger.warn('Valor de desconto ajustado para não exceder valor total da nota', {
        nota_fiscal_id: notaFiscal.id,
        valor_total: valorTotal,
        valor_desconto_original: valorDesconto,
        valor_desconto_ajustado: valorDeducoes
      });
    }
    
    return {
      // Dados do Prestador (Empresa)
      Prestador: {
        Cnpj: dadosEmpresa.cnpj?.replace(/\D/g, ''),
        InscricaoMunicipal: dadosEmpresa.inscricao_municipal || '',
        RazaoSocial: dadosEmpresa.razao_social || '',
        NomeFantasia: dadosEmpresa.nome_fantasia || dadosEmpresa.razao_social || '',
        Endereco: {
          Logradouro: dadosEmpresa.endereco || '',
          Numero: dadosEmpresa.numero || '',
          Complemento: dadosEmpresa.complemento || '',
          Bairro: dadosEmpresa.bairro || '',
          CodigoMunicipio: '', // Preencher manualmente ou adicionar campo no banco
          Uf: dadosEmpresa.estado || '',
          Cep: dadosEmpresa.cep?.replace(/\D/g, '') || ''
        },
        Contato: {
          Telefone: dadosEmpresa.telefone?.replace(/\D/g, '') || '',
          Email: dadosEmpresa.email || ''
        }
      },
      // Dados do Tomador (Cliente)
      Tomador: {
        CpfCnpj: cliente.cnpj?.replace(/\D/g, ''),
        RazaoSocial: cliente.razao_social,
        NomeFantasia: cliente.nome_fantasia || cliente.razao_social,
        Endereco: {
          Logradouro: cliente.endereco || '',
          Numero: cliente.numero || '',
          Complemento: cliente.complemento || '',
          Bairro: cliente.bairro || '',
          CodigoMunicipio: '', // Preencher manualmente ou adicionar campo no banco
          Uf: cliente.estado || '',
          Cep: cliente.cep?.replace(/\D/g, '') || ''
        },
        Contato: {
          Telefone: cliente.telefone?.replace(/\D/g, '') || cliente.whatsapp?.replace(/\D/g, '') || '',
          Email: cliente.email || ''
        }
      },
      // Dados da NFS-e
      Servico: {
        Valores: {
          ValorServicos: valorServicos,
          ValorDeducoes: valorDeducoes,
          ValorPis: 0,
          ValorCofins: 0,
          ValorInss: 0,
          ValorIr: 0,
          ValorCsll: 0,
          ValorIss: notaFiscal.valor_iss || 0,
          Aliquota: notaFiscal.aliquota_iss || config.aliquota_iss || 0,
          DescontoCondicionado: 0,
          DescontoIncondicionado: 0
        },
        ItemListaServico: config.codigo_servico_municipal || '1401',
        CodigoTributacaoMunicipio: config.codigo_servico_municipal || '', // Preencher conforme município
        Discriminacao: notaFiscal.descricao || config.descricao_servico || '',
        CodigoMunicipio: '', // Preencher manualmente ou adicionar campo no banco
        ExigibilidadeISS: '1', // 1=Exigível, 2=Não incidência, 3=Isenção, etc
        MunicipioIncidencia: '' // Preencher manualmente ou adicionar campo no banco
      },
      // Dados gerais
      DataEmissao: formatDateISOForAPI(notaFiscal.data_emissao) || formatDateISOForAPI(new Date()) || '',
      NaturezaOperacao: notaFiscal.natureza_operacao || 'PRESTAÇÃO DE SERVIÇOS',
      RegimeEspecialTributacao: '', // Preencher se aplicável
      OptanteSimplesNacional: '2', // 1=Sim, 2=Não - Ajustar conforme configuração da empresa
      IncentivadorCultural: '2', // 1=Sim, 2=Não
      Observacoes: notaFiscal.observacoes || ''
    };
  }

  /**
   * Consulta status de uma NFS-e no Portal Nacional
   */
  static async consultarStatus(chaveAcesso: string, empresaId?: number | null): Promise<{
    success: boolean;
    status?: string;
    erro?: string;
  }> {
    try {
      const config = await this.getConfig(empresaId);
      if (!config) {
        return {
          success: false,
          erro: 'Configuração não encontrada'
        };
      }

      const apiClient = await this.createApiClient(config);
      if (!apiClient) {
        return {
          success: false,
          erro: 'Erro ao autenticar'
        };
      }

      // Endpoint de consulta de NFS-e por chave de acesso
      // GET /sefinnacional/nfse/{chaveAcesso}
      const endpoint = `/sefinnacional/nfse/${chaveAcesso}`;

      const response = await apiClient.get(endpoint);
      
      return {
        success: true,
        status: response.data?.status || response.data?.Status
      };
    } catch (error) {
      logger.error('Erro ao consultar status da NFS-e:', error);
      return {
        success: false,
        erro: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Cancela uma NFS-e no Portal Nacional
   */
  static async cancelarNFSe(chaveAcesso: string, justificativa: string, empresaId?: number | null): Promise<{
    success: boolean;
    mensagem?: string;
    erro?: string;
  }> {
    try {
      const config = await this.getConfig(empresaId);
      if (!config) {
        return {
          success: false,
          erro: 'Configuração não encontrada'
        };
      }

      const apiClient = await this.createApiClient(config);
      if (!apiClient) {
        return {
          success: false,
          erro: 'Erro ao autenticar'
        };
      }

      // Endpoint de registro de eventos (cancelamento)
      // POST /sefinnacional/nfse/{chaveAcesso}/eventos
      const endpoint = `/sefinnacional/nfse/${chaveAcesso}/eventos`;

      const response = await apiClient.post(endpoint, {
        justificativa: justificativa
      });

      if (response.data?.success !== false) {
        return {
          success: true,
          mensagem: 'NFS-e cancelada com sucesso'
        };
      } else {
        return {
          success: false,
          erro: response.data?.erro || response.data?.message || 'Erro ao cancelar NFS-e'
        };
      }
    } catch (error) {
      logger.error('Erro ao cancelar NFS-e:', error);
      return {
        success: false,
        erro: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }
}

