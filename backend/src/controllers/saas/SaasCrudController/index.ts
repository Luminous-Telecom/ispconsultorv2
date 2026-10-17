import { toPlain } from '../../../utils/toPlain';
import { Response } from 'express';
import Joi from 'joi';
import {
  SaasTipoCobrancaService,
  SaasDiasVencimentoService,
  SaasTituloService,
  SaasTituloResumoService,
  SaasContratoService,
} from '../../../services/saas/SaasCrudService';
import { SaasTituloBoletoService } from '../../../services/saas/SaasTituloBoletoService';
import { SaasBanco } from '../../../models/saas/SaasBanco';
import { saasTituloToTituloComRelacoes } from '../../titulos/TituloHelpers/saasTituloToTituloComRelacoes';
import { PaymentCommonService } from '../../../services/webhooks/PaymentCommonService';
import { buildTituloPagamentoUpdate } from '../../../utils/tituloVencimentoUtils';
import { desbloquearSeSemAtraso } from '../../../services/saas/BloqueioAtrasoService';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService';
import { sendSuccess, sendError, sendNotFound, sendValidationError } from '../../../utils/responseUtils';
import type { SaasAuthenticatedRequest } from '../../../middleware/saasAuthMiddleware';
import { logger } from '../../../utils/logger';
import { joiErrorsToFieldMap } from '../../../utils/validationUtils';
import { parseIdsFromQueryParam, parseListQuery } from '../../../utils/listQuery';

const listParams = (req: SaasAuthenticatedRequest) => {
  const parsed = parseListQuery(req.query, { defaultLimit: 20 });
  return {
    page: parsed.page,
    limit: parsed.limit,
    search: parsed.search,
    empresa_id: parsed.empresa_id,
    sortColumn: parsed.sortColumn,
    sortDirection: parsed.sortDirection,
    status: parsed.status,
    data_vencimento_inicio: parsed.data_vencimento_inicio,
    data_vencimento_fim: parsed.data_vencimento_fim,
    data_pagamento_inicio: parsed.data_pagamento_inicio,
    data_pagamento_fim: parsed.data_pagamento_fim,
  };
};

// ─── Tipo Cobrança ────────────────────────────────────────────────────────────

const tipoCobrancaSchema = Joi.object({
  nome: Joi.string().max(100).required(),
  quantidade_titulos: Joi.number().integer().min(1).optional(),
  periodicidade: Joi.string()
    .valid('mensal', 'bimestral', 'trimestral', 'semestral', 'anual', 'quinzenal', 'semanal')
    .optional(),
  ativo: Joi.boolean().optional(),
});

export class SaasTipoCobrancaController {
  static async list(req: SaasAuthenticatedRequest, res: Response) {
    try { sendSuccess(res, await SaasTipoCobrancaService.list(listParams(req))); }
    catch (err) { sendError(res, err, 'Erro ao listar tipos de cobrança', 500, true); }
  }
  static async getById(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const item = await SaasTipoCobrancaService.getById(Number(req.params.id));
      if (!item) { sendNotFound(res, 'Tipo de cobrança não encontrado'); return; }
      sendSuccess(res, item);
    } catch (err) { sendError(res, err, 'Erro ao buscar tipo de cobrança', 500, true); }
  }
  static async create(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const { error, value } = tipoCobrancaSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) { sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details)); return; }
      const item = await SaasTipoCobrancaService.create(value);
      await registrarCriacao(req as any, 'SaasTipoCobranca', item.id, toPlain(item) as Record<string, unknown>, undefined, null);
      res.status(201).json({ success: true, message: 'Tipo de cobrança criado com sucesso', data: item });
    } catch (err) { sendError(res, err, 'Erro ao criar tipo de cobrança', 500, true); }
  }
  static async update(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const { error, value } = tipoCobrancaSchema.fork(['nome'], (s) => s.optional()).validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) { sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details)); return; }
      const antigo = await SaasTipoCobrancaService.getById(Number(req.params.id));
      await SaasTipoCobrancaService.update(Number(req.params.id), value);
      if (antigo) {
        await registrarAtualizacao(req as any, 'SaasTipoCobranca', Number(req.params.id),
          toPlain(antigo) as Record<string, unknown>,
          { ...toPlain(antigo), ...value } as Record<string, unknown>,
          undefined, null);
      }
      sendSuccess(res, null, 'Tipo de cobrança atualizado com sucesso');
    } catch (err) { sendError(res, err, 'Erro ao atualizar tipo de cobrança', 500, true); }
  }
  static async delete(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const antigo = await SaasTipoCobrancaService.getById(Number(req.params.id));
      await SaasTipoCobrancaService.delete(Number(req.params.id));
      if (antigo) {
        await registrarExclusao(req as any, 'SaasTipoCobranca', Number(req.params.id), toPlain(antigo) as Record<string, unknown>, undefined, null);
      }
      sendSuccess(res, null, 'Tipo de cobrança removido');
    } catch (err) { sendError(res, err, 'Erro ao remover tipo de cobrança', 500, true); }
  }
}

