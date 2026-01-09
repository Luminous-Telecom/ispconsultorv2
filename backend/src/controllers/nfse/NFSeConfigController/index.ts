import { Request, Response } from 'express';
import { NFSeConfig } from '../../../models/nfse/NFSeConfig';
import { NFSeConfigService } from '../../../services/nfse/NFSeConfigService';
import { logger } from '../../../utils/logger';
import { registrarCriacao, registrarAtualizacao } from '../../../services/sistema/AuditoriaService/index';
import type { AuthenticatedRequest } from '../../../types/auth';
import Joi from 'joi';
import axios from 'axios';
import { URLSearchParams } from 'url';
import { sendSuccess, sendError, sendValidationError, sendUnauthorized } from '../../../utils/responseUtils';

export class NFSeConfigController {
  // Schema de validação
  private static updateSchema = Joi.object({
    codigo_servico_municipal: Joi.string().max(20).allow(null, ''),
    aliquota_iss: Joi.number().min(0).max(100).required(),
    descricao_servico: Joi.string().allow(null, ''),
    serie_nf: Joi.string().max(10).allow(null, ''),
    numero_dps: Joi.number().integer().min(1).allow(null),
    portal_nacional_username: Joi.string().max(255).allow(null, ''),
    portal_nacional_password: Joi.string().max(255).allow(null, ''),
    portal_nacional_base_url: Joi.string().max(500).allow(null, ''),
    portal_nacional_ambiente: Joi.string().valid('HOMOLOGACAO', 'PRODUCAO').required(),
    asaas_api_key: Joi.string().max(255).allow(null, ''),
    asaas_sandbox: Joi.boolean().required(),
    provider: Joi.string().valid('PORTAL_NACIONAL', 'ASAAS').required()
  }).min(1);

