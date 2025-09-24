import axios from 'axios';
import { Carne } from '../models/Carne';
import { CarneParcela } from '../models/CarneParcela';
import { Banco } from '../models/Banco';
import { logger } from '../utils/logger';

interface BancoConfig {
  suporta_carne: boolean;
  cobranca_base_url: string;
  carnets: string;
  api_response_mapping: {
    carnet: {
      id: string;
      charges: string;
    };
  };
}

interface ApiResponse {
  success: boolean;
  data?: any;
  message?: string;
}

export class BancoApiService {
  /**
   * Gerar carnê na API do banco
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

      console.log('🔍 BancoApiService.gerarCarne - Dados do banco:', {
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

      // Preparar dados do carnê usando estrutura correta da EFI
      const dadosCarne = this.prepararDadosCarneEfi(banco, carne, cliente);
      
      console.log('🔍 BancoApiService.gerarCarne - Dados preparados:', JSON.stringify(dadosCarne, null, 2));

      const endpoint = config.cobranca_base_url + config.carnets;
      const headers = this.prepareHeaders(banco.tipo_banco, token);
      headers['Content-Type'] = 'application/json';
      
      const response = await axios.post(endpoint, dadosCarne, { headers });
      
      if (response.status === 200 || response.status === 201) {
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
   * Preparar dados do carnê para API da EFI (baseado no PHP)
   */
  private static prepararDadosCarneEfi(banco: Banco, carne: Carne, cliente: any): any {
    const baseUrl = banco.url_retorno || process.env.APP_URL || 'http://localhost:3001';
    
    // Calcular valor por parcela (EFI espera valor do item em centavos por parcela)
    const valorParcela = Number(carne.valor_total) / Number(carne.quantidade_parcelas);
    const valorParcelaCentavos = Math.round(valorParcela * 100);

    // Multa/Juros em basis points (ex.: 2.00% => 200)
    const fineBp = Math.round(Number(banco.percentual_multa || 0) * 100);
    const interestBp = Math.round(Number(banco.percentual_juros || 0) * 100);

    const payload = {
      items: [
        {
          name: 'Serviço',
          amount: 1,
          value: valorParcelaCentavos
        }
      ],
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
      expire_at: new Date(carne.data_vencimento_primeira).toISOString().split('T')[0], // Formato YYYY-MM-DD
      repeats: Number(carne.quantidade_parcelas),
      split_items: false,
      configurations: {
        fine: fineBp,
        interest: interestBp
      },
      metadata: {
        custom_id: `carne_${carne.id}`,
        notification_url: baseUrl + '/webhook/efi'
      }
    };

    // Processar instruções do banco
    const instrucoesCompletas = [];
    for (let i = 1; i <= 5; i++) {
      const campoInstrucao = `instrucao_linha_${i}`;
      if (banco[campoInstrucao as keyof Banco]) {
        // Processar variáveis nas instruções
        let instrucaoProcessada = (banco[campoInstrucao as keyof Banco] as string)
          .replace(/%nome_plano%/g, 'Serviço')
          .replace(/%tipo_servico%/g, 'consultoria')
          .replace(/%quantidade_usuarios%/g, '300');
        
        instrucoesCompletas.push(instrucaoProcessada.trim());
      }
    }

    // Concatenar todas as instruções com separador
    if (instrucoesCompletas.length > 0) {
      const instrucaoFinal = instrucoesCompletas.join(' | ');
      (payload as any).message = instrucaoFinal.substring(0, 80); // Limitar a 80 caracteres
    }

    return payload;
  }

  /**
   * Obter configuração do banco
   */
  private static getBancoConfig(tipoBanco: string): BancoConfig | null {
    const configs: { [key: string]: BancoConfig } = {
      'efi': {
        suporta_carne: true,
        cobranca_base_url: 'https://cobrancas.api.efipay.com.br',
        carnets: '/v1/carnet',
        api_response_mapping: {
          carnet: {
            id: 'data.carnet_id',
            charges: 'data.charges'
          }
        }
      }
    };

    return configs[tipoBanco] || null;
  }

  /**
   * Verificar credenciais do banco
   */
  private static verificarCredenciais(banco: Banco, config: BancoConfig): boolean {
    if (banco.tipo_banco === 'efi') {
      return !!(banco.client_id_producao && banco.client_secret_producao);
    }
    return false;
  }

  /**
   * Obter token de acesso
   */
  private static async obterToken(banco: Banco, config: BancoConfig): Promise<string | null> {
    if (banco.tipo_banco === 'efi') {
      try {
        const response = await axios.post('https://cobrancas.api.efipay.com.br/v1/authorize', {
          client_id: banco.client_id_producao,
          client_secret: banco.client_secret_producao
        });
        
        return response.data.access_token;
      } catch (error) {
        logger.error('Erro ao obter token EFI:', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Preparar headers da requisição
   */
  private static prepareHeaders(tipoBanco: string, token: string): { [key: string]: string } {
    const headers: { [key: string]: string } = {};
    
    if (tipoBanco === 'efi') {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  /**
   * Obter valor aninhado usando notação de ponto
   */
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Gerar títulos individuais (fallback)
   */
  private static async gerarTitulosIndividuais(carne: Carne): Promise<ApiResponse> {
    // Implementação para bancos que não suportam carnê
    return {
      success: false,
      message: 'Banco não suporta carnê - implementar geração individual'
    };
  }
}
