import { Request, Response as ExpressResponse } from 'express';
import { ValidationError } from 'sequelize';
import { MensagemWhatsAppService } from '../../../services/comunicacao/MensagemWhatsAppService';
import { ServidorWhatsAppService } from '../../../services/comunicacao/ServidorWhatsAppService';
import { ServidorWhatsAppValidatorService } from '../../../services/comunicacao/ServidorWhatsAppValidatorService';
import { ServidorWhatsAppTestService } from '../../../services/comunicacao/ServidorWhatsAppTestService';
import { ServidorWhatsAppProcessorService } from '../../../services/comunicacao/ServidorWhatsAppProcessorService';
import { ServidorWhatsAppConnectionService } from '../../../services/comunicacao/ServidorWhatsAppConnectionService';
import { ServidorWhatsAppMessageService } from '../../../services/comunicacao/ServidorWhatsAppMessageService';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService/index';
import { logger } from '../../../utils/logger';
import type { AuthenticatedRequest } from '../../../types/auth';
import { sendSuccess, sendError, sendNotFound, sendValidationError } from '../../../utils/responseUtils';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';

export class ServidorWhatsAppController {
  /**
   * Listar todos os servidores de WhatsApp
   */
  static async list(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const result = await ServidorWhatsAppService.list();

      sendSuccess(res, result.data, 'Servidores de WhatsApp listados com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao listar servidores de WhatsApp', 500, true);
    }
  }

  /**
   * Buscar servidor de WhatsApp por ID
   */
  static async show(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const { id } = req.params;

      const servidor = await ServidorWhatsAppService.getById(id, { excludeTokens: true });

      if (!servidor) {
        sendNotFound(res, 'Servidor de WhatsApp não encontrado');
        return;
      }

      sendSuccess(res, servidor, 'Servidor de WhatsApp encontrado');
    } catch (error) {
      sendError(res, error, 'Erro ao buscar servidor de WhatsApp', 500, true);
    }
  }

  /**
   * Criar novo servidor de WhatsApp
   */
  static async create(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const servidorData = req.body;

      const validation = ServidorWhatsAppValidatorService.validateServidorData(servidorData, res);
      if (!validation.valid) {
        return;
      }

      const servidor = await ServidorWhatsAppService.create({
        ...servidorData,
        empresa_id: servidorData.empresa_id ?? getEmpresaIdOrNull(req) ?? null
      });

      try {
        await registrarCriacao(
          req as AuthenticatedRequest,
          'ServidorWhatsApp',
          servidor.id,
          servidor.toJSON() as unknown as Record<string, unknown>
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }

      sendSuccess(res, servidor, 'Servidor de WhatsApp criado com sucesso', 201);
    } catch (error: unknown) {
      if (error instanceof ValidationError) {
        const errors = error.errors.map((err) => err.message);
        sendValidationError(res, 'Dados inválidos', { errors });
        return;
      }

      sendError(res, error, 'Erro ao criar servidor de WhatsApp', 500, true);
    }
  }

  /**
   * Atualizar servidor de WhatsApp
   */
  static async update(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const { id } = req.params;
      const servidorData = req.body;

      const servidor = await ServidorWhatsAppService.getById(id);

      if (!servidor) {
        sendNotFound(res, 'Servidor de WhatsApp não encontrado');
        return;
      }

      const dadosAnteriores = servidor.toJSON();
      await ServidorWhatsAppService.updateInstance(servidor, servidorData);

      try {
        await registrarAtualizacao(
          req as AuthenticatedRequest,
          'ServidorWhatsApp',
          servidor.id,
          dadosAnteriores as unknown as Record<string, unknown>,
          servidor.toJSON() as unknown as Record<string, unknown>
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }

      sendSuccess(res, servidor, 'Servidor de WhatsApp atualizado com sucesso');
    } catch (error: unknown) {
      if (error instanceof ValidationError) {
        const errors = error.errors.map((err) => err.message);
        sendValidationError(res, 'Dados inválidos', { errors });
        return;
      }

      sendError(res, error, 'Erro ao atualizar servidor de WhatsApp', 500, true);
    }
  }

  /**
   * Deletar servidor de WhatsApp
   */
  static async delete(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const { id } = req.params;

      const servidor = await ServidorWhatsAppService.getById(id);

      if (!servidor) {
        sendNotFound(res, 'Servidor de WhatsApp não encontrado');
        return;
      }

      const dadosAnteriores = servidor.toJSON();
      await ServidorWhatsAppService.delete(servidor.id);

      try {
        await registrarExclusao(
          req as AuthenticatedRequest,
          'ServidorWhatsApp',
          servidor.id,
          dadosAnteriores as unknown as Record<string, unknown>
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }

      sendSuccess(res, undefined, 'Servidor de WhatsApp deletado com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao deletar servidor de WhatsApp', 500, true);
    }
  }

  /**
   * Testar conexão do servidor de WhatsApp
   */
  static async testConnection(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const { id } = req.params;
      const result = await ServidorWhatsAppTestService.testConnection(Number(id));
      
      if (result.success) {
        sendSuccess(res, result.details || {}, result.message);
      } else {
        sendError(res, new Error(result.message), result.message, 400, false);
      }
    } catch (error) {
      sendError(res, error, 'Erro ao testar conexão do servidor de WhatsApp', 500, true);
    }
  }

  /**
   * Buscar servidor ativo
   */
  static async getActive(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const servidor = await ServidorWhatsAppService.findOne({ ativo: true });

      if (!servidor) {
        sendNotFound(res, 'Nenhum servidor de WhatsApp ativo encontrado');
        return;
      }

      sendSuccess(res, servidor, 'Servidor ativo encontrado');
    } catch (error) {
      sendError(res, error, 'Erro ao buscar servidor ativo', 500, true);
    }
  }

  /**
   * Criar ou atualizar servidor único
   */
  static async createOrUpdate(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const servidorData = req.body;
      const result = await ServidorWhatsAppProcessorService.processCreateOrUpdate(
        servidorData,
        req as AuthenticatedRequest
      );

      const message = result.isNew 
        ? 'Servidor de WhatsApp criado com sucesso'
        : 'Servidor de WhatsApp atualizado com sucesso';
      
      sendSuccess(res, result.servidor, message, result.isNew ? 201 : 200);
    } catch (error: unknown) {
      if (error instanceof ValidationError) {
        const errors = error.errors.map((err) => err.message);
        sendValidationError(res, 'Dados inválidos', { errors });
        return;
      }

      if (error instanceof Error) {
        sendValidationError(res, error.message);
        return;
      }

      sendError(res, error, 'Erro ao criar/atualizar servidor de WhatsApp', 500, true);
    }
  }

  /**
   * Conectar instância na Evolution API
   */
  static async connectInstance(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const { id } = req.params;

      const servidor = await ServidorWhatsAppService.getById(id);
      if (!servidor) {
        sendNotFound(res, 'Servidor não encontrado');
        return;
      }

      await ServidorWhatsAppConnectionService.connectInstance(servidor);
      sendSuccess(res, undefined, 'Iniciando conexão com a instância...');
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao conectar instância', 500, true);
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
        sendValidationError(res, 'Número do telefone e mensagem são obrigatórios');
        return;
      }

      const servidor = await ServidorWhatsAppService.getById(id);
      if (!servidor) {
        sendNotFound(res, 'Servidor não encontrado');
        return;
      }

      const result = await ServidorWhatsAppMessageService.sendTestMessage(servidor, phone, message);
      sendSuccess(res, result, `Mensagem de teste enviada com sucesso para ${phone}`);
    } catch (error: unknown) {
      const { message: errorMessage, statusCode } = ServidorWhatsAppMessageService.extractErrorMessage(error);
      sendError(res, error, errorMessage, statusCode, true);
    }
  }

  /**
   * Buscar mensagem por tipo
   */
  static async getMensagemByTipo(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const { tipo } = req.params;
      logger.info('Buscando mensagem WhatsApp por tipo:', { tipo });

      const mensagem = await MensagemWhatsAppService.findByTipo(tipo);

      if (!mensagem) {
        logger.info('Mensagem não encontrada para o tipo:', { tipo });
        sendNotFound(res, 'Mensagem não encontrada');
        return;
      }

      logger.info('Mensagem encontrada:', { tipo, id: mensagem.id });
      sendSuccess(res, mensagem);
    } catch (error) {
      sendError(res, error, 'Erro ao buscar mensagem por tipo', 500, true, {
        tipo: req.params.tipo
      });
    }
  }

  /**
   * Salvar mensagem WhatsApp
   */
  static async saveMensagem(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const { tipo, tipo_envio, mensagem_padrao, mensagem_manual, template_mapping, interacao1, interacao2, interacao3, ativo } = req.body;

      logger.info('Salvando mensagem WhatsApp:', { 
        tipo, 
        tipo_envio, 
        temMensagemPadrao: !!mensagem_padrao,
        temMensagemManual: !!mensagem_manual,
        temTemplateMapping: !!template_mapping,
        ativo 
      });

      if (!tipo || !tipo_envio) {
        logger.warn('Validação falhou: tipo ou tipo_envio ausente', { tipo, tipo_envio });
        sendValidationError(res, 'Tipo e tipo de envio são obrigatórios');
        return;
      }

      // Para todos os tipos, se tiver template_mapping, não precisa de mensagem_padrao
      // Para envio_manual sem template, mensagem_manual é obrigatória
      // Para outros tipos sem template, mensagem_padrao é obrigatória
      if (tipo !== 'envio_manual' && !mensagem_padrao && !template_mapping) {
        logger.warn('Validação falhou: mensagem_padrao ou template_mapping obrigatório', { tipo, temMensagemPadrao: !!mensagem_padrao, temTemplateMapping: !!template_mapping });
        sendValidationError(res, 'Mensagem padrão ou template mapping é obrigatório');
        return;
      }

      if (tipo === 'envio_manual' && !template_mapping && !mensagem_manual) {
        logger.warn('Validação falhou: template_mapping ou mensagem_manual obrigatório para envio_manual', { tipo, temTemplateMapping: !!template_mapping, temMensagemManual: !!mensagem_manual });
        sendValidationError(res, 'Template mapping ou mensagem manual é obrigatório para envio manual');
        return;
      }

      // Para envio_manual, se tiver template, usar mensagem_manual no body do template (ou vazio)
      // Se não tiver template, usar mensagem_manual como mensagem_padrao
      // Para outros tipos, usar mensagem_padrao ou vazio se tiver template
      const mensagemPadraoFinal = tipo === 'envio_manual' && !template_mapping && mensagem_manual
        ? mensagem_manual 
        : (mensagem_padrao || '');

      logger.info('Dados finais para salvar:', { 
        tipo, 
        tipo_envio, 
        mensagemPadraoLength: mensagemPadraoFinal.length,
        mensagemManualLength: mensagem_manual?.length || 0,
        temTemplateMapping: !!template_mapping
      });

      const mensagemData = {
        tipo,
        tipo_envio,
        mensagem_padrao: mensagemPadraoFinal,
        mensagem_manual: mensagem_manual || null,
        template_mapping: template_mapping || null,
        interacao1: interacao1 || null,
        interacao2: interacao2 || null,
        interacao3: interacao3 || null,
        ativo
      };

      // Buscar mensagem existente
      let mensagem = await MensagemWhatsAppService.findByTipo(tipo);

      logger.info('Mensagem existente encontrada:', { tipo, existe: !!mensagem, id: mensagem?.id });

      try {
        if (mensagem) {
          // Atualizar existente
          logger.info('Atualizando mensagem existente:', { id: mensagem.id, tipo });
          const dadosAnteriores = mensagem.toJSON();
          mensagem = await MensagemWhatsAppService.update(mensagem.id, mensagemData);
          logger.info('Mensagem atualizada com sucesso:', { id: mensagem.id });
          
          try {
            await registrarAtualizacao(
              req as AuthenticatedRequest,
              'MensagemWhatsApp',
              mensagem.id,
              dadosAnteriores as unknown as Record<string, unknown>,
              mensagem.toJSON() as unknown as Record<string, unknown>
            );
          } catch (auditError) {
            // Não interromper o fluxo
          }
        } else {
          // Criar novo
          logger.info('Criando nova mensagem:', { tipo });
          mensagem = await MensagemWhatsAppService.create({
            ...mensagemData,
            empresa_id: getEmpresaIdOrNull(req) ?? null
          });
          logger.info('Mensagem criada com sucesso:', { id: mensagem.id, tipo });
          
          try {
            await registrarCriacao(
              req as AuthenticatedRequest,
              'MensagemWhatsApp',
              mensagem.id,
              mensagem.toJSON() as unknown as Record<string, unknown>
            );
          } catch (auditError) {
            // Não interromper o fluxo
          }
        }
      } catch (dbError) {
        const dbErrorMessage = dbError instanceof Error ? dbError.message : 'Erro desconhecido no banco';
        const dbErrorStack = dbError instanceof Error ? dbError.stack : undefined;
        logger.error('Erro ao salvar/atualizar mensagem no banco:', { 
          tipo, 
          error: dbErrorMessage, 
          stack: dbErrorStack,
          mensagemData: {
            tipo: mensagemData.tipo,
            tipo_envio: mensagemData.tipo_envio,
            temMensagemPadrao: !!mensagemData.mensagem_padrao,
            temMensagemManual: !!mensagemData.mensagem_manual
          }
        });
        throw new Error(`Erro ao salvar mensagem: ${dbErrorMessage}`);
      }

      sendSuccess(res, mensagem, 'Mensagem salva com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao salvar mensagem', 500, true);
    }
  }

  /**
   * Buscar templates ativos da Meta API
   */
  static async getTemplates(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const servidor = await ServidorWhatsAppService.findOne({ ativo: true });

      if (!servidor) {
        logger.warn('Tentativa de buscar templates sem servidor ativo');
        sendNotFound(res, 'Nenhum servidor WhatsApp ativo encontrado');
        return;
      }

      if (servidor.tipo_api !== 'whatsapp_cloud') {
        logger.warn(`Tentativa de buscar templates com tipo de API: ${servidor.tipo_api}`);
        sendValidationError(res, 'Esta funcionalidade é apenas para WhatsApp Cloud API');
        return;
      }

      if (!servidor.whatsapp_cloud_token) {
        logger.warn('Tentativa de buscar templates sem token configurado');
        sendValidationError(res, 'Token não configurado');
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

          sendError(res, new Error(`Erro ao buscar informações do Phone Number: ${errorMessage}. Configure o Business Account ID diretamente.`), `Erro ao buscar informações do Phone Number: ${errorMessage}. Configure o Business Account ID diretamente.`, 400, false);
          return;
        }

        const wabaId = (phoneData as { whatsapp_business_account?: { id?: string } })?.whatsapp_business_account?.id;
        
        if (!wabaId) {
          logger.error('WABA ID não encontrado na resposta do Phone Number');
          sendValidationError(res, 'Não foi possível obter o Business Account ID. Configure o Business Account ID diretamente no servidor.');
          return;
        }

        apiUrl = `https://graph.facebook.com/v18.0/${wabaId}/message_templates`;
      } else {
        sendValidationError(res, 'Business Account ID ou Phone Number ID não configurado');
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

        sendError(res, new Error(`Erro ao buscar templates: ${errorMessage}`), `Erro ao buscar templates: ${errorMessage}`, 400, false, {
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

      sendSuccess(res, {
        total: templates.length,
        aprovados: templatesAprovados.length,
        templates: templatesAprovados
      }, 'Templates buscados com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao buscar templates', 500, true);
    }
  }
}
