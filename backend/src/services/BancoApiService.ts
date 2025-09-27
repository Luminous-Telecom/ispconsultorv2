import axios, { AxiosResponse } from 'axios';
import { Banco } from '../models/Banco';
import { CarneParcela } from '../models/CarneParcela';
import { Carne } from '../models/Carne';
import { logger } from '../utils/logger';
import { efiConfig } from '../config/bancos/efi';

export interface BancoConfig {
  nome: string;
  codigo: string;
  api_url: string;
  sandbox_url: string;
  cobranca_base_url: string;
  api_base_url: string;
  api_endpoints: {
    auth: string;
    carnet: string;
    carnet_consultar: string;
    carnet_cancelar: string;
    carnet_metadata: string;
    carnet_alterar_vencimento: string;
    carnet_parcela_alterar_vencimento: string;
    carnet_parcela_cancelar: string;
    boleto: string;
    consultar: string;
    cancelar: string;
    listar_cobrancas: string;
    notification: string;
  };
  api_response_mapping: {
    carnet: {
      id: string;
      charges: string;
    };
    boleto: {
      id: string;
      url: string;
      barcode: string;
      linha_digitavel: string;
    };
    status: {
      status: string;
    };
  };
  auth_config: {
    grant_type: string;
    auth_type: string;
  };
  suporta_carne: boolean;
  operacoes_suportadas: {
    gerar_carne: boolean;
    cancelar_carne: boolean;
    cancelar_parcela_carne: boolean;
    alterar_vencimento_carne: boolean;
    alterar_vencimento_parcela_carne: boolean;
    liquidar_carne: boolean;
    liquidar_parcela_carne: boolean;
  };
  auth_type: 'basic' | 'bearer';
  client_id_field: string;
  client_secret_field: string;
  carnets: string;
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
    efi: efiConfig
  };

  /**
   * Obter configuração do banco
   */
  private static getBancoConfig(tipoBanco: string): BancoConfig | null {
    return this.BANCO_CONFIGS[tipoBanco] || null;
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
   * Obter token de acesso
   */
  private static async obterToken(banco: Banco, config: BancoConfig): Promise<string | null> {
    try {
      const endpoint = config.cobranca_base_url + config.token;
      
      
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
        }
      });

      if (response.data && response.data.access_token) {
        return response.data.access_token;
      }

      logger.warn('Token não encontrado na resposta', {
        response_keys: Object.keys(response.data || {})
      });
      return null;
    } catch (error: any) {
      logger.error('Erro ao obter token', { 
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      return null;
    }
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
  static async gerarTitulo(parcela: CarneParcela): Promise<ApiResponse> {
    const carne = await parcela.getCarne();
    const banco = await carne.getBanco();
    const cliente = await carne.getCliente();
    const plano = await carne.getPlano();
    
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
        parcela_id: parcela.id,
        banco_id: banco.id,
        cliente_id: cliente.id,
        tipo_banco: banco.tipo_banco
      });

      // Verificar se já foi gerado
      if (parcela.charge_id) {
        return {
          success: true,
          message: 'Título já foi gerado anteriormente',
          data: { charge_id: parcela.charge_id }
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
      const dadosBoleto = this.prepararDadosBoleto(banco, parcela, cliente, plano, config);

      // Criar boleto individual
      const endpoint = config.cobranca_base_url + config.api_endpoints.boleto;
      const headers = this.prepareHeaders(banco.tipo_banco, token);
      headers['Content-Type'] = 'application/json';
      
      const response = await axios.post(endpoint, dadosBoleto, { headers });
      
      if (response.status >= 200 && response.status < 300) {
        const dados = response.data;
        const chargeId = this.getNestedValue(dados, config.api_response_mapping.boleto.id);
        const barcode = this.getNestedValue(dados, config.api_response_mapping.boleto.barcode);
        const url = this.getNestedValue(dados, config.api_response_mapping.boleto.url);
        const linhaDigitavel = this.getNestedValue(dados, config.api_response_mapping.boleto.linha_digitavel || '') || null;

        // Atualizar parcela
        await parcela.update({
          charge_id: chargeId,
          codigo_barras: barcode,
          url_boleto: url,
          linha_digitavel: linhaDigitavel,
          status: 'pendente'
        });

        logger.info('Título gerado com sucesso', {
          parcela_id: parcela.id,
          charge_id: chargeId
        });

        return {
          success: true,
          message: 'Título gerado com sucesso',
          data: {
            charge_id: chargeId,
            barcode,
            url,
            linhaDigitavel
          }
        };
      }
      
      return {
        success: false,
        message: 'Erro ao gerar título'
      };
    } catch (error: any) {
      logger.error('Erro ao gerar título', { 
        parcela_id: parcela.id,
        error: error.message 
      });
      return {
        success: false,
        message: 'Erro ao gerar título: ' + error.message
      };
    }
  }

  /**
   * Preparar dados do boleto para API
   */
  private static prepararDadosBoleto(
    banco: Banco, 
    parcela: CarneParcela, 
    cliente: any, 
    plano: any, 
    config: BancoConfig
  ): any {
    const baseUrl = banco.url_retorno || process.env.APP_URL;
    
    return {
      items: [{
        name: plano.nome || 'Serviço de Internet',
        value: parcela.valor_parcela,
        amount: 1
      }],
      customer: {
        name: cliente.nome_fantasia || cliente.razao_social,
        email: cliente.email,
        phone: cliente.telefone,
        document: cliente.cnpj,
        address: {
          street: cliente.endereco,
          number: cliente.numero,
          neighborhood: cliente.bairro,
          city: cliente.cidade,
          state: cliente.estado,
          zipcode: cliente.cep
        }
      },
      payment: {
        banking_billet: {
          expire_at: parcela.data_vencimento,
          customer: {
            name: cliente.nome_fantasia || cliente.razao_social,
            email: cliente.email,
            phone: cliente.telefone,
            document: cliente.cnpj,
            address: {
              street: cliente.endereco,
              number: cliente.numero,
              neighborhood: cliente.bairro,
              city: cliente.cidade,
              state: cliente.estado,
              zipcode: cliente.cep
            }
          }
        }
      },
      metadata: {
        custom_id: parcela.id.toString(),
        notification_url: `${baseUrl}/webhook/efi`
      }
    };
  }

  /**
   * Consultar status de um título
   */
  static async consultarStatus(parcela: CarneParcela): Promise<ApiResponse> {
    const carne = await parcela.getCarne();
    const banco = await carne.getBanco();
    
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
      
      if (!parcela.charge_id) {
        return {
          success: false,
          message: 'Charge ID não encontrado'
        };
      }
      
      // Usar URL correta baseada no ambiente (sandbox vs produção)
      const baseUrlCobranca = banco.sandbox 
        ? (config.sandbox_url || config.cobranca_base_url)
        : config.cobranca_base_url;
      
      const endpoint = baseUrlCobranca + config.api_endpoints.consultar + '/' + parcela.charge_id;
      
      logger.info('Consultando status da parcela', {
        endpoint,
        charge_id: parcela.charge_id,
        parcela_id: parcela.id,
        token_length: token ? token.length : 0
      });
      
      const response = await axios.get(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
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
        parcela_id: parcela.id,
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
   * Gerar carnê via API
   */
  static async gerarCarne(carne: Carne): Promise<ApiResponse> {
    const banco = await carne.getBanco();
    const cliente = await carne.getCliente();
    
    try {
      const config = this.getBancoConfig(banco.tipo_banco);
      if (!config) {
        return {
          success: false,
          message: 'Configurações do banco não encontradas'
        };
      }

      logger.info('Iniciando geração de carnê', {
        carne_id: carne.id,
        banco_id: banco.id,
        cliente_id: cliente.id,
        tipo_banco: banco.tipo_banco,
        parcelas: carne.quantidade_parcelas
      });

      logger.info('🔍 BancoApiService.gerarCarne - Dados do banco:', {
        id: banco.id,
        nome: banco.nome,
        tipo_banco: banco.tipo_banco,
        sandbox: banco.sandbox,
        client_id_producao: banco.client_id_producao ? '***' : 'não definido',
        client_secret_producao: banco.client_secret_producao ? '***' : 'não definido'
      });

      // Verificar se já foi gerado
      if (carne.carnet_id) {
        return {
          success: true,
          message: 'Carnê já foi gerado anteriormente',
          data: { carnet_id: carne.carnet_id }
        };
      }

      // Verificar credenciais
      if (!this.verificarCredenciais(banco, config)) {
        return {
          success: false,
          message: 'Credenciais do banco não configuradas'
        };
      }

      // Verificar se o banco suporta carnê
      if (!config.suporta_carne) {
        return this.gerarTitulosIndividuais(carne);
      }

      const token = await this.obterToken(banco, config);
      if (!token) {
        return {
          success: false,
          message: 'Falha ao obter token de acesso'
        };
      }

      // Preparar dados do carnê
      const dadosCarne = await this.prepararDadosCarne(banco, carne, cliente, config);
      
      logger.info('🔍 BancoApiService.gerarCarne - Dados preparados:', {
        dadosCarne: dadosCarne
      });

      // Usar URL sandbox se estiver configurado
      const baseUrlCobranca = banco.sandbox 
        ? (config.sandbox_url || config.cobranca_base_url)
        : config.cobranca_base_url;
      
      const endpoint = baseUrlCobranca + config.carnets;
      const headers = this.prepareHeaders(banco.tipo_banco, token);
      headers['Content-Type'] = 'application/json';
      
      const response = await axios.post(endpoint, dadosCarne, { headers });
      
      if (response.status >= 200 && response.status < 300) {
        const dados = response.data;
        const carnetId = this.getNestedValue(dados, config.api_response_mapping.carnet.id);
        const charges = this.getNestedValue(dados, config.api_response_mapping.carnet.charges) || [];

        // Atualizar carnê
        await carne.update({
          carnet_id: carnetId,
          status: 'pendente'
        });

        // Atualizar parcelas com os charge_ids
        if (Array.isArray(charges)) {
          for (let i = 0; i < charges.length; i++) {
            const charge = charges[i];
            const parcela = await CarneParcela.findOne({
              where: { carne_id: carne.id, numero_parcela: i + 1 }
            });
            
            if (parcela) {
              await parcela.update({
                charge_id: charge.charge_id,
                codigo_barras: charge.barcode,
                url_boleto: charge.url,
                linha_digitavel: charge.line,
                status: 'pendente'
              });
            }
          }
        }

        logger.info('Carnê gerado com sucesso', {
          carne_id: carne.id,
          carnet_id: carnetId
        });

        return {
          success: true,
          message: 'Carnê gerado com sucesso',
          data: {
            carnet_id: carnetId,
            charges
          }
        };
      }
      
      return {
        success: false,
        message: 'Erro ao gerar carnê'
      };
    } catch (error: any) {
      logger.error('Erro ao gerar carnê', { 
        carne_id: carne.id,
        error: error.message 
      });
      return {
        success: false,
        message: 'Erro ao gerar carnê: ' + error.message
      };
    }
  }

  /**
   * Preparar dados do carnê para API
   */
  private static async prepararDadosCarne(
    banco: Banco, 
    carne: Carne, 
    cliente: any, 
    config: BancoConfig
  ): Promise<any> {
    const baseUrl = banco.url_retorno || process.env.APP_URL;
    const parcelas = await CarneParcela.findAll({
      where: { carne_id: carne.id },
      order: [['numero_parcela', 'ASC']]
    });

    // Calcular valor por parcela (EFI espera valor do item em centavos por parcela)
    const valorParcela = Number(carne.valor_total) / Number(carne.quantidade_parcelas);
    const valorParcelaCentavos = Math.round(valorParcela * 100);

    // Multa/Juros em basis points (ex.: 2.00% => 200)
    const fineBp = Math.round(Number(banco.percentual_multa || 0) * 100);
    const interestBp = Math.round(Number(banco.percentual_juros || 0) * 100);

    return {
      items: [{
        name: 'Serviço',
        value: valorParcelaCentavos,
        amount: 1
      }],
      customer: {
        name: cliente.nome_fantasia || cliente.razao_social,
        email: cliente.email,
        phone_number: cliente.telefone,
        juridical_person: {
          corporate_name: cliente.nome_fantasia || cliente.razao_social,
          cnpj: cliente.cnpj.replace(/[^\d]/g, '') // Remover formatação do CNPJ
        }
      },
      expire_at: new Date(carne.data_vencimento_primeira).toISOString().split('T')[0], // Formato YYYY-MM-DD
      repeats: Number(carne.quantidade_parcelas),
      split_items: false,
      configurations: {
        fine: fineBp,
        interest: interestBp
      },
      metadata: {
        custom_id: `carne_${carne.id}`,
        notification_url: baseUrl
      }
    };
  }

  /**
   * Marcar como paga (baixa manual) uma parcela específica do carnê no banco
   * PUT /v1/carnet/:id/parcel/:parcel/settle
   */
  static async liquidarParcelaCarne(parcela: CarneParcela): Promise<ApiResponse> {
    const carne = await parcela.getCarne();
    const banco = await carne.getBanco();
    
    try {
      const config = this.getBancoConfig(banco.tipo_banco);
      if (!config) {
        return {
          success: false,
          message: 'Configurações do banco não encontradas'
        };
      }

      if (!config.operacoes_suportadas.liquidar_parcela_carne || !carne.carnet_id || !parcela.numero_parcela) {
        return {
          success: false,
          message: 'Operação não suportada ou identificadores ausentes'
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
      
      const endpoint = `${baseUrlCobranca}${config.api_endpoints.carnet_parcela_cancelar}/${carne.carnet_id}/parcel/${parcela.numero_parcela}/settle`;


      const response = await axios.put(endpoint, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });


      if (response.status >= 200 && response.status < 300) {
        return {
          success: true,
          message: 'Parcela marcada como paga (settled) com sucesso'
        };
      }

      return {
        success: false,
        message: 'Erro ao liquidar parcela: ' + response.status
      };
    } catch (error: any) {
      logger.error('Erro ao liquidar parcela do carnê', {
        parcela_id: parcela.id,
        carnet_id: carne.carnet_id,
        error: error.message
      });
      return {
        success: false,
        message: 'Erro ao liquidar parcela: ' + error.message
      };
    }
  }

  /**
   * Cancelar parcela específica de carnê
   */
  static async cancelarParcelaCarne(parcela: CarneParcela): Promise<ApiResponse> {
    const carne = await parcela.getCarne();
    const banco = await carne.getBanco();
    
    try {
      const config = this.getBancoConfig(banco.tipo_banco);
      if (!config) {
        return {
          success: false,
          message: 'Configurações do banco não encontradas'
        };
      }

      // Verificar se o banco suporta operações de carnê
      if (!config.operacoes_suportadas.cancelar_parcela_carne) {
        // Para outros bancos, usar método individual
        return this.cancelarTitulo(parcela);
      }

      const token = await this.obterToken(banco, config);
      if (!token) {
        return {
          success: false,
          message: 'Falha ao obter token de acesso'
        };
      }

      // Verificar se o carnê tem carnet_id e a parcela tem número
      if (!carne.carnet_id || !parcela.numero_parcela) {
        return this.cancelarTitulo(parcela);
      }
      
      // Endpoint para cancelar parcela do carnê
      const baseUrlCobranca = banco.sandbox 
        ? (config.sandbox_url || config.cobranca_base_url)
        : config.cobranca_base_url;
      
      const endpoint = `${baseUrlCobranca}${config.api_endpoints.carnet_parcela_cancelar}/${carne.carnet_id}/parcel/${parcela.numero_parcela}/cancel`;
      
      logger.info('Enviando requisição para cancelar parcela do carnê', {
        endpoint,
        carnet_id: carne.carnet_id,
        numero_parcela: parcela.numero_parcela,
        parcela_id: parcela.id
      });

      const response = await axios.put(endpoint, {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      logger.info('Resposta do cancelamento de parcela de carnê', {
        endpoint,
        status: response.status,
        data: response.data
      });

      if (response.status >= 200 && response.status < 300) {
        return {
          success: true,
          message: 'Parcela cancelada com sucesso'
        };
      }

      return {
        success: false,
        message: 'Erro ao cancelar parcela: ' + response.status
      };
    } catch (error: any) {
      logger.error('Erro ao cancelar parcela do carnê', {
        parcela_id: parcela.id,
        carnet_id: carne.carnet_id,
        error: error.message
      });
      return {
        success: false,
        message: 'Erro ao cancelar parcela: ' + error.message
      };
    }
  }

  /**
   * Cancelar título individual
   */
  static async cancelarTitulo(parcela: CarneParcela): Promise<ApiResponse> {
    const carne = await parcela.getCarne();
    const banco = await carne.getBanco();
    
    try {
      const config = this.getBancoConfig(banco.tipo_banco);
      if (!config) {
        return {
          success: false,
          message: 'Configurações do banco não encontradas'
        };
      }

      if (!parcela.charge_id) {
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
      
      const endpoint = `${baseUrlCobranca}${config.api_endpoints.cancelar}/${parcela.charge_id}/cancel`;

      logger.info('Enviando requisição para cancelar título individual', {
        endpoint,
        charge_id: parcela.charge_id,
        parcela_id: parcela.id
      });

      const response = await axios.put(endpoint, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

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
        parcela_id: parcela.id,
        charge_id: parcela.charge_id,
        error: error.message
      });
      return {
        success: false,
        message: 'Erro ao cancelar título: ' + error.message
      };
    }
  }

  /**
   * Alterar vencimento de uma parcela específica do carnê
   * PUT /v1/carnet/:id/parcel/:parcel { expire_at }
   */
  static async alterarVencimentoParcelaCarne(parcela: CarneParcela, expireAt: string): Promise<ApiResponse> {
    const carne = await parcela.getCarne();
    const banco = await carne.getBanco();
    
    try {
      const config = this.getBancoConfig(banco.tipo_banco);
      if (!config) {
        return {
          success: false,
          message: 'Configurações do banco não encontradas'
        };
      }

      if (!config.operacoes_suportadas.alterar_vencimento_parcela_carne || !carne.carnet_id || !parcela.numero_parcela) {
        return {
          success: false,
          message: 'Operação não suportada ou identificadores ausentes'
        };
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(expireAt)) {
        return {
          success: false,
          message: 'Data inválida. Use o formato YYYY-MM-DD'
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
      
      const endpoint = `${baseUrlCobranca}${config.api_endpoints.carnet_parcela_alterar_vencimento.replace(':id', carne.carnet_id.toString()).replace(':parcel', parcela.numero_parcela.toString())}`;

      const payload = { expire_at: expireAt };

      logger.info('Enviando requisição para alterar vencimento da parcela do carnê', {
        endpoint,
        carnet_id: carne.carnet_id,
        numero_parcela: parcela.numero_parcela,
        expire_at: expireAt,
        parcela_id: parcela.id
      });

      const response = await axios.put(endpoint, payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      logger.info('Resposta da alteração de vencimento', {
        endpoint,
        status: response.status,
        data: response.data
      });

      if (response.status >= 200 && response.status < 300) {
        return {
          success: true,
          message: 'Vencimento alterado com sucesso'
        };
      }

      return {
        success: false,
        message: 'Erro ao alterar vencimento: ' + response.status
      };
    } catch (error: any) {
      logger.error('Erro ao alterar vencimento da parcela do carnê', {
        parcela_id: parcela.id,
        carnet_id: carne.carnet_id,
        expire_at: expireAt,
        error: error.message
      });
      return {
        success: false,
        message: 'Erro ao alterar vencimento: ' + error.message
      };
    }
  }

  /**
   * Gerar títulos individuais quando carnê não é suportado
   */
  private static async gerarTitulosIndividuais(carne: Carne): Promise<ApiResponse> {
    try {
      const parcelas = await CarneParcela.findAll({
        where: { carne_id: carne.id }
      });

      const resultados = [];
      for (const parcela of parcelas) {
        const resultado = await this.gerarTitulo(parcela);
        resultados.push({
          parcela_id: parcela.id,
          ...resultado
        });
      }

      return {
        success: true,
        message: 'Títulos individuais gerados',
        data: { resultados }
      };
    } catch (error: any) {
      logger.error('Erro ao gerar títulos individuais', { 
        carne_id: carne.id,
        error: error.message 
      });
      return {
        success: false,
        message: 'Erro ao gerar títulos individuais: ' + error.message
      };
    }
  }

  /**
   * Consultar status do carnê
   */
  static async consultarStatusCarne(carne: Carne): Promise<ApiResponse> {
    const banco = await carne.getBanco();
    
    try {
      const config = this.getBancoConfig(banco.tipo_banco);
      if (!config) {
        return {
          success: false,
          message: 'Configurações do banco não encontradas'
        };
      }

      if (!carne.carnet_id) {
        return {
          success: false,
          message: 'Carnet ID ausente'
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
      
      const endpoint = `${baseUrlCobranca}${config.api_endpoints.carnet_consultar}/${carne.carnet_id}`;

      logger.info('Consultando status do carnê', {
        endpoint,
        carnet_id: carne.carnet_id,
        carne_id: carne.id
      });

      const response = await axios.get(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status >= 200 && response.status < 300) {
        logger.info('Status do carnê consultado com sucesso', {
          carnet_id: carne.carnet_id,
          carne_id: carne.id
        });

        return {
          success: true,
          message: 'Status consultado com sucesso',
          data: response.data
        };
      }

      return {
        success: false,
        message: 'Erro ao consultar status'
      };
    } catch (error: any) {
      logger.error('Erro ao consultar status do carnê', { 
        carne_id: carne.id,
        carnet_id: carne.carnet_id,
        error: error.message 
      });
      return {
        success: false,
        message: 'Erro ao consultar status: ' + error.message
      };
    }
  }

  /**
   * Cancelar carnê completo
   */
  static async cancelarCarne(carne: Carne): Promise<ApiResponse> {
    const banco = await carne.getBanco();
    
    try {
      const config = this.getBancoConfig(banco.tipo_banco);
      if (!config) {
        return {
          success: false,
          message: 'Configurações do banco não encontradas'
        };
      }

      if (!config.operacoes_suportadas.cancelar_carne || !carne.carnet_id) {
        return {
          success: false,
          message: 'Operação não suportada ou carnet_id ausente'
        };
      }

      // Verificar se tem parcelas pagas
      const parcelasPagas = await CarneParcela.count({
        where: { 
          carne_id: carne.id, 
          status: 'pago' 
        }
      });

      if (parcelasPagas > 0) {
        return {
          success: false,
          message: 'Não é possível cancelar carnê com parcelas pagas.'
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
      
      const endpoint = `${baseUrlCobranca}${config.api_endpoints.carnet_cancelar}/${carne.carnet_id}/cancel`;

      logger.info('Cancelando carnê', {
        endpoint,
        carnet_id: carne.carnet_id,
        carne_id: carne.id
      });

      const response = await axios.put(endpoint, {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status >= 200 && response.status < 300) {
        logger.info('Carnê cancelado com sucesso', {
          carnet_id: carne.carnet_id,
          carne_id: carne.id
        });

        return {
          success: true,
          message: 'Carnê cancelado com sucesso',
          data: response.data
        };
      }

      return {
        success: false,
        message: 'Erro ao cancelar carnê'
      };
    } catch (error: any) {
      logger.error('Erro ao cancelar carnê', { 
        carne_id: carne.id,
        carnet_id: carne.carnet_id,
        error: error.message 
      });
      return {
        success: false,
        message: 'Erro ao cancelar carnê: ' + error.message
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
