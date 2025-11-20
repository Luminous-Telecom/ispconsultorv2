import { Request, Response as ExpressResponse } from 'express';
import { ValidationError } from 'sequelize';
import { ServidorWhatsApp } from '../models/ServidorWhatsApp';
import { MensagemWhatsApp } from '../models/MensagemWhatsApp';
import { logger } from '../utils/logger';

import { WhatsAppCloudService } from '../services/WhatsAppCloudService';

export class ServidorWhatsAppController {
  /**
   * Listar todos os servidores de WhatsApp
   */
  static async list(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const servidores = await ServidorWhatsApp.findAll({
        order: [['created_at', 'DESC']],
        attributes: {
          exclude: ['evolution_api_key', 'whatsapp_cloud_token'], // Não retornar tokens na listagem
        },
      });

      res.json({
        success: true,
        data: servidores,
        message: 'Servidores de WhatsApp listados com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao listar servidores de WhatsApp:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar servidor de WhatsApp por ID
   */
  static async show(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const { id } = req.params;

      const servidor = await ServidorWhatsApp.findByPk(id, {
        attributes: {
          exclude: ['evolution_api_key', 'whatsapp_cloud_token'], // Não retornar tokens
        },
      });

      if (!servidor) {
        res.status(404).json({
          success: false,
          message: 'Servidor de WhatsApp não encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: servidor,
        message: 'Servidor de WhatsApp encontrado'
      });
    } catch (error) {
      logger.error('Erro ao buscar servidor de WhatsApp:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Criar novo servidor de WhatsApp
   */
  static async create(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const servidorData = req.body;

      // Validar dados baseado no tipo de API
      const tipoApi = servidorData.tipo_api || 'evolution';
      
      if (tipoApi === 'evolution') {
        if (!servidorData.evolution_api_url || !servidorData.evolution_api_key || !servidorData.instance_name) {
          res.status(400).json({
            success: false,
            message: 'Para Evolution API: URL da Evolution API, chave da API e nome da instância são obrigatórios'
          });
          return;
        }
      } else if (tipoApi === 'whatsapp_cloud') {
        if (!servidorData.whatsapp_cloud_token || !servidorData.whatsapp_cloud_phone_number_id) {
          res.status(400).json({
            success: false,
            message: 'Para WhatsApp Cloud API: Token e Phone Number ID são obrigatórios'
          });
          return;
        }
      }

      const servidor = await ServidorWhatsApp.create(servidorData);

      res.status(201).json({
        success: true,
        data: servidor,
        message: 'Servidor de WhatsApp criado com sucesso'
      });
    } catch (error: unknown) {
      logger.error('Erro ao criar servidor de WhatsApp:', error);
      
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: error.errors.map((err) => err.message)
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Atualizar servidor de WhatsApp
   */
  static async update(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const { id } = req.params;
      const servidorData = req.body;

      const servidor = await ServidorWhatsApp.findByPk(id);

      if (!servidor) {
        res.status(404).json({
          success: false,
          message: 'Servidor de WhatsApp não encontrado'
        });
        return;
      }

      await servidor.update(servidorData);

      res.json({
        success: true,
        data: servidor,
        message: 'Servidor de WhatsApp atualizado com sucesso'
      });
    } catch (error: unknown) {
      logger.error('Erro ao atualizar servidor de WhatsApp:', error);
      
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: error.errors.map((err) => err.message)
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Deletar servidor de WhatsApp
   */
  static async delete(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const { id } = req.params;

      const servidor = await ServidorWhatsApp.findByPk(id);

      if (!servidor) {
        res.status(404).json({
          success: false,
          message: 'Servidor de WhatsApp não encontrado'
        });
        return;
      }

      await servidor.destroy();

      res.json({
        success: true,
        message: 'Servidor de WhatsApp deletado com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao deletar servidor de WhatsApp:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Testar conexão do servidor de WhatsApp
   */
  static async testConnection(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const { id } = req.params;

      const servidor = await ServidorWhatsApp.findByPk(id);

      if (!servidor) {
        res.status(404).json({
          success: false,
          message: 'Servidor de WhatsApp não encontrado'
        });
        return;
      }

      // Aqui você implementaria a lógica de teste de conexão
      // Por enquanto, vamos simular um teste
      const testResult = {
        success: true,
        message: 'Conexão testada com sucesso',
        details: {
          instance_name: servidor.instance_name,
          evolution_api_url: servidor.evolution_api_url,
          status_conexao: servidor.status_conexao,
          webhook_url: servidor.webhook_url,
          ativo: servidor.ativo,
          notificacoes_automaticas: servidor.notificacoes_automaticas
        }
      };

      res.json(testResult);
    } catch (error) {
      logger.error('Erro ao testar conexão do servidor de WhatsApp:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar servidor ativo
   */
  static async getActive(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const servidor = await ServidorWhatsApp.findOne({
        where: { ativo: true },
        attributes: {
          exclude: ['evolution_api_key', 'whatsapp_cloud_token'], // Não retornar tokens
        },
      });

      if (!servidor) {
        res.status(404).json({
          success: false,
          message: 'Nenhum servidor de WhatsApp ativo encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: servidor,
        message: 'Servidor ativo encontrado'
      });
    } catch (error) {
      logger.error('Erro ao buscar servidor ativo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Criar ou atualizar servidor único
   */
  static async createOrUpdate(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const servidorData = req.body;

      // Buscar servidor existente
      const servidor = await ServidorWhatsApp.findOne({
        where: { ativo: true }
      });

      if (servidor) {
        // Atualizar servidor existente
        const tipoApi = servidorData.tipo_api || servidor.tipo_api || 'evolution';
        
        // Validar dados baseado no tipo de API
        if (tipoApi === 'evolution') {
          if (!servidorData.evolution_api_url || !servidorData.instance_name) {
            res.status(400).json({
              success: false,
              message: 'Para Evolution API: URL da Evolution API e nome da instância são obrigatórios'
            });
            return;
          }
          
          // Se a chave da API não foi fornecida, não atualizar este campo
          if (!servidorData.evolution_api_key || servidorData.evolution_api_key.trim() === '') {
            delete servidorData.evolution_api_key;
          }
        } else if (tipoApi === 'whatsapp_cloud') {
          if (!servidorData.whatsapp_cloud_phone_number_id) {
            res.status(400).json({
              success: false,
              message: 'Para WhatsApp Cloud API: Phone Number ID é obrigatório'
            });
            return;
          }
          
          // Se o token não foi fornecido, não atualizar este campo
          if (!servidorData.whatsapp_cloud_token || servidorData.whatsapp_cloud_token.trim() === '') {
            delete servidorData.whatsapp_cloud_token;
          }
        }

        // Tratar webhook_url vazio como null
        if (servidorData.webhook_url && servidorData.webhook_url.trim() === '') {
          servidorData.webhook_url = null;
        }

        await servidor.update(servidorData);
        
        // Recarregar o servidor para pegar os dados atualizados
        await servidor.reload({
          attributes: {
            exclude: ['evolution_api_key', 'whatsapp_cloud_token'], // Não retornar tokens
          },
        });
        
        res.json({
          success: true,
          data: servidor,
          message: 'Servidor de WhatsApp atualizado com sucesso'
        });
      } else {
        // Criar novo servidor
        // Validar dados obrigatórios (evolution_api_key é obrigatória ao criar)
        // Validar dados baseado no tipo de API
        const tipoApi = servidorData.tipo_api || 'evolution';
        
        if (tipoApi === 'evolution') {
          if (!servidorData.evolution_api_url || !servidorData.evolution_api_key || !servidorData.instance_name) {
            res.status(400).json({
              success: false,
              message: 'Para Evolution API: URL da Evolution API, chave da API e nome da instância são obrigatórios'
            });
            return;
          }
        } else if (tipoApi === 'whatsapp_cloud') {
          if (!servidorData.whatsapp_cloud_token || !servidorData.whatsapp_cloud_phone_number_id) {
            res.status(400).json({
              success: false,
              message: 'Para WhatsApp Cloud API: Token e Phone Number ID são obrigatórios'
            });
            return;
          }
        }

        servidorData.ativo = true;
        servidorData.status_conexao = 'disconnected';
        
        // Tratar webhook_url vazio como null
        if (servidorData.webhook_url && servidorData.webhook_url.trim() === '') {
          servidorData.webhook_url = null;
        }
        
        const novoServidor = await ServidorWhatsApp.create(servidorData);
        
        // Recarregar sem os tokens
        await novoServidor.reload({
          attributes: {
            exclude: ['evolution_api_key', 'whatsapp_cloud_token'],
          },
        });
        
        res.status(201).json({
          success: true,
          data: novoServidor,
          message: 'Servidor de WhatsApp criado com sucesso'
        });
      }
    } catch (error: unknown) {
      logger.error('Erro ao criar/atualizar servidor de WhatsApp:', error);
      
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: error.errors.map((err) => err.message)
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Conectar instância na Evolution API
   */
  static async connectInstance(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const { id } = req.params;

      const servidor = await ServidorWhatsApp.findByPk(id);
      if (!servidor) {
        res.status(404).json({
          success: false,
          message: 'Servidor não encontrado'
        });
        return;
      }

      // Aqui você implementaria a chamada para a Evolution API para conectar a instância
      // Por enquanto, vamos simular a resposta
      await servidor.update({ status_conexao: 'connecting' });

      // Simular delay de conexão
      setTimeout(async () => {
        try {
          await servidor.update({ status_conexao: 'qr_required' });
          logger.info(`Instância ${servidor.instance_name} requer QR Code`);
        } catch (error) {
          logger.error('Erro ao atualizar status:', error);
        }
      }, 2000);

      res.json({
        success: true,
        message: 'Iniciando conexão com a instância...'
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao conectar instância:', error);
      
      res.status(500).json({
        success: false,
        message: `Erro ao conectar instância: ${errorMessage}`
      });
    }
  }

  /**
   * Enviar mensagem de teste
   */
  static async sendTestMessage(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const { id } = req.params;
      const { phone, message } = req.body;

      if (!phone || !message) {
        res.status(400).json({
          success: false,
          message: 'Número do telefone e mensagem são obrigatórios'
        });
        return;
      }

      const servidor = await ServidorWhatsApp.findByPk(id);
      if (!servidor) {
        res.status(404).json({
          success: false,
          message: 'Servidor não encontrado'
        });
        return;
      }

      let result: Record<string, unknown> = {};
      
      // Verificar tipo de API e enviar mensagem apropriadamente
      if (servidor.tipo_api === 'whatsapp_cloud') {
        // WhatsApp Cloud API
        const { WhatsAppCloudService } = await import('../services/WhatsAppCloudService');
        const enviou = await WhatsAppCloudService.enviarTexto(servidor, phone, message);
        
        if (!enviou) {
          throw new Error('Erro ao enviar mensagem via WhatsApp Cloud API');
        }
        
        result = { success: true };
        logger.info(`Mensagem de teste enviada via WhatsApp Cloud API para: ${phone}`);
      } else {
        // Evolution API
        const baseUrl = servidor.evolution_api_url.replace(/\/$/, '');
        const evolutionUrl = `${baseUrl}/message/sendText/${servidor.instance_name}`;
        
        const messageData = {
          number: phone,
          text: message
        };

        logger.info(`Enviando mensagem via Evolution API - URL: ${evolutionUrl}`, {
          instance: servidor.instance_name,
          phone: phone,
          hasApiKey: !!servidor.evolution_api_key
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        let response: globalThis.Response;
        try {
          response = await fetch(evolutionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': servidor.evolution_api_key || ''
            },
            body: JSON.stringify(messageData),
            signal: controller.signal
          });
        } catch (fetchError) {
          clearTimeout(timeoutId);
          logger.error('Erro ao fazer requisição para Evolution API:', {
            error: fetchError instanceof Error ? fetchError.message : String(fetchError),
            errorName: fetchError instanceof Error ? fetchError.name : 'Unknown',
            url: evolutionUrl,
            instance: servidor.instance_name
          });
          throw fetchError;
        }

        clearTimeout(timeoutId);

        logger.info(`Resposta recebida da Evolution API:`, {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries())
        });

        // Tentar parsear JSON, mas tratar erros
        let responseData: Record<string, unknown> = {};
        let responseText = '';
        try {
          responseText = await response.text();
          logger.info(`Corpo da resposta da Evolution API (primeiros 500 chars):`, responseText.substring(0, 500));
          
          if (responseText) {
            try {
              responseData = JSON.parse(responseText) as Record<string, unknown>;
              logger.info('Resposta parseada com sucesso:', responseData);
            } catch (parseError) {
              logger.warn('Resposta da Evolution API não é JSON válido:', {
                parseError: parseError instanceof Error ? parseError.message : String(parseError),
                textPreview: responseText.substring(0, 200)
              });
              // Se não for JSON, usar o texto como mensagem de erro
              if (!response.ok) {
                throw new Error(`Resposta da API: ${responseText.substring(0, 200)}`);
              }
            }
          }
        } catch (textError) {
          logger.error('Erro ao ler resposta da Evolution API:', {
            error: textError instanceof Error ? textError.message : String(textError),
            errorName: textError instanceof Error ? textError.name : 'Unknown',
            status: response.status,
            statusText: response.statusText
          });
          if (!response.ok) {
            throw new Error(`Erro ao processar resposta da Evolution API: ${textError instanceof Error ? textError.message : 'Erro desconhecido'}`);
          }
        }

        if (!response.ok) {
          const errorMsg = (responseData.message as string) || (responseData.error as string) || responseText || `Erro HTTP ${response.status}: ${response.statusText}`;
          logger.error('Erro ao enviar mensagem via Evolution API:', {
            status: response.status,
            statusText: response.statusText,
            responseData: responseData,
            responseText: responseText.substring(0, 500),
            url: evolutionUrl,
            instance: servidor.instance_name
          });
          throw new Error(errorMsg || 'Erro ao enviar mensagem via Evolution API');
        }

        result = responseData;
        logger.info(`Mensagem de teste enviada via Evolution API para: ${phone}`);
      }

      res.json({
        success: true,
        message: `Mensagem de teste enviada com sucesso para ${phone}`,
        data: result
      });

    } catch (error: unknown) {
      const errorMessageInitial = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao enviar mensagem de teste:', error);
      
      let errorMessage = 'Erro ao enviar mensagem de teste';
      let statusCode = 500;
      
      if (error instanceof Error) {
        const errorWithCause = error as Error & { cause?: string };
        if (error.name === 'AbortError' || errorWithCause.cause === 'ConnectTimeoutError') {
          errorMessage = 'Timeout de conexão (30s): A Evolution API não está respondendo. Verifique se a URL está correta e se o servidor está online.';
          statusCode = 504; // Gateway Timeout
        } else if (errorMessageInitial.includes('fetch failed')) {
          errorMessage = 'Erro de conexão: Não foi possível conectar à Evolution API. Verifique a URL e se o servidor está acessível.';
          statusCode = 503; // Service Unavailable
        } else if (errorMessageInitial.includes('ENOTFOUND')) {
          errorMessage = 'Domínio não encontrado: Verifique se a URL da Evolution API está correta.';
          statusCode = 404;
        } else {
          errorMessage = `Erro ao enviar mensagem: ${errorMessageInitial}`;
        }
      }
      
      res.status(statusCode).json({
        success: false,
        message: errorMessage
      });
    }
  }

  /**
   * Buscar mensagem por tipo
   */
  static async getMensagemByTipo(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const { tipo } = req.params;

      const mensagem = await MensagemWhatsApp.findOne({
        where: { tipo }
      });

      if (!mensagem) {
        res.status(404).json({
          success: false,
          message: 'Mensagem não encontrada'
        });
        return;
      }

      res.json({
        success: true,
        data: mensagem
      });
    } catch (error) {
      logger.error('Erro ao buscar mensagem por tipo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Salvar mensagem WhatsApp
   */
  static async saveMensagem(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const { tipo, tipo_envio, mensagem_padrao, template_mapping, interacao1, interacao2, interacao3, ativo } = req.body;

      if (!tipo || !tipo_envio || !mensagem_padrao) {
        res.status(400).json({
          success: false,
          message: 'Tipo, tipo de envio e mensagem padrão são obrigatórios'
        });
        return;
      }

      const mensagemData = {
        tipo,
        tipo_envio,
        mensagem_padrao,
        template_mapping: template_mapping || null,
        interacao1: interacao1 || null,
        interacao2: interacao2 || null,
        interacao3: interacao3 || null,
        ativo
      };

      // Buscar mensagem existente
      let mensagem = await MensagemWhatsApp.findOne({
        where: { tipo }
      });

      if (mensagem) {
        // Atualizar existente
        await mensagem.update(mensagemData);
      } else {
        // Criar novo
        mensagem = await MensagemWhatsApp.create(mensagemData);
      }

      res.json({
        success: true,
        message: 'Mensagem salva com sucesso',
        data: mensagem
      });
    } catch (error) {
      logger.error('Erro ao salvar mensagem:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar templates ativos da Meta API
   */
  static async getTemplates(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const servidor = await ServidorWhatsApp.findOne({ where: { ativo: true } });

      if (!servidor) {
        logger.warn('Tentativa de buscar templates sem servidor ativo');
        res.status(404).json({
          success: false,
          message: 'Nenhum servidor WhatsApp ativo encontrado'
        });
        return;
      }

      if (servidor.tipo_api !== 'whatsapp_cloud') {
        logger.warn(`Tentativa de buscar templates com tipo de API: ${servidor.tipo_api}`);
        res.status(400).json({
          success: false,
          message: 'Esta funcionalidade é apenas para WhatsApp Cloud API'
        });
        return;
      }

      if (!servidor.whatsapp_cloud_token) {
        logger.warn('Tentativa de buscar templates sem token configurado');
        res.status(400).json({
          success: false,
          message: 'Token não configurado'
        });
        return;
      }

      // Para buscar templates, precisamos do WABA ID (WhatsApp Business Account ID)
      // Se não tiver WABA ID, tentar buscar via Phone Number ID usando query
      let apiUrl: string;
      
      if (servidor.whatsapp_cloud_business_account_id) {
        // Usar WABA ID diretamente (método preferido)
        apiUrl = `https://graph.facebook.com/v18.0/${servidor.whatsapp_cloud_business_account_id}/message_templates`;
      } else if (servidor.whatsapp_cloud_phone_number_id) {
        // Tentar buscar via Phone Number ID usando query
        // Primeiro buscar o WABA ID do Phone Number
        const phoneUrl = `https://graph.facebook.com/v18.0/${servidor.whatsapp_cloud_phone_number_id}?fields=whatsapp_business_account`;
        
        const phoneResponse = await fetch(phoneUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${servidor.whatsapp_cloud_token}`
          }
        });

        const phoneData = await phoneResponse.json().catch(() => ({}));
        
        if (!phoneResponse.ok) {
          const errorMessage = (phoneData as { error?: { message?: string } })?.error?.message || 
                              `Erro HTTP ${phoneResponse.status}`;
          
          logger.error('Erro ao buscar WABA ID do Phone Number:', {
            status: phoneResponse.status,
            error: errorMessage,
            phoneData
          });

          res.status(400).json({
            success: false,
            message: `Erro ao buscar informações do Phone Number: ${errorMessage}. Configure o Business Account ID diretamente.`
          });
          return;
        }

        const wabaId = (phoneData as { whatsapp_business_account?: { id?: string } })?.whatsapp_business_account?.id;
        
        if (!wabaId) {
          logger.error('WABA ID não encontrado na resposta do Phone Number');
          res.status(400).json({
            success: false,
            message: 'Não foi possível obter o Business Account ID. Configure o Business Account ID diretamente no servidor.'
          });
          return;
        }

        apiUrl = `https://graph.facebook.com/v18.0/${wabaId}/message_templates`;
      } else {
        res.status(400).json({
          success: false,
          message: 'Business Account ID ou Phone Number ID não configurado'
        });
        return;
      }
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${servidor.whatsapp_cloud_token}`
        }
      });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorObj = responseData as { error?: { message?: string; type?: string; code?: number } };
        const errorMessage = errorObj?.error?.message || 
                            (responseData as { message?: string })?.message || 
                            `Erro HTTP ${response.status}`;
        const errorCode = errorObj?.error?.code || response.status;
        const errorType = errorObj?.error?.type || 'unknown';
        
        const logMessage = `Erro ao buscar templates da Meta API - Status: ${response.status}, Código: ${errorCode}, Tipo: ${errorType}, Mensagem: ${errorMessage}, PhoneNumberId: ${servidor.whatsapp_cloud_phone_number_id}`;
        
        logger.error(logMessage, {
          status: response.status,
          errorCode: errorCode,
          errorType: errorType,
          errorMessage: errorMessage,
          phoneNumberId: servidor.whatsapp_cloud_phone_number_id,
          responseData: JSON.stringify(responseData)
        });

        res.status(400).json({
          success: false,
          message: `Erro ao buscar templates: ${errorMessage}`,
          errorCode: errorCode,
          errorType: errorType,
          data: responseData
        });
        return;
      }

      // Filtrar apenas templates aprovados
      const templates = (responseData as { data?: Array<{ status?: string; [key: string]: unknown }> })?.data || [];
      const templatesAprovados = templates.filter((template: { status?: string }) => 
        template.status === 'APPROVED'
      );

      res.json({
        success: true,
        message: 'Templates buscados com sucesso',
        data: {
          total: templates.length,
          aprovados: templatesAprovados.length,
          templates: templatesAprovados
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      logger.error('Erro ao buscar templates:', {
        error: errorMessage,
        stack: errorStack
      });
      
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }
}
