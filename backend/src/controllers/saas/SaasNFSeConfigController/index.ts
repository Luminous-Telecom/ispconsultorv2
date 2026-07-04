import { Request, Response } from 'express';
import { SaasNFSeConfigService } from '../../../services/saas/SaasNFSeConfigService';
import { registrarAtualizacao, registrarCriacao } from '../../../services/sistema/AuditoriaService';
import { logger } from '../../../utils/logger';
import Joi from 'joi';
import axios from 'axios';
import { URLSearchParams } from 'url';
import { sendSuccess, sendError, sendValidationError, sendUnauthorized } from '../../../utils/responseUtils';
import type { AuthenticatedRequest } from '../../../types/auth';

export class SaasNFSeConfigController {
  private static maskSensitiveFields(config: Record<string, unknown>): Record<string, unknown> {
    const masked = { ...config };
    masked.has_asaas_api_key = !!masked.asaas_api_key;
    delete masked.asaas_api_key;
    masked.has_portal_nacional_password = !!masked.portal_nacional_password;
    delete masked.portal_nacional_password;
    return masked;
  }

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

  static async get(req: Request, res: Response): Promise<Response> {
    try {
      const config = await SaasNFSeConfigService.get();
      if (!config) {
        sendSuccess(res, null);
        return res;
      }

      sendSuccess(res, SaasNFSeConfigController.maskSensitiveFields(config.toJSON() as Record<string, unknown>));
      return res;
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao obter configuração NFS-e SaaS', 500, true, {
        context: 'SaasNFSeConfigController',
        action: 'get'
      });
      return res;
    }
  }

  static async update(req: Request, res: Response): Promise<Response> {
    try {
      const { error, value } = SaasNFSeConfigController.updateSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const errorMessages = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }));
        const errorsByField: Record<string, string[]> = errorMessages.reduce((acc, err) => {
          const field = err.field || 'general';
          if (!acc[field]) acc[field] = [];
          acc[field].push(err.message);
          return acc;
        }, {} as Record<string, string[]>);
        sendValidationError(res, 'Dados inválidos', errorsByField);
        return res;
      }

      const dadosParaSalvar = { ...value };
      const camposSensiveis = ['asaas_api_key', 'portal_nacional_password'] as const;
      for (const campo of camposSensiveis) {
        if (dadosParaSalvar[campo] === null || dadosParaSalvar[campo] === '' || dadosParaSalvar[campo] === undefined) {
          delete dadosParaSalvar[campo];
        }
      }

      const configAnterior = await SaasNFSeConfigService.get();
      const configAtualizado = await SaasNFSeConfigService.update(dadosParaSalvar);
      if (!configAnterior) {
        await registrarCriacao(
          req as AuthenticatedRequest,
          'SaasNFSeConfig',
          configAtualizado.id,
          configAtualizado.toJSON() as Record<string, unknown>
        );
      } else {
        await registrarAtualizacao(req as AuthenticatedRequest, 'SaasNFSeConfig', configAtualizado.id,
          configAnterior.toJSON() as Record<string, unknown>,
          configAtualizado.toJSON() as Record<string, unknown>);
      }
      sendSuccess(res, SaasNFSeConfigController.maskSensitiveFields(configAtualizado.toJSON() as Record<string, unknown>), 'Configuração NFS-e atualizada com sucesso');
      return res;
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao atualizar configuração NFS-e SaaS', 500, true, {
        context: 'SaasNFSeConfigController',
        action: 'update',
        body: req.body
      });
      return res;
    }
  }

  static async testAuth(req: Request, res: Response): Promise<Response> {
    try {
      const { provider, portal_nacional_username, portal_nacional_password, portal_nacional_ambiente, asaas_api_key, asaas_sandbox } = req.body;

      logger.info('Iniciando teste de autenticação NFS-e SaaS', {
        provider,
        hasCredentials: {
          portal_nacional: !!(portal_nacional_username && portal_nacional_password),
          asaas: !!asaas_api_key
        }
      });

      if (provider === 'ASAAS') {
        if (!asaas_api_key) {
          sendValidationError(res, 'API Key do Asaas é obrigatória para testar conexão');
          return res;
        }

        try {
          const baseUrl = asaas_sandbox
            ? 'https://sandbox.asaas.com/api/v3'
            : 'https://www.asaas.com/api/v3';

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
        } catch (authError: unknown) {
          type AxiosErr = { response?: { status?: number; data?: { message?: string } }; code?: string; message?: string };
          const axiosError = authError as AxiosErr;
          const statusCode = axiosError?.response?.status || 500;
          let errorMessage: string;

          if (statusCode === 401 || statusCode === 403) {
            errorMessage = 'API Key inválida. Verifique se a chave está correta.';
          } else if (axiosError?.code === 'ENOTFOUND' || axiosError?.code === 'ECONNREFUSED') {
            errorMessage = 'Não foi possível conectar ao servidor do Asaas. Verifique sua conexão com a internet.';
          } else {
            errorMessage = axiosError?.response?.data?.message || axiosError?.message || 'Erro ao testar conexão com Asaas';
          }

          logger.error('Erro ao testar conexão com Asaas', { error: errorMessage, status: statusCode });
          return res.status(statusCode).json({ success: false, message: errorMessage });
        }
      }

      if (!portal_nacional_username || !portal_nacional_password) {
        logger.warn('Validação falhou: usuário ou senha não fornecidos');
        sendValidationError(res, 'Usuário e senha são obrigatórios para testar autenticação');
        return res;
      }

      const ambiente = portal_nacional_ambiente || 'HOMOLOGACAO';
      const baseUrl = ambiente === 'PRODUCAO'
        ? 'https://sefin.nfse.gov.br'
        : 'https://sefin.producaorestrita.nfse.gov.br';

      try {
        const authUrl = `${baseUrl}/sefinnacional/oauth/token`;
        const params = new URLSearchParams();
        params.append('grant_type', 'password');
        params.append('username', portal_nacional_username);
        params.append('password', portal_nacional_password);

        const response = await axios.post(authUrl, params.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          timeout: 30000
        });

        if (response.data?.access_token) {
          logger.info('Autenticação bem-sucedida');
          sendSuccess(res, undefined, 'Autenticação realizada com sucesso!');
          return res;
        } else {
          sendUnauthorized(res, 'Autenticação falhou: credenciais inválidas');
          return res;
        }
      } catch (authError: unknown) {
        const axiosError = authError as { code?: string; response?: { status?: number; data?: { error_description?: string; error?: string; message?: string } }; message?: string };
        let errorMessage: string;
        let statusCode = 500;

        if (axiosError?.code === 'ENOTFOUND' || axiosError?.code === 'ECONNREFUSED' || axiosError?.code === 'ETIMEDOUT') {
          errorMessage = `Não foi possível conectar ao servidor do Portal Nacional. Verifique se a URL base está correta (${baseUrl}).`;
          statusCode = 503;
        } else if (axiosError?.response?.data) {
          errorMessage = axiosError.response.data.error_description || axiosError.response.data.error || axiosError.response.data.message || 'Credenciais inválidas ou erro na autenticação';
          statusCode = axiosError.response.status || 401;
        } else if (axiosError?.response?.status) {
          statusCode = axiosError.response.status;
          errorMessage = statusCode === 401 || statusCode === 403 ? 'Credenciais inválidas. Verifique usuário e senha.' : `Erro ao conectar com o servidor (HTTP ${statusCode}).`;
        } else {
          errorMessage = axiosError?.message || 'Erro desconhecido ao testar autenticação';
        }

        logger.error('Erro ao testar autenticação no Portal Nacional NFS-e', { error: errorMessage, statusCode });
        sendError(res, authError, errorMessage, statusCode, true, {
          context: 'SaasNFSeConfigController',
          action: 'testAuth',
          provider: 'PORTAL_NACIONAL'
        });
        return res;
      }
    } catch (error: unknown) {
      sendError(res, error, 'Erro interno ao testar autenticação', 500, true, {
        context: 'SaasNFSeConfigController',
        action: 'testAuth'
      });
      return res;
    }
  }
}
