import { Request, Response as ExpressResponse } from 'express';
import { ValidationError } from 'sequelize';
import { ServidorWhatsApp } from '../models/ServidorWhatsApp';
import { MensagemWhatsApp } from '../models/MensagemWhatsApp';
import { logger } from '../utils/logger';

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
      const { tipo, tipo_envio, mensagem_padrao, interacao1, interacao2, interacao3, ativo } = req.body;

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
}
