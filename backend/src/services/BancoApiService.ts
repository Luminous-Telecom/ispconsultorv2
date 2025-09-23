import axios, { AxiosResponse } from 'axios';
import { Banco } from '../models/Banco';
import { CarneParcela } from '../models/CarneParcela';
import { Carne } from '../models/Carne';
import { logger } from '../utils/logger';
import { efiConfig } from '../config/bancos/efi';

export interface BancoConfig {
  cobranca_base_url: string;
  api_endpoints: {
    boleto: string;
    carnets: string;
    consultar: string;
    token: string;
    notification: string;
  };
  api_response_mapping: {
    boleto: {
      id: string;
      barcode: string;
      url: string;
      linha_digitavel?: string;
    };
    carnets: {
      id: string;
      charges: string;
    };
    status: {
      status: string;
    };
  };
  suporta_carne: boolean;
  auth_type: 'basic' | 'bearer';
  client_id_field: string;
  client_secret_field: string;
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
   * Obter token de acesso
   */
  private static async obterToken(banco: Banco, config: BancoConfig): Promise<string | null> {
    try {
      const endpoint = config.cobranca_base_url + config.api_endpoints.token;
      
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

      return null;
    } catch (error: any) {
      logger.error('Erro ao obter token', { error: error.message });
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
    const baseUrl = process.env.APP_URL || 'http://localhost:3001';
    
    return {
      items: [{
        name: plano.nome || 'Serviço de Internet',
        value: parcela.valor_parcela,
        amount: 1
      }],
      customer: {
        name: cliente.nome,
        email: cliente.email,
        phone: cliente.telefone,
        document: cliente.cpf_cnpj,
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
            name: cliente.nome,
            email: cliente.email,
            phone: cliente.telefone,
            document: cliente.cpf_cnpj,
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
      
      const endpoint = config.cobranca_base_url + config.api_endpoints.consultar + '/' + parcela.charge_id;
      
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

      const endpoint = config.cobranca_base_url + config.api_endpoints.notification + '/' + notificationToken;
      
      const response = await axios.get(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
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
      logger.error('Erro ao consultar notificação por token', { 
        banco_id: banco.id,
        token: notificationToken,
        error: error.message 
      });
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

      const endpoint = config.cobranca_base_url + config.api_endpoints.carnets;
      const headers = this.prepareHeaders(banco.tipo_banco, token);
      headers['Content-Type'] = 'application/json';
      
      const response = await axios.post(endpoint, dadosCarne, { headers });
      
      if (response.status >= 200 && response.status < 300) {
        const dados = response.data;
        const carnetId = this.getNestedValue(dados, config.api_response_mapping.carnets.id);
        const charges = this.getNestedValue(dados, config.api_response_mapping.carnets.charges) || [];

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
    const baseUrl = process.env.APP_URL || 'http://localhost:3001';
    const parcelas = await CarneParcela.findAll({
      where: { carne_id: carne.id },
      order: [['numero_parcela', 'ASC']]
    });

    const charges = parcelas.map(parcela => ({
        value: parcela.valor_parcela,
      expire_at: parcela.data_vencimento,
      customer: {
        name: cliente.nome,
        email: cliente.email,
        phone: cliente.telefone,
        document: cliente.cpf_cnpj,
        address: {
          street: cliente.endereco,
          number: cliente.numero,
          neighborhood: cliente.bairro,
          city: cliente.cidade,
          state: cliente.estado,
          zipcode: cliente.cep
        }
      },
      metadata: {
        custom_id: parcela.id.toString()
      }
    }));

    return {
      items: [{
        name: 'Carnê de Serviços',
        value: carne.valor_total,
        amount: 1
      }],
      customer: {
        name: cliente.nome,
        email: cliente.email,
        phone: cliente.telefone,
        document: cliente.cpf_cnpj,
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
          expire_at: parcelas[0]?.data_vencimento,
          customer: {
            name: cliente.nome,
            email: cliente.email,
            phone: cliente.telefone,
            document: cliente.cpf_cnpj,
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
      charges,
      metadata: {
        custom_id: carne.id.toString(),
        notification_url: `${baseUrl}/webhook/efi/carne`
      }
    };
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
}
