import { Request, Response } from 'express';
import { SaasNFSeConfigService } from '../../../services/saas/SaasNFSeConfigService';
import { SaasBancoService } from '../../../services/saas/SaasConfigService';
import { registrarAtualizacao, registrarCriacao } from '../../../services/sistema/AuditoriaService';
import { logger } from '../../../utils/logger';
import Joi from 'joi';
import axios from 'axios';
import { sendSuccess, sendError, sendValidationError, sendUnauthorized } from '../../../utils/responseUtils';
import { aplicarCertificadoNoPayload, abrirCertificadoArmazenado, lerCertificadoA1, mascararCertificado, semSegredosNfse } from '../../../services/nfse/portalNacional/certificadoA1';
import { testarConexaoSefin } from '../../../services/nfse/portalNacional/sefinClient';
import type { AuthenticatedRequest } from '../../../types/auth';

export class SaasNFSeConfigController {
  private static maskSensitiveFields(config: Record<string, unknown>): Record<string, unknown> {
    const masked = { ...config };
    delete masked.asaas_api_key;
    masked.has_portal_nacional_password = !!masked.portal_nacional_password;
    delete masked.portal_nacional_password;
    mascararCertificado(masked);
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
    asaas_sandbox: Joi.boolean().optional(),
    provider: Joi.string().valid('PORTAL_NACIONAL', 'ASAAS').required(),
    op_simples_nacional: Joi.number().integer().valid(1, 2, 3).optional(),
    regime_especial_tributacao: Joi.number().integer().min(0).max(6).optional(),
    regime_apuracao_sn: Joi.number().integer().valid(1, 2, 3).allow(null).optional(),
    tp_ret_issqn: Joi.number().integer().valid(1, 2, 3).optional(),
    certificado_pfx_base64: Joi.string().max(300000).allow(null, '').optional(),
    certificado_senha: Joi.string().max(200).allow(null, '').optional()
  }).min(1);

  private static async buildResponseData(config: Record<string, unknown> | null): Promise<Record<string, unknown>> {
    const bancoAsaas = await SaasBancoService.findAsaasNFSeIntegracao();
    const masked = SaasNFSeConfigController.maskSensitiveFields(config ?? {});
    const isAsaasHabilitado = !!bancoAsaas;

    return {
      ...masked,
      asaas_banco_habilitado: isAsaasHabilitado,
      asaas_sandbox: bancoAsaas?.sandbox ?? masked.asaas_sandbox ?? false,
      provider: masked.provider === 'ASAAS' && !isAsaasHabilitado
        ? 'PORTAL_NACIONAL'
        : masked.provider ?? (isAsaasHabilitado ? 'ASAAS' : 'PORTAL_NACIONAL')
    };
  }

  static async get(req: Request, res: Response): Promise<Response> {
    try {
      const config = await SaasNFSeConfigService.get();
      if (!config) {
        sendSuccess(res, await SaasNFSeConfigController.buildResponseData(null));
        return res;
      }

      sendSuccess(res, await SaasNFSeConfigController.buildResponseData(config.toJSON() as Record<string, unknown>));
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
      const bancoAsaas = await SaasBancoService.findAsaasNFSeIntegracao();

      if (dadosParaSalvar.provider === 'ASAAS') {
        if (!bancoAsaas) {
          sendValidationError(res, 'Habilite a integração NFS-e em um banco Asaas antes de selecionar este provedor.');
          return res;
        }

        dadosParaSalvar.asaas_api_key = null;
        dadosParaSalvar.asaas_sandbox = bancoAsaas.sandbox;
      }

      const camposSensiveis = ['portal_nacional_password'] as const;
      for (const campo of camposSensiveis) {
        if (dadosParaSalvar[campo] === null || dadosParaSalvar[campo] === '' || dadosParaSalvar[campo] === undefined) {
          delete dadosParaSalvar[campo];
        }
      }

      const configAnterior = await SaasNFSeConfigService.get();
      const erroCertificado = aplicarCertificadoNoPayload(dadosParaSalvar, configAnterior);
      if (erroCertificado) {
        sendValidationError(res, erroCertificado);
        return res;
      }
      const configAtualizado = await SaasNFSeConfigService.update(dadosParaSalvar);
      if (!configAnterior) {
        await registrarCriacao(
          req as AuthenticatedRequest,
          'SaasNFSeConfig',
          configAtualizado.id,
          semSegredosNfse(configAtualizado.toJSON() as Record<string, unknown>)
        );
      } else {
        await registrarAtualizacao(req as AuthenticatedRequest, 'SaasNFSeConfig', configAtualizado.id,
          semSegredosNfse(configAnterior.toJSON() as Record<string, unknown>),
          semSegredosNfse(configAtualizado.toJSON() as Record<string, unknown>));
      }
      sendSuccess(res, await SaasNFSeConfigController.buildResponseData(configAtualizado.toJSON() as Record<string, unknown>), 'Configuração NFS-e atualizada com sucesso');
      return res;
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao atualizar configuração NFS-e SaaS', 500, true, {
        context: 'SaasNFSeConfigController',
        action: 'update',
        body: semSegredosNfse({ ...req.body } as Record<string, unknown>)
      });
      return res;
    }
  }

  static async testAuth(req: Request, res: Response): Promise<Response> {
    try {
      const { provider, portal_nacional_ambiente, certificado_pfx_base64, certificado_senha } = req.body;

      logger.info('Iniciando teste de autenticação NFS-e SaaS', {
        provider,
        hasCredentials: {
          portal_nacional: !!(certificado_pfx_base64 || certificado_senha),
          asaas: provider === 'ASAAS'
        }
      });

      if (provider === 'ASAAS') {
        const bancoAsaas = await SaasBancoService.findAsaasNFSeIntegracao();

        if (!bancoAsaas) {
          sendValidationError(res, 'Habilite a integração NFS-e em um banco Asaas antes de testar este provedor.');
          return res;
        }

        try {
          const baseUrl = bancoAsaas.sandbox
            ? 'https://sandbox.asaas.com/api/v3'
            : 'https://www.asaas.com/api/v3';

          const response = await axios.get(`${baseUrl}/myAccount`, {
            headers: {
              'access_token': bancoAsaas.getDataValue('api_key'),
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

      const ambiente = portal_nacional_ambiente === 'PRODUCAO' ? 'PRODUCAO' : 'HOMOLOGACAO';
      const config = await SaasNFSeConfigService.get();
      let certificado;
      try {
        if (certificado_pfx_base64 && certificado_senha) {
          const limpo = String(certificado_pfx_base64).replace(/\s/g, '').replace(/^data:.*?;base64,/, '');
          certificado = lerCertificadoA1(Buffer.from(limpo, 'base64'), String(certificado_senha));
        } else if (config?.certificado_pfx && config.certificado_senha) {
          certificado = abrirCertificadoArmazenado(config.certificado_pfx, config.certificado_senha);
        } else {
          sendValidationError(res, 'Envie o certificado A1 e a senha para testar a conexão.');
          return res;
        }
      } catch (erroCert) {
        sendValidationError(res, erroCert instanceof Error ? erroCert.message : 'Não foi possível ler o certificado A1.');
        return res;
      }

      const teste = await testarConexaoSefin(ambiente, certificado);
      if (!teste.ok) {
        sendError(res, new Error(teste.mensagem), teste.mensagem, 400, false, {
          context: 'SaasNFSeConfigController',
          action: 'testAuth',
          provider: 'PORTAL_NACIONAL'
        });
        return res;
      }

      sendSuccess(res, undefined, 'Conexão com o Portal Nacional testada. O certificado A1 foi aceito.');
      return res;
    } catch (error: unknown) {
      sendError(res, error, 'Erro interno ao testar autenticação', 500, true, {
        context: 'SaasNFSeConfigController',
        action: 'testAuth'
      });
      return res;
    }
  }
}
