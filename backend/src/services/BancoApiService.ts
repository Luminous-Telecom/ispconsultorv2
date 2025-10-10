import axios, { AxiosResponse } from 'axios';
import { Banco } from '../models/Banco';
import { logger } from '../utils/logger';
import { efiConfig } from '../config/bancos/efi';
import asaasConfig from '../config/bancos/asaas';

export interface BancoConfig {
  nome: string;
  codigo: string;
  api_url: string;
  sandbox_url: string;
  cobranca_base_url: string;
  api_base_url: string;
  api_endpoints: {
    auth: string;
    boleto: string;
    consultar: string;
    cancelar: string;
    liquidar: string;
    listar_cobrancas: string;
    notification: string;
  };
  api_response_mapping: {
    boleto: {
      id: string;
      url: string;
      barcode: string;
      linha_digitavel: string;
      pdf: string;
      pix_qrcode: string;
      pix_qrcode_image: string;
    };
    status: {
      status: string;
    };
  };
  auth_config: {
    grant_type: string;
    auth_type: string;
  };
  auth_type: 'basic' | 'bearer';
  client_id_field: string;
  client_secret_field: string;
  token: string;
  notification: string;
}

export interface ApiResponse {
  success: boolean;
  message?: string;
  data?: any;
  status?: string;
}

export class BancoApiService {
  private static readonly BANCO_CONFIGS: Record<string, BancoConfig> = {
    efi: efiConfig,
    asaas: asaasConfig as any
  };

  /**
   * Obter configuração do banco
   */
  private static getBancoConfig(tipoBanco: string): BancoConfig | null {
    return this.BANCO_CONFIGS[tipoBanco] || null;
  }

  /**
   * Obter código do banco baseado no tipo
   */
  public static getCodigoBanco(tipoBanco: string): string | null {
    const config = this.getBancoConfig(tipoBanco);
    return config?.codigo || null;
  }

  /**
   * Verificar se as credenciais estão configuradas
   */
  private static verificarCredenciais(banco: Banco, config: BancoConfig): boolean {
    const clientId = banco.client_id_producao;
    const clientSecret = banco.client_secret_producao;
    
    return !!(clientId && clientSecret);
  }

  /**
   * Testar autenticação com o banco
   */
  static async testarAutenticacao(banco: Banco): Promise<ApiResponse> {
    try {
      // Carregar configurações do banco
      const config = this.getBancoConfig(banco.tipo_banco);
      if (!config) {
        return {
          success: false,
          message: 'Configurações do banco não encontradas'
        };
      }

      // Verificar credenciais
      if (!this.verificarCredenciais(banco, config)) {
        return {
          success: false,
          message: 'Credenciais do banco não configuradas'
        };
      }
      
      // Obter token para testar autenticação
      const token = await this.obterToken(banco, config);
      if (!token) {
        return {
          success: false,
          message: 'Falha ao obter token de acesso'
        };
      }
          
      return {
        success: true,
        message: 'Autenticação realizada com sucesso'
      };
    } catch (error: any) {
      logger.error('Exceção ao testar autenticação', {
        banco: banco.tipo_banco,
        error: error.message
      });
      return {
        success: false,
        message: 'Erro ao testar autenticação: ' + error.message
      };
    }
  }