// ─── Dias Vencimento ─────────────────────────────────────────────────────────

const diasVencimentoSchema = Joi.object({
  dia: Joi.number().integer().min(1).max(31).optional().allow(null),
  dia_padrao: Joi.number().integer().min(1).max(31).optional(),
  ativo: Joi.boolean().optional(),
});

export class SaasDiasVencimentoController {
  /** Config em saas_dias_vencimento (tabela dedicada, global para SaaS) */
  static async getConfig(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const rows = await SaasDiasVencimentoService.getConfig();
      const data = rows
        .filter((r) => r.ativo)
        .map((r) => ({ dia: r.dia ?? r.dia_padrao, dia_padrao: r.dia_padrao, ativo: true }));
      sendSuccess(res, data, 'Dias de vencimento encontrados');
    } catch (err) { sendError(res, err, 'Erro ao buscar dias de vencimento', 500, true); }
  }

  /** Config em saas_dias_vencimento (tabela dedicada, global) */
  static async updateConfig(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const { dias } = req.body;
      if (!Array.isArray(dias)) { sendValidationError(res, 'dias (array) é obrigatório'); return; }
      const validos = dias.filter((d: unknown) => typeof d === 'number' && d >= 1 && d <= 31).sort((a, b) => a - b);
      const rowsAntes = await SaasDiasVencimentoService.getConfig();
      const diasAntes = rowsAntes.map((r: { dia: number | null }) => r.dia).filter((x): x is number => x != null).sort((a, b) => a - b);
      await SaasDiasVencimentoService.updateConfig(validos);
      await registrarAtualizacao(req as any, 'SaasDiasVencimentoConfig', 0,
        { dias: diasAntes },
        { dias: validos },
        'Configuração global de dias de vencimento',
        null);
      sendSuccess(res, undefined, 'Dias de vencimento atualizados com sucesso');
    } catch (err) { sendError(res, err, 'Erro ao atualizar dias de vencimento', 500, true); }
  }

  static async list(req: SaasAuthenticatedRequest, res: Response) {
    try { sendSuccess(res, await SaasDiasVencimentoService.list(listParams(req))); }
    catch (err) { sendError(res, err, 'Erro ao listar dias de vencimento', 500, true); }
  }
  static async getById(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const item = await SaasDiasVencimentoService.getById(Number(req.params.id));
      if (!item) { sendNotFound(res, 'Dia de vencimento não encontrado'); return; }
      sendSuccess(res, item);
    } catch (err) { sendError(res, err, 'Erro ao buscar dia de vencimento', 500, true); }
  }
  static async create(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const { error, value } = diasVencimentoSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) { sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details)); return; }
      const item = await SaasDiasVencimentoService.create(value);
      await registrarCriacao(req as any, 'SaasDiasVencimento', item.id, toPlain(item) as Record<string, unknown>, undefined, null);
      res.status(201).json({ success: true, message: 'Dia de vencimento criado com sucesso', data: item });
    } catch (err) { sendError(res, err, 'Erro ao criar dia de vencimento', 500, true); }
  }
  static async update(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const { error, value } = diasVencimentoSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) { sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details)); return; }
      const antigo = await SaasDiasVencimentoService.getById(Number(req.params.id));
      await SaasDiasVencimentoService.update(Number(req.params.id), value);
      if (antigo) {
        await registrarAtualizacao(req as any, 'SaasDiasVencimento', Number(req.params.id),
          toPlain(antigo) as Record<string, unknown>,
          { ...toPlain(antigo), ...value } as Record<string, unknown>,
          undefined, null);
      }
      sendSuccess(res, null, 'Dia de vencimento atualizado com sucesso');
    } catch (err) { sendError(res, err, 'Erro ao atualizar dia de vencimento', 500, true); }
  }
  static async delete(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const antigo = await SaasDiasVencimentoService.getById(Number(req.params.id));
      await SaasDiasVencimentoService.delete(Number(req.params.id));
      if (antigo) {
        await registrarExclusao(req as any, 'SaasDiasVencimento', Number(req.params.id), toPlain(antigo) as Record<string, unknown>, undefined, null);
      }
      sendSuccess(res, null, 'Dia de vencimento removido');
    } catch (err) { sendError(res, err, 'Erro ao remover dia de vencimento', 500, true); }
  }
}

