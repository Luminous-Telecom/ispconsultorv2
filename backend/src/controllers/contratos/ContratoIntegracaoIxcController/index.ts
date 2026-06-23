import { Request, Response } from 'express';
import * as Joi from 'joi';
import { ContratoService } from '../../../services/contratos/ContratoService';
import { ContratoIntegracaoIxcService } from '../../../services/contratos/ContratoIntegracaoIxcService';
import { sendSuccess, sendError, sendNotFound, sendValidationError } from '../../../utils/responseUtils';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';
import { joiErrorsToFieldMap } from '../../../utils/validationUtils';

export class ContratoIntegracaoIxcController {
  private static linkSchema = Joi.object({
    integracao_ixc_provedor_id: Joi.number().integer().positive().required(),
  });

  private static async assertContratoAccess(req: Request, contratoId: string): Promise<boolean> {
    if (!contratoId || Number.isNaN(parseInt(contratoId, 10))) {
      return false;
    }

    const empresaId = getEmpresaIdOrNull(req);
    const contrato = await ContratoService.getById(contratoId);
    if (!contrato) {
      return false;
    }
    if (empresaId !== null && contrato.empresa_id !== empresaId) {
      return false;
    }
    return true;
  }

  static async getByContrato(req: Request, res: Response): Promise<void> {
    try {
      const { contrato_id } = req.params;
      const contratoId = parseInt(contrato_id, 10);

      if (!(await ContratoIntegracaoIxcController.assertContratoAccess(req, contrato_id))) {
        sendNotFound(res, 'Contrato não encontrado');
        return;
      }

      const config = await ContratoIntegracaoIxcService.listByContrato(contratoId);
      sendSuccess(res, config);
    } catch (error) {
      sendError(res, error, 'Erro ao buscar integrações IXC do contrato', 500, true, {
        context: 'ContratoIntegracaoIxcController',
        action: 'getByContrato',
        contratoId: req.params.contrato_id,
      });
    }
  }

  static async link(req: Request, res: Response): Promise<void> {
    try {
      const { contrato_id } = req.params;
      const contratoId = parseInt(contrato_id, 10);

      if (!(await ContratoIntegracaoIxcController.assertContratoAccess(req, contrato_id))) {
        sendNotFound(res, 'Contrato não encontrado');
        return;
      }

      const value = await ContratoIntegracaoIxcController.linkSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

      const empresaId = getEmpresaIdOrNull(req);
      const config = await ContratoIntegracaoIxcService.link(
        contratoId,
        value.integracao_ixc_provedor_id,
        empresaId
      );

      sendSuccess(res, config, 'Integração IXC vinculada ao contrato');
    } catch (error) {
      if (error instanceof Joi.ValidationError) {
        sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details));
        return;
      }
      sendError(res, error, 'Erro ao vincular integração IXC ao contrato', 500, true, {
        context: 'ContratoIntegracaoIxcController',
        action: 'link',
        contratoId: req.params.contrato_id,
      });
    }
  }

  static async unlink(req: Request, res: Response): Promise<void> {
    try {
      const { contrato_id, integracao_ixc_provedor_id } = req.params;
      const contratoId = parseInt(contrato_id, 10);
      const integracaoId = parseInt(integracao_ixc_provedor_id, 10);

      if (
        Number.isNaN(contratoId) ||
        Number.isNaN(integracaoId) ||
        !(await ContratoIntegracaoIxcController.assertContratoAccess(req, contrato_id))
      ) {
        sendNotFound(res, 'Contrato não encontrado');
        return;
      }

      const empresaId = getEmpresaIdOrNull(req);
      const config = await ContratoIntegracaoIxcService.unlink(contratoId, integracaoId, empresaId);

      sendSuccess(res, config, 'Integração IXC desvinculada do contrato');
    } catch (error) {
      sendError(res, error, 'Erro ao desvincular integração IXC do contrato', 500, true, {
        context: 'ContratoIntegracaoIxcController',
        action: 'unlink',
        contratoId: req.params.contrato_id,
        integracaoId: req.params.integracao_ixc_provedor_id,
      });
    }
  }
}