  /**
   * Obter token de acesso com retry para timeouts
   */
  private static async obterToken(banco: Banco, config: BancoConfig): Promise<string | null> {
    const maxTentativas = 3;
    let delay = 2000; // 2 segundos inicial
    
    for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
      try {
        // Usar URL correta baseada no ambiente (sandbox vs produção)
        const baseUrl = banco.sandbox 
          ? config.sandbox_url
          : config.cobranca_base_url;
        const endpoint = baseUrl + config.token;
        
        let authData: any = {};
        
        if (config.auth_type === 'basic') {
          authData = {
            [config.client_id_field]: banco.client_id_producao,
            [config.client_secret_field]: banco.client_secret_producao,
            grant_type: 'client_credentials'
          };
        }

        const response = await axios.post(endpoint, authData, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 segundos de timeout
        });

        if (response.data && response.data.access_token) {
          if (tentativa > 1) {
            logger.info('Token obtido com sucesso após retry', {
              tentativa,
              banco_id: banco.id
            });
          }
          return response.data.access_token;
        }

        logger.warn('Token não encontrado na resposta', {
          response_keys: Object.keys(response.data || {}),
          tentativa
        });
        return null;
      } catch (error: any) {
        const isTimeout = error.code === 'ECONNABORTED' || 
                         error.response?.status === 504 || 
                         error.response?.status === 502 || 
                         error.response?.status === 503;
        
        if (tentativa < maxTentativas && isTimeout) {
          logger.warn(`Tentativa ${tentativa} falhou por timeout, tentando novamente em ${delay}ms`, {
            banco_id: banco.id,
            error: error.message,
            status: error.response?.status,
            tentativa
          });
          
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
          continue;
        }
        
        logger.error('Erro ao obter token', { 
          banco_id: banco.id,
          error: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          tentativa,
          isTimeout
        });
        return null;
      }
    }
    
    return null;
  }

  /**
   * Preparar headers para requisições
   */
  private static prepareHeaders(tipoBanco: string, token: string): Record<string, string> {
    const headers: Record<string, string> = {};
    
    if (tipoBanco === 'efi') {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  /**
   * Obter valor aninhado de um objeto usando notação de ponto
   */
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Gerar título/boleto via API do banco
   */
  static async gerarTitulo(titulo: any): Promise<ApiResponse> {
    const banco = titulo.banco;
    const cliente = titulo.cliente;
    const plano = titulo.plano;
    
    try {
      // Carregar configurações do banco
      const config = this.getBancoConfig(banco.tipo_banco);
      if (!config) {
        return {
          success: false,
          message: 'Configurações do banco não encontradas'
        };
      }

      logger.info('Iniciando geração de título', {
        titulo_id: titulo.id,
        banco_id: banco.id,
        cliente_id: cliente.id,
        tipo_banco: banco.tipo_banco
      });

      // Verificar se já foi gerado
      if (titulo.charge_id) {
        return {
          success: true,
          message: 'Título já foi gerado anteriormente',
          data: { charge_id: titulo.charge_id }
        };
      }

      // Verificar credenciais
      if (!this.verificarCredenciais(banco, config)) {
        return {
          success: false,
          message: 'Credenciais do banco não configuradas'
        };
      }
      
      // Obter token
      const token = await this.obterToken(banco, config);
      if (!token) {
        return {
          success: false,
          message: 'Falha ao obter token de acesso'
        };
      }

      // Preparar dados do boleto
      const dadosBoleto = await this.prepararDadosBoleto(banco, titulo, cliente, plano, config);

      // Log detalhado do payload
      logger.info('Payload enviado para EFI:', {
        titulo_id: titulo.id,
        dadosBoleto: JSON.stringify(dadosBoleto, null, 2)
      });

      // Criar boleto individual
      // Usar URL correta baseada no ambiente (sandbox vs produção)
      const baseUrlCobranca = banco.sandbox 
        ? config.sandbox_url
        : config.cobranca_base_url;
      const endpoint = baseUrlCobranca + config.api_endpoints.boleto;
      
      const headers = this.prepareHeaders(banco.tipo_banco, token);
      headers['Content-Type'] = 'application/json';
      
      // Implementar retry para criação de boleto
      const maxTentativas = 3;
      let delay = 2000;
      let response: any = null;
      
      for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
        try {
          response = await axios.post(endpoint, dadosBoleto, { 
            headers,
            timeout: 30000
          });
          break; // Sucesso, sair do loop
        } catch (error: any) {
          const isTimeout = error.code === 'ECONNABORTED' || 
                           error.response?.status === 504 || 
                           error.response?.status === 502 || 
                           error.response?.status === 503;
          
          if (tentativa < maxTentativas && isTimeout) {
            logger.warn(`Tentativa ${tentativa} falhou por timeout na criação do boleto, tentando novamente em ${delay}ms`, {
              titulo_id: titulo.id,
              status: error.response?.status,
              tentativa
            });
            
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
            continue;
          } else {
            throw error; // Re-throw se não é erro temporário ou é última tentativa
          }
        }
      }
      
      logger.info('Resposta da EFI:', {
        status: response.status,
        data: response.data
      });
      
      if (response.status >= 200 && response.status < 300) {
        const dados = response.data;
        const chargeId = this.getNestedValue(dados, config.api_response_mapping.boleto.id);
        const barcode = this.getNestedValue(dados, config.api_response_mapping.boleto.barcode);
        const url = this.getNestedValue(dados, config.api_response_mapping.boleto.url);
        const linhaDigitavel = this.getNestedValue(dados, config.api_response_mapping.boleto.linha_digitavel || '') || null;
        const pdfUrl = this.getNestedValue(dados, config.api_response_mapping.boleto.pdf);
        const pixQrcode = this.getNestedValue(dados, config.api_response_mapping.boleto.pix_qrcode);
        const pixQrcodeImage = this.getNestedValue(dados, config.api_response_mapping.boleto.pix_qrcode_image);

        // Se barcode for linha digitável (47 dígitos), converter para código de barras (44 dígitos)
        let codigoBarrasFinal = barcode;
        if (barcode) {
          const barcodeLimpo = barcode.replace(/\D/g, '');
          if (barcodeLimpo.length === 47) {
            // É linha digitável, pegar os primeiros 44 dígitos
            codigoBarrasFinal = barcodeLimpo.substring(0, 44);
            logger.info('Linha digitável convertida para código de barras', {
              titulo_id: titulo.id,
              linha_original: barcode,
              codigo_gerado: codigoBarrasFinal
            });
          }
        }

        // Atualizar título
        await titulo.update({
          charge_id: chargeId,
          codigo_barras: codigoBarrasFinal,
          url_boleto: url,
          linha_digitavel: linhaDigitavel,
          qrcode: pixQrcode,
          qrcode_image: pixQrcodeImage,
          status: 'pendente'
        });

        // Atualizar metadados com notification_url
        try {
          const baseUrl = banco.url_retorno || `${process.env.BASE_URL}/webhook/efi`;
          const metadataEndpoint = `${baseUrlCobranca}/v1/charge/${chargeId}/metadata`;
          const metadataPayload = {
            notification_url: baseUrl,
            custom_id: `titulo_${titulo.id}`
          };

          await axios.put(metadataEndpoint, metadataPayload, { headers });
          
          logger.info('Metadados atualizados com sucesso', {
            titulo_id: titulo.id,
            charge_id: chargeId,
            notification_url: baseUrl
          });
        } catch (metadataError: any) {
          logger.warn('Falha ao atualizar metadados, mas título foi criado', {
            titulo_id: titulo.id,
            charge_id: chargeId,
            error: metadataError.message
          });
        }

        logger.info('Título gerado com sucesso', {
          titulo_id: titulo.id,
          charge_id: chargeId
        });

        return {
          success: true,
          message: 'Título gerado com sucesso',
          data: {
            charge_id: chargeId,
            codigo_barras: barcode,
            url_boleto: url,
            linha_digitavel: linhaDigitavel,
            pdf_url: pdfUrl,
            qrcode: pixQrcode,
            qrcode_image: pixQrcodeImage
          }
        };
      }
      
      return {
        success: false,
        message: 'Erro ao gerar título'
      };
    } catch (error: any) {
      const errorDetails = {
        titulo_id: titulo.id,
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        banco_id: banco.id,
        banco_nome: banco.nome,
        sandbox: banco.sandbox,
        tem_client_id: !!banco.client_id_producao,
        tem_client_secret: !!banco.client_secret_producao
      };

      logger.error('Erro ao gerar título', errorDetails);

      // Mensagem específica para erro 401
      let errorMessage = 'Erro ao gerar título: ' + error.message;
      if (error.response?.status === 401) {
        errorMessage = 'Erro de autenticação (401): Verifique as credenciais (Client ID e Client Secret) do banco. ' +
                      `Banco está em modo ${banco.sandbox ? 'SANDBOX' : 'PRODUÇÃO'}. ` +
                      'Certifique-se de que as credenciais correspondem ao ambiente correto.';
      }

      return {
        success: false,
        message: errorMessage
      };
    }
  }

  /**
   * Preparar dados do boleto para API
   */
  private static async prepararDadosBoleto(
    banco: Banco, 
    titulo: any, 
    cliente: any, 
    plano: any, 
    config: BancoConfig
  ): Promise<any> {
    const baseUrl = banco.url_retorno || `${process.env.BASE_URL}/webhook/efi`;
    
    // Buscar dados da empresa (recebedor)
    const { DadosEmpresa } = await import('../models/DadosEmpresa');
    const dadosEmpresa = await DadosEmpresa.findOne();
    
    if (!dadosEmpresa) {
      throw new Error('Dados da empresa não configurados');
    }
    
    // Validar dados obrigatórios do cliente
    if (!cliente.razao_social) {
      throw new Error('Cliente deve ter razão social preenchida');
    }
    if (!cliente.email) {
      throw new Error('Cliente deve ter email preenchido');
    }
    if (!cliente.telefone) {
      throw new Error('Cliente deve ter telefone preenchido');
    }
    if (!cliente.cnpj) {
      throw new Error('Cliente deve ter CNPJ preenchido');
    }
    if (!cliente.endereco) {
      throw new Error('Cliente deve ter endereço preenchido');
    }
    if (!cliente.numero) {
      throw new Error('Cliente deve ter número do endereço preenchido');
    }
    if (!cliente.bairro) {
      throw new Error('Cliente deve ter bairro preenchido');
    }
    if (!cliente.cep) {
      throw new Error('Cliente deve ter CEP preenchido');
    }
    if (!cliente.cidade) {
      throw new Error('Cliente deve ter cidade preenchida');
    }
    if (!cliente.estado) {
      throw new Error('Cliente deve ter estado preenchido');
    }
    
    // Converter valor para centavos
    const valorCentavos = Math.round(Number(titulo.valor) * 100);
    
    // Multa/Juros em basis points (ex.: 2.00% => 200)
    const fineBp = Math.round(Number(banco.percentual_multa || 0) * 100);
    const interestBp = Math.round(Number(banco.percentual_juros || 0) * 100);
    
    const customerData: any = {
      name: cliente.razao_social,
      phone_number: cliente.telefone.replace(/\D/g, ''),
      juridical_person: {
        corporate_name: cliente.razao_social,
        cnpj: cliente.cnpj.replace(/\D/g, ''),
      },
      address: {
        street: cliente.endereco,
        number: cliente.numero,
        neighborhood: cliente.bairro,
        zipcode: cliente.cep.replace(/\D/g, ''),
        city: cliente.cidade,
        complement: cliente.complemento,
        state: cliente.estado
      }
    };

    return {
      items: [{
        name: plano.nome_plano || 'Serviço de Internet',
        value: valorCentavos,
        amount: 1
      }],
      payment: {
        banking_billet: {
          customer: customerData,
          expire_at: new Date(titulo.data_vencimento).toISOString().split('T')[0],
          configurations: {
            fine: fineBp,
            interest: interestBp
          },
          message: `Cobrança referente ao serviço ${plano.nome_plano || 'Internet'} - Título ${titulo.numero_titulo}`
        }
      },
      metadata: {
        custom_id: `titulo_${titulo.id}`
      }
    };
  }

  /**
   * Consultar status de um título
   */
  static async consultarStatus(titulo: any): Promise<ApiResponse> {
    const banco = titulo.banco;
    
    try {
      const config = this.getBancoConfig(banco.tipo_banco);
      if (!config) {
        return {
          success: false,
          message: 'Configurações do banco não encontradas'
        };
      }

      const token = await this.obterToken(banco, config);
      if (!token) {
        return {
          success: false,
          message: 'Falha ao obter token de acesso'
        };
      }
      
      if (!titulo.charge_id) {
        return {
          success: false,
          message: 'Charge ID não encontrado'
        };
      }
      
      // Usar URL correta baseada no ambiente (sandbox vs produção)
      const baseUrlCobranca = banco.sandbox 
        ? (config.sandbox_url || config.cobranca_base_url)
        : config.cobranca_base_url;
      
      const endpoint = baseUrlCobranca + config.api_endpoints.consultar.replace(':id', titulo.charge_id);
      
      logger.info('Consultando status do título', {
        endpoint,
        charge_id: titulo.charge_id,
        titulo_id: titulo.id,
        token_length: token ? token.length : 0
      });
      
      // Implementar retry para consulta de status
      const maxTentativas = 3;
      let delay = 2000;
      let response: any = null;
      
      for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
        try {
          response = await axios.get(endpoint, {
            headers: {
              'Authorization': `Bearer ${token}`
            },
            timeout: 30000
          });
          break; // Sucesso, sair do loop
        } catch (error: any) {
          const isTimeout = error.code === 'ECONNABORTED' || 
                           error.response?.status === 504 || 
                           error.response?.status === 502 || 
                           error.response?.status === 503;
          
          if (tentativa < maxTentativas && isTimeout) {
            logger.warn(`Tentativa ${tentativa} falhou por timeout na consulta de status, tentando novamente em ${delay}ms`, {
              titulo_id: titulo.id,
              status: error.response?.status,
              tentativa
            });
            
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
            continue;
          } else {
            throw error; // Re-throw se não é erro temporário ou é última tentativa
          }
        }
      }
      
      if (response.status >= 200 && response.status < 300) {
        const dados = response.data;
        const status = this.getNestedValue(dados, config.api_response_mapping.status.status);
        const statusNorm = typeof status === 'string' ? status.toLowerCase() : null;
        
        return {
          success: true,
          status: statusNorm || undefined,
          data: dados.data || dados
        };
      }
      
      return {
        success: false,
        message: 'Erro ao consultar status'
      };
    } catch (error: any) {
      logger.error('Erro ao consultar status', { 
        titulo_id: titulo.id,
        error: error.message 
      });
      return {
        success: false,
        message: 'Erro ao consultar status: ' + error.message
      };
    }
  }

  /**
   * Consultar notificação por token
   */
  static async consultarNotificacaoPorToken(banco: Banco, notificationToken: string): Promise<ApiResponse> {
    try {
      const config = this.getBancoConfig(banco.tipo_banco);
      if (!config) {
        return {
          success: false,
          message: 'Configurações do banco não encontradas'
        };
      }

      const token = await this.obterToken(banco, config);
      if (!token) {
        return {
          success: false,
          message: 'Falha ao obter token de acesso'
        };
      }

      // Usar URL sandbox se estiver configurado
      const baseUrlCobranca = banco.sandbox 
        ? (config.sandbox_url || config.cobranca_base_url)
        : config.cobranca_base_url;
      
      const endpoint = baseUrlCobranca + config.notification + '/' + notificationToken;
      
      logger.info('Consultando notificação por token', {
        endpoint: endpoint,
        token: notificationToken
      });
      
      // Implementar retry para lidar com erros temporários (como no PHP)
      const maxTentativas = 3;
      let delay = 1000; // 1 segundo
      let response: any = null;
      
      for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
        try {
          response = await axios.get(endpoint, {
            headers: {
              'Authorization': `Bearer ${token}`
            },
            timeout: 30000
          });
          
          if (response.status >= 200 && response.status < 300) {
            break; // Sucesso, sair do loop
          }
        } catch (error: any) {
          // Se não é a última tentativa e é erro temporário (502, 503, 504), tentar novamente
          if (tentativa < maxTentativas && 
              error.response?.status && 
              [502, 503, 504].includes(error.response.status)) {
            
            logger.warn(`Tentativa ${tentativa} falhou, tentando novamente em ${delay}ms`, {
              status: error.response.status,
              endpoint: endpoint
            });
            
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
            continue;
          } else {
            throw error; // Re-throw se não é erro temporário ou é última tentativa
          }
        }
      }
      
      if (response.status >= 200 && response.status < 300) {
        return {
          success: true,
          data: response.data
        };
      }
      
      return {
        success: false,
        message: 'Erro ao consultar notificação'
      };
    } catch (error: any) {
        // Se é erro de token inválido/expirado, logar como warning em vez de error
        if (error.response?.data?.code === 3500010 || error.response?.status === 500) {
          logger.warn('Token de notificação inválido ou expirado', {
            banco_id: banco.id,
            token: notificationToken,
            status: error.response?.status
          });
        } else {
          logger.error('Erro ao consultar notificação por token', {
            banco_id: banco.id,
            token: notificationToken,
            error: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data
          });
        }
      
      // Se o erro for 3500010 (propriedade não existe), o token pode ter expirado
      if (error.response?.data?.code === 3500010) {
        return {
          success: false,
          message: 'Token de notificação não encontrado ou expirado'
        };
      }
      
      return {
        success: false,
        message: 'Erro ao consultar notificação: ' + error.message 
      };
    }
  }





  /**
   * Cancelar título individual
   */
  static async cancelarTitulo(titulo: any): Promise<ApiResponse> {
    const banco = titulo.banco;
    
    try {
      const config = this.getBancoConfig(banco.tipo_banco);
      if (!config) {
        return {
          success: false,
          message: 'Configurações do banco não encontradas'
        };
      }

      if (!titulo.charge_id) {
        return {
          success: false,
          message: 'Charge ID não encontrado'
        };
      }

      const token = await this.obterToken(banco, config);
      if (!token) {
        return {
          success: false,
          message: 'Falha ao obter token de acesso'
        };
      }

      const baseUrlCobranca = banco.sandbox 
        ? (config.sandbox_url || config.cobranca_base_url)
        : config.cobranca_base_url;
      
      const endpoint = `${baseUrlCobranca}/v1/charge/${titulo.charge_id}/cancel`;

      logger.info('Enviando requisição para cancelar título individual', {
        endpoint,
        charge_id: titulo.charge_id,
        titulo_id: titulo.id
      });

      // Implementar retry para cancelamento de título
      const maxTentativas = 3;
      let delay = 2000;
      let response: any = null;
      
      for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
        try {
          response = await axios.put(endpoint, {}, {
            headers: {
              'Authorization': `Bearer ${token}`
            },
            timeout: 30000
          });
          break; // Sucesso, sair do loop
        } catch (error: any) {
          const isTimeout = error.code === 'ECONNABORTED' || 
                           error.response?.status === 504 || 
                           error.response?.status === 502 || 
                           error.response?.status === 503;
          
          if (tentativa < maxTentativas && isTimeout) {
            logger.warn(`Tentativa ${tentativa} falhou por timeout no cancelamento, tentando novamente em ${delay}ms`, {
              titulo_id: titulo.id,
              status: error.response?.status,
              tentativa
            });
            
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
            continue;
          } else {
            throw error; // Re-throw se não é erro temporário ou é última tentativa
          }
        }
      }

      logger.info('Resposta do cancelamento de título individual', {
        endpoint,
        status: response.status,
        data: response.data
      });

      if (response.status >= 200 && response.status < 300) {
        return {
          success: true,
          message: 'Título cancelado com sucesso'
        };
      }

      return {
        success: false,
        message: 'Erro ao cancelar título: ' + response.status
      };
    } catch (error: any) {
      logger.error('Erro ao cancelar título individual', {
        titulo_id: titulo.id,
        charge_id: titulo.charge_id,
        error: error.message
      });
      return {
        success: false,
        message: 'Erro ao cancelar título: ' + error.message
      };
    }
  }






  /**
   * Liquidar título individual no banco externo
   */
  static async liquidarTitulo(titulo: any): Promise<ApiResponse> {
    try {
      const banco = titulo.banco;
      if (!banco) {
        return {
          success: false,
          message: 'Banco não encontrado para o título'
        };
      }

      const config = this.getBancoConfig(banco.tipo_banco);
      if (!config) {
        return {
          success: false,
          message: 'Configurações do banco não encontradas'
        };
      }

      // Obter token
      const token = await this.obterToken(banco, config);
      if (!token) {
        return {
          success: false,
          message: 'Falha ao obter token de acesso'
        };
      }

      // Preparar dados para liquidação
      const dadosLiquidacao = {
        settle: true
      };

      logger.info('Liquidando título no banco', {
        titulo_id: titulo.id,
        charge_id: titulo.charge_id
      });

      // Fazer requisição para liquidar título
      const baseUrlCobranca = banco.sandbox 
        ? config.sandbox_url
        : config.cobranca_base_url;
      const endpoint = baseUrlCobranca + config.api_endpoints.liquidar
        .replace(':id', titulo.charge_id);

      const response = await axios.put(endpoint, dadosLiquidacao, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        logger.info('Título liquidado com sucesso', {
          titulo_id: titulo.id,
          charge_id: titulo.charge_id
        });

        return {
          success: true,
          message: 'Título liquidado com sucesso',
          data: response.data
        };
      } else {
        return {
          success: false,
          message: 'Falha ao liquidar título no banco'
        };
      }

    } catch (error: any) {
      logger.error('Erro ao liquidar título', {
        titulo_id: titulo.id,
        error: error.message
      });

      return {
        success: false,
        message: 'Erro ao liquidar título: ' + error.message
      };
    }
  }

  /**
   * Envia remessa para o banco
   */
  static async enviarRemessa(banco: Banco, arquivoRemessa: any): Promise<any> {
    try {
      logger.info('Enviando remessa para banco', { 
        banco_id: banco.id,
        banco_nome: banco.nome,
        arquivo: arquivoRemessa.nome_arquivo
      });

      // Simular envio de remessa
      // Em produção, implementar integração real com API do banco
      await new Promise(resolve => setTimeout(resolve, 2000));

      return {
        success: true,
        message: 'Remessa enviada com sucesso',
        data: {
          arquivo: arquivoRemessa.nome_arquivo,
          tamanho: arquivoRemessa.tamanho,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error: any) {
      logger.error('Erro ao enviar remessa', { 
        banco_id: banco.id,
        banco_nome: banco.nome,
        error: error.message 
      });
      return {
        success: false,
        message: 'Erro ao enviar remessa: ' + error.message
      };
    }
  }
}