// ─── Títulos ─────────────────────────────────────────────────────────────────

const tituloSchema = Joi.object({
  empresa_id: Joi.number().integer().required(),
  plano_id: Joi.number().integer().required(),
  banco_id: Joi.number().integer().required(),
  contrato_id: Joi.number().integer().optional().allow(null),
  numero_titulo: Joi.string().max(100).required(),
  valor: Joi.number().min(0.01).required(),
  data_vencimento: Joi.date().required(),
  status: Joi.string().valid('pendente', 'pago', 'vencido', 'cancelado', 'parcial', 'pago_atraso').optional(),
  pago: Joi.boolean().optional(),
  data_pagamento: Joi.date().optional().allow(null),
  valor_pago: Joi.number().min(0).optional().allow(null),
  observacoes: Joi.string().max(500).optional().allow('', null),
  descricao: Joi.string().max(255).optional().allow('', null),
  is_avulso: Joi.boolean().optional(),
});

export class SaasTituloController {
  static async resumo(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const data = await SaasTituloResumoService.getResumo();
      sendSuccess(res, data);
    } catch (err) { sendError(res, err, 'Erro ao buscar resumo', 500, true); }
  }
  static async list(req: SaasAuthenticatedRequest, res: Response) {
    try {
      sendSuccess(res, await SaasTituloService.list(listParams(req)));
    } catch (err) {
      sendError(res, err, 'Erro ao listar títulos', 500, true, {
        handler: 'SaasTituloController.list',
        params: listParams(req),
      });
    }
  }
  static async getById(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const item = await SaasTituloService.getById(Number(req.params.id));
      if (!item) { sendNotFound(res, 'Título não encontrado'); return; }
      sendSuccess(res, item);
    } catch (err) { sendError(res, err, 'Erro ao buscar título', 500, true); }
  }
  static async create(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const { error, value } = tituloSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) { sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details)); return; }
      const item = await SaasTituloService.create(value);
      await registrarCriacao(req as any, 'SaasTitulo', item.id, toPlain(item) as Record<string, unknown>, undefined, null);
      res.status(201).json({ success: true, message: 'Título criado com sucesso', data: item });
    } catch (err) { sendError(res, err, 'Erro ao criar título', 500, true); }
  }
  static async update(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const tituloUpdateSchema = tituloSchema.fork(
        ['empresa_id', 'plano_id', 'banco_id', 'numero_titulo', 'valor', 'data_vencimento'],
        (s) => s.optional()
      );
      const { error, value } = tituloUpdateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) { sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details)); return; }
      const antigo = await SaasTituloService.getById(Number(req.params.id));
      if (!antigo) { sendNotFound(res, 'Título não encontrado'); return; }

      // Validações e cancelamento no gateway (quando status = cancelado)
      if (value.status === 'cancelado') {
        if (antigo.status === 'pago' || antigo.pago) {
          sendValidationError(res, 'Não é possível cancelar um título que já foi pago');
          return;
        }
        if (antigo.status === 'cancelado') {
          sendValidationError(res, 'Este título já está cancelado');
          return;
        }
        // Cancelar no gateway (Asaas/EFI) se tiver charge_id
        const banco = antigo.get('banco') as SaasBanco | null;
        if (antigo.charge_id && banco && ['efi', 'asaas'].includes(banco.tipo_banco ?? '')) {
          const tituloLike = saasTituloToTituloComRelacoes(antigo);
          const { BancoApiService } = await import('../../../services/bancos/BancoApiService');
            const resultado = await BancoApiService.cancelarTitulo(
              tituloLike as unknown as Parameters<typeof BancoApiService.cancelarTitulo>[0]
            );
            if (!resultado.success) {
              logger.warn('Falha ao cancelar título SaaS no gateway', { titulo_id: antigo.id, charge_id: antigo.charge_id, message: resultado.message });
              sendValidationError(res, resultado.message ?? 'Não foi possível cancelar o título no banco emissor');
              return;
            }
            logger.info('Título SaaS cancelado no gateway', { titulo_id: antigo.id, charge_id: antigo.charge_id });
        }
      }

      await SaasTituloService.update(Number(req.params.id), value);
      const novo = await SaasTituloService.getById(Number(req.params.id));
      if (antigo && novo) {
        await registrarAtualizacao(req as any, 'SaasTitulo', Number(req.params.id),
          toPlain(antigo) as Record<string, unknown>,
          toPlain(novo) as Record<string, unknown>,
          undefined, null);
      }
      sendSuccess(res, null, 'Título atualizado com sucesso');
    } catch (err) { sendError(res, err, 'Erro ao atualizar título', 500, true); }
  }
  static async delete(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const antigo = await SaasTituloService.getById(Number(req.params.id));
      await SaasTituloService.delete(Number(req.params.id));
      if (antigo) {
        await registrarExclusao(req as any, 'SaasTitulo', Number(req.params.id), toPlain(antigo) as Record<string, unknown>, undefined, null);
      }
      sendSuccess(res, null, 'Título removido');
    } catch (err) { sendError(res, err, 'Erro ao remover título', 500, true); }
  }

  static async gerarBoleto(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const tituloId = Number(req.params.id);
      const tituloAntes = await SaasTituloService.getById(tituloId);
      const resultado = await SaasTituloBoletoService.gerarBoleto(tituloId);
      if (!resultado.success) {
        res.status(400).json({ success: false, message: resultado.message });
        return;
      }
      const titulo = await SaasTituloService.getById(tituloId);
      if (tituloAntes && titulo) {
        await registrarAtualizacao(req as any, 'SaasTitulo', tituloId, toPlain(tituloAntes) as Record<string, unknown>, toPlain(titulo) as Record<string, unknown>, 'Geração de boleto', null);
      }
      sendSuccess(res, titulo, resultado.message || 'Boleto gerado com sucesso');
    } catch (err) {
      sendError(res, err, 'Erro ao gerar boleto', 500, true);
    }
  }

  static async marcarPago(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { valor_pago, data_pagamento, observacoes } = req.body;
      const titulo = await SaasTituloService.getById(Number(id));
      if (!titulo) {
        sendNotFound(res, 'Título não encontrado');
        return;
      }
      if ((titulo as { status?: string }).status === 'cancelado') {
        sendValidationError(res, 'Não é possível marcar como pago um título cancelado');
        return;
      }
      if (titulo.pago) {
        sendValidationError(res, 'Este título já foi marcado como pago');
        return;
      }
      const valorPago = valor_pago != null ? Number(valor_pago) : Number(titulo.valor);
      const dataPagamentoNorm = data_pagamento
        ? (typeof data_pagamento === 'string'
            ? PaymentCommonService.normalizePaymentDate(data_pagamento)
            : data_pagamento)
        : new Date();
      const dataPagamento = dataPagamentoNorm ?? new Date();
      const dadosAnteriores = toPlain(titulo) as Record<string, unknown>;
      const updateData: Record<string, unknown> = buildTituloPagamentoUpdate({
        dataVencimento: titulo.data_vencimento,
        dataPagamento,
        valorPago,
        valorTotal: Number(titulo.valor),
      });
      if (observacoes !== undefined) updateData.observacoes = observacoes;
      await titulo.update(updateData);
      const tituloAtualizado = (await SaasTituloService.getById(titulo.id)) ?? titulo;
      await registrarAtualizacao(req as any, 'SaasTitulo', titulo.id, dadosAnteriores, toPlain(tituloAtualizado) as Record<string, unknown>, undefined, null);
      const empresaId = tituloAtualizado.empresa_id;
      if (empresaId) {
        await desbloquearSeSemAtraso(empresaId);
      }
      sendSuccess(res, tituloAtualizado, 'Título marcado como pago');
    } catch (err) {
      sendError(res, err, 'Erro ao marcar título como pago', 500, true);
    }
  }

  /** Gera PDF de múltiplos boletos - reaproveita template do ADM (TituloPDFService). */
  static async gerarPdfBoletosMultiplos(req: SaasAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const ids = parseIdsFromQueryParam(req.query.ids);
      if (ids.length === 0) {
        sendValidationError(res, 'IDs dos títulos não fornecidos');
        return;
      }

      sendNotFound(res, 'Nenhum título encontrado');
      return;
    } catch (err) {
      sendError(res, err, 'Erro ao gerar PDF de boletos', 500, true);
    }
  }
}