  // Obter configuração (sempre retorna o primeiro registro)
  static async get(req: Request, res: Response): Promise<Response> {
    try {
      const config = await NFSeConfigService.get();

      // Registrar criação se for novo
      if (config.created_at.getTime() === config.updated_at.getTime()) {
        try {
          await registrarCriacao(
            req as AuthenticatedRequest,
            'NFSeConfig',
            config.id,
            config.toJSON() as unknown as Record<string, unknown>
          );
        } catch (auditError) {
          // Não interromper o fluxo
        }
      }

      sendSuccess(res, config);
      return res;
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao obter configuração NFS-e', 500, true, {
        context: 'NFSeConfigController',
        action: 'get'
      });
      return res;
    }
  }

  // Atualizar configuração
  static async update(req: Request, res: Response): Promise<Response> {
    try {
      // Validação
      const { error, value } = NFSeConfigController.updateSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const errorMessages = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }));

        // Converter para Record<string, string[]> esperado pelo sendValidationError
        const errorsByField: Record<string, string[]> = errorMessages.reduce((acc, err) => {
          const field = err.field || 'general';
          if (!acc[field]) {
            acc[field] = [];
          }
          acc[field].push(err.message);
          return acc;
        }, {} as Record<string, string[]>);

        sendValidationError(res, 'Dados inválidos', errorsByField);
        return res;
      }

      // Obter configuração existente (ou criar se não existir)
      const config = await NFSeConfigService.get();
      const dadosAnteriores = config.toJSON();
      const foiCriadoAgora = config.created_at.getTime() === config.updated_at.getTime();

      // Atualizar existente
      const configAtualizado = await NFSeConfigService.update(value);
      
      // Se foi criado agora, registrar criação
      if (foiCriadoAgora) {
        try {
          await registrarCriacao(
            req as AuthenticatedRequest,
            'NFSeConfig',
            configAtualizado.id,
            configAtualizado.toJSON() as unknown as Record<string, unknown>
          );
        } catch (auditError) {
          // Não interromper o fluxo
        }
      } else {
        // Se já existia, registrar atualização
        try {
          await registrarAtualizacao(
            req as AuthenticatedRequest,
            'NFSeConfig',
            configAtualizado.id,
            dadosAnteriores as unknown as Record<string, unknown>,
            configAtualizado.toJSON() as unknown as Record<string, unknown>
          );
        } catch (auditError) {
          // Não interromper o fluxo
        }
      }

      sendSuccess(res, configAtualizado, 'Configuração NFS-e atualizada com sucesso');
      return res;
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao atualizar configuração NFS-e', 500, true, {
        context: 'NFSeConfigController',
        action: 'update',
        body: req.body
      });
      return res;
    }
  }

  // Testar autenticação (Portal Nacional ou Asaas)
  static async testAuth(req: Request, res: Response): Promise<Response> {
    try {
      const { provider, portal_nacional_username, portal_nacional_password, portal_nacional_ambiente, asaas_api_key, asaas_sandbox } = req.body;

      logger.info('Iniciando teste de autenticação NFS-e', {
        provider,
        hasCredentials: {
          portal_nacional: !!(portal_nacional_username && portal_nacional_password),
          asaas: !!asaas_api_key
        }
      });

      // Testar conexão do Asaas
      if (provider === 'ASAAS') {
        if (!asaas_api_key) {
          sendValidationError(res, 'API Key do Asaas é obrigatória para testar conexão');
          return res;
        }

        try {
          const baseUrl = asaas_sandbox
            ? 'https://sandbox.asaas.com/api/v3'
            : 'https://www.asaas.com/api/v3';

          // Fazer uma requisição simples para validar a API Key (endpoint de minha conta)
          const response = await axios.get(`${baseUrl}/myAccount`, {
            headers: {
              'access_token': asaas_api_key,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            timeout: 30000
          });

          if (response.data) {
            logger.info('Teste de conexão Asaas bem-sucedido');
            sendSuccess(res, undefined, 'Conexão com Asaas testada com sucesso! A API Key está válida.');
            return res;
          } else {
            sendUnauthorized(res, 'Erro ao validar API Key do Asaas');
            return res;
          }
        } catch (authError: any) {
          const statusCode = authError?.response?.status || 500;
          let errorMessage: string;

          if (statusCode === 401 || statusCode === 403) {
            errorMessage = 'API Key inválida. Verifique se a chave está correta.';
          } else if (authError?.code === 'ENOTFOUND' || authError?.code === 'ECONNREFUSED') {
            errorMessage = 'Não foi possível conectar ao servidor do Asaas. Verifique sua conexão com a internet.';
          } else {
            errorMessage = authError?.response?.data?.message || authError?.message || 'Erro ao testar conexão com Asaas';
          }

          logger.error('Erro ao testar conexão com Asaas', {
            error: errorMessage,
            status: statusCode
          });

          return res.status(statusCode).json({
            success: false,
            message: errorMessage
          });
        }
      }

      // Testar autenticação do Portal Nacional
      if (!portal_nacional_username || !portal_nacional_password) {
        logger.warn('Validação falhou: usuário ou senha não fornecidos');
        sendValidationError(res, 'Usuário e senha são obrigatórios para testar autenticação');
        return res;
      }

      const ambiente = portal_nacional_ambiente || 'HOMOLOGACAO';
      
      // URLs fixas da API Sefin Nacional (Portal Nacional)
      // Homologação: https://sefin.producaorestrita.nfse.gov.br
      // Produção: https://sefin.nfse.gov.br
      // Endpoints: /sefinnacional/{endpoint}
      const baseUrl = ambiente === 'PRODUCAO' 
        ? 'https://sefin.nfse.gov.br'
        : 'https://sefin.producaorestrita.nfse.gov.br';

      logger.info('Configuração do teste de autenticação', {
        ambiente,
        baseUrl,
        username: '***'
      });

      // Tentar autenticar usando método privado do serviço
      // Vamos criar uma instância temporária para teste
      try {
        const testConfig = {
          username: portal_nacional_username,
          password: portal_nacional_password,
          baseUrl: baseUrl,
          ambiente: ambiente as 'PRODUCAO' | 'HOMOLOGACAO'
        };

        // Usar axios diretamente para teste (simulando o que o PortalNacionalNFSeService faz)
        // Tentar endpoint OAuth padrão usando caminho sefinnacional
        const authUrl = `${testConfig.baseUrl}/sefinnacional/oauth/token`;

        logger.info('Tentando autenticar no Portal Nacional', {
          authUrl,
          ambiente: testConfig.ambiente
        });

        // OAuth2 normalmente usa form-urlencoded
        const params = new URLSearchParams();
        params.append('grant_type', 'password');
        params.append('username', testConfig.username);
        params.append('password', testConfig.password);

        const response = await axios.post(
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

        logger.info('Resposta da autenticação recebida', {
          status: response.status,
          hasToken: !!response.data?.access_token
        });

        if (response.data?.access_token) {
          logger.info('Autenticação bem-sucedida');
          sendSuccess(res, undefined, 'Autenticação realizada com sucesso!');
          return res;
        } else {
          logger.warn('Autenticação falhou: token não encontrado na resposta');
          sendUnauthorized(res, 'Autenticação falhou: credenciais inválidas');
          return res;
        }
      } catch (authError: any) {
        let errorMessage: string;
        let statusCode = 500;

        // Log detalhado do erro
        const errorDetails = {
          errorCode: authError?.code,
          errorMessage: authError?.message,
          errorName: authError?.name,
          responseStatus: authError?.response?.status,
          responseStatusText: authError?.response?.statusText,
          responseData: authError?.response?.data,
          authUrl: `${baseUrl}/oauth/token`
        };
        
        logger.error(`Erro ao autenticar no Portal Nacional: ${JSON.stringify(errorDetails, null, 2)}`);
        
        if (authError?.stack) {
          logger.error(`Stack trace: ${authError.stack}`);
        }

        // Tratamento específico para erros de DNS/conexão
        if (authError?.code === 'ENOTFOUND' || authError?.code === 'ECONNREFUSED' || authError?.code === 'ETIMEDOUT') {
          errorMessage = `Não foi possível conectar ao servidor do Portal Nacional. Verifique se a URL base está correta (${baseUrl}) e se o serviço está acessível.`;
          statusCode = 503; // Service Unavailable
        } else if (authError?.response?.data) {
          // Erro retornado pela API
          errorMessage = authError.response.data.error_description 
            || authError.response.data.error
            || authError.response.data.message
            || 'Credenciais inválidas ou erro na autenticação';
          statusCode = authError.response.status || 401;
        } else if (authError?.response?.status) {
          // Erro HTTP sem body
          statusCode = authError.response.status;
          if (statusCode === 401 || statusCode === 403) {
            errorMessage = 'Credenciais inválidas. Verifique usuário e senha.';
          } else if (statusCode === 404) {
            errorMessage = `Endpoint de autenticação não encontrado. Verifique se a URL base está correta (${baseUrl}).`;
          } else {
            errorMessage = `Erro ao conectar com o servidor (HTTP ${statusCode}).`;
          }
        } else {
          errorMessage = authError?.message || 'Erro desconhecido ao testar autenticação';
        }

        logger.error('Erro ao testar autenticação no Portal Nacional NFS-e', {
          error: errorMessage,
          code: authError?.code,
          status: statusCode,
          url: `${baseUrl}/auth/login`
        });

        sendError(res, authError, errorMessage, statusCode, true, {
          context: 'NFSeConfigController',
          action: 'testAuth',
          provider: 'PORTAL_NACIONAL'
        });
        return res;
      }
    } catch (error: unknown) {
      sendError(res, error, 'Erro interno ao testar autenticação', 500, true, {
        context: 'NFSeConfigController',
        action: 'testAuth',
        errorType: error?.constructor?.name
      });
      return res;
    }
  }
}

export default NFSeConfigController;