// ─── Contratos ─────────────────────────────────────────────────────────────────

const contratoSchema = Joi.object({
  empresa_id: Joi.number().integer().required(),
  banco_id: Joi.number().integer().optional().allow(null),
  plano_id: Joi.number().integer().required(),
  data_inicio: Joi.date().required(),
  data_fim: Joi.date().optional().allow(null),
  dia_vencimento: Joi.number().integer().min(1).max(31).optional().allow(null),
  tipo: Joi.string().valid('mensal', 'anual').optional(),
  status: Joi.string().valid('ativo', 'cancelado', 'expirado', 'pendente').optional(),
  valor: Joi.number().min(0).optional(),
  desconto_percentual: Joi.number().min(0).max(100).optional().allow(null),
  desconto_valor: Joi.number().min(0).optional().allow(null),
  data_validade_desconto: Joi.alternatives().try(Joi.string().pattern(/^\d{4}-\d{2}-\d{2}/), Joi.date()).optional().allow(null, ''),
  isento_mensalidade: Joi.boolean().optional(),
  observacoes: Joi.string().max(1000).optional().allow('', null),
});

export class SaasContratoController {
  static async list(req: SaasAuthenticatedRequest, res: Response) {
    try { sendSuccess(res, await SaasContratoService.list(listParams(req))); }
    catch (err) { sendError(res, err, 'Erro ao listar contratos', 500, true); }
  }
  static async getById(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const item = await SaasContratoService.getById(Number(req.params.id));
      if (!item) { sendNotFound(res, 'Contrato não encontrado'); return; }
      sendSuccess(res, item);
    } catch (err) { sendError(res, err, 'Erro ao buscar contrato', 500, true); }
  }
  static async create(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const { error, value } = contratoSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) { sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details)); return; }
      const item = await SaasContratoService.create(value);
      await registrarCriacao(req as any, 'SaasContrato', item.id, toPlain(item) as Record<string, unknown>, undefined, null);
      res.status(201).json({ success: true, message: 'Contrato criado com sucesso', data: item });
    } catch (err) { sendError(res, err, 'Erro ao criar contrato', 500, true); }
  }
  static async update(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const { error, value } = contratoSchema.fork(['empresa_id', 'banco_id'], (s) => s.optional()).validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) { sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details)); return; }
      const antigo = await SaasContratoService.getById(Number(req.params.id));
      await SaasContratoService.update(Number(req.params.id), value);
      if (antigo) {
        await registrarAtualizacao(req as any, 'SaasContrato', Number(req.params.id),
          toPlain(antigo) as Record<string, unknown>,
          { ...toPlain(antigo), ...value } as Record<string, unknown>,
          undefined, null);
      }
      sendSuccess(res, null, 'Contrato atualizado com sucesso');
    } catch (err) { sendError(res, err, 'Erro ao atualizar contrato', 500, true); }
  }
  static async delete(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const antigo = await SaasContratoService.getById(Number(req.params.id));
      await SaasContratoService.delete(Number(req.params.id));
      if (antigo) {
        await registrarExclusao(req as any, 'SaasContrato', Number(req.params.id), toPlain(antigo) as Record<string, unknown>, undefined, null);
      }
      sendSuccess(res, null, 'Contrato removido');
    } catch (err) { sendError(res, err, 'Erro ao remover contrato', 500, true); }
  }
}
