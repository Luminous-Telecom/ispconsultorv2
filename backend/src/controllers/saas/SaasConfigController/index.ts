import { toPlain } from '../../../utils/toPlain';
import { Response } from 'express';
import Joi from 'joi';
import { SaasServidorEmailService, SaasServidorWhatsappService, SaasBancoService } from '../../../services/saas/SaasConfigService';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService';
import { BancoApiService } from '../../../services/bancos/BancoApiService';
import { sendSuccess, sendError, sendNotFound, sendValidationError } from '../../../utils/responseUtils';
import type { SaasAuthenticatedRequest } from '../../../middleware/saasAuthMiddleware';
import { joiErrorsToFieldMap } from '../../../utils/validationUtils';
import { parseListQuery } from '../../../utils/listQuery';

const listParams = (req: SaasAuthenticatedRequest) => parseListQuery(req.query, { defaultLimit: 20 });

// ─── Servidor Email ──────────────────────────────────────────────────────────

const emailSchema = Joi.object({
  nome: Joi.string().max(100).required(),
  host_smtp: Joi.string().max(255).required(),
  porta: Joi.number().integer().optional(),
  usuario: Joi.string().max(180).required(),
  senha_criptografada: Joi.string().max(500).required(),
  ssl: Joi.boolean().optional(),
  status: Joi.string().valid('ativo', 'inativo', 'erro').optional(),
});

const emailUpdateSchema = emailSchema.fork(['nome', 'host_smtp', 'usuario', 'senha_criptografada'], s => s.optional());

export class SaasServidorEmailController {
  static async list(req: SaasAuthenticatedRequest, res: Response) {
    try { sendSuccess(res, await SaasServidorEmailService.list(listParams(req))); }
    catch (err) { sendError(res, err, 'Erro ao listar servidores de email', 500, true); }
  }
  static async getById(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const item = await SaasServidorEmailService.getById(Number(req.params.id));
      if (!item) { sendNotFound(res, 'Servidor não encontrado'); return; }
      sendSuccess(res, item);
    } catch (err) { sendError(res, err, 'Erro ao buscar servidor', 500, true); }
  }
  static async create(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const { error, value } = emailSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) { sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details)); return; }
      const item = await SaasServidorEmailService.create(value);
      await registrarCriacao(req as any, 'SaasServidorEmail', item.id, toPlain(item) as Record<string, unknown>);
      res.status(201).json({ success: true, message: 'Servidor criado com sucesso', data: item });
    } catch (err) { sendError(res, err, 'Erro ao criar servidor', 500, true); }
  }
  static async update(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const { error, value } = emailUpdateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) { sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details)); return; }
      const antigo = await SaasServidorEmailService.getById(Number(req.params.id));
      await SaasServidorEmailService.update(Number(req.params.id), value);
      if (antigo) {
        await registrarAtualizacao(req as any, 'SaasServidorEmail', Number(req.params.id),
          toPlain(antigo) as Record<string, unknown>,
          { ...toPlain(antigo), ...value } as Record<string, unknown>);
      }
      sendSuccess(res, null, 'Servidor atualizado com sucesso');
    } catch (err) { sendError(res, err, 'Erro ao atualizar servidor', 500, true); }
  }
  static async delete(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const antigo = await SaasServidorEmailService.getById(Number(req.params.id));
      await SaasServidorEmailService.delete(Number(req.params.id));
      if (antigo) await registrarExclusao(req as any, 'SaasServidorEmail', Number(req.params.id), toPlain(antigo) as Record<string, unknown>);
      sendSuccess(res, null, 'Servidor removido');
    }
    catch (err) { sendError(res, err, 'Erro ao remover servidor', 500, true); }
  }
}

// ─── Servidor WhatsApp ───────────────────────────────────────────────────────

const whatsappSchema = Joi.object({
  nome: Joi.string().max(100).required(),
  url_api: Joi.string().max(500).required(),
  token: Joi.string().max(500).optional().allow('', null),
  numero: Joi.string().max(30).optional().allow('', null),
  status: Joi.string().valid('ativo', 'inativo', 'erro').optional(),
  limite_mensagens: Joi.number().integer().optional().allow(null),
});

const whatsappUpdateSchema = whatsappSchema.fork(['nome', 'url_api'], s => s.optional());

export class SaasServidorWhatsappController {
  static async list(req: SaasAuthenticatedRequest, res: Response) {
    try { sendSuccess(res, await SaasServidorWhatsappService.list(listParams(req))); }
    catch (err) { sendError(res, err, 'Erro ao listar servidores WhatsApp', 500, true); }
  }
  static async getById(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const item = await SaasServidorWhatsappService.getById(Number(req.params.id));
      if (!item) { sendNotFound(res, 'Servidor não encontrado'); return; }
      sendSuccess(res, item);
    } catch (err) { sendError(res, err, 'Erro ao buscar servidor', 500, true); }
  }
  static async create(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const { error, value } = whatsappSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) { sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details)); return; }
      const item = await SaasServidorWhatsappService.create(value);
      await registrarCriacao(req as any, 'SaasServidorWhatsapp', item.id, toPlain(item) as Record<string, unknown>);
      res.status(201).json({ success: true, message: 'Servidor criado com sucesso', data: item });
    } catch (err) { sendError(res, err, 'Erro ao criar servidor', 500, true); }
  }
  static async update(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const { error, value } = whatsappUpdateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) { sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details)); return; }
      const antigo = await SaasServidorWhatsappService.getById(Number(req.params.id));
      await SaasServidorWhatsappService.update(Number(req.params.id), value);
      if (antigo) {
        await registrarAtualizacao(req as any, 'SaasServidorWhatsapp', Number(req.params.id),
          toPlain(antigo) as Record<string, unknown>,
          { ...toPlain(antigo), ...value } as Record<string, unknown>);
      }
      sendSuccess(res, null, 'Servidor atualizado com sucesso');
    } catch (err) { sendError(res, err, 'Erro ao atualizar servidor', 500, true); }
  }
  static async delete(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const antigo = await SaasServidorWhatsappService.getById(Number(req.params.id));
      await SaasServidorWhatsappService.delete(Number(req.params.id));
      if (antigo) await registrarExclusao(req as any, 'SaasServidorWhatsapp', Number(req.params.id), toPlain(antigo) as Record<string, unknown>);
      sendSuccess(res, null, 'Servidor removido');
    }
    catch (err) { sendError(res, err, 'Erro ao remover servidor', 500, true); }
  }
}

// ─── Bancos ──────────────────────────────────────────────────────────────────

const bancoSchema = Joi.object({
  nome: Joi.string().max(255).optional(),
  banco: Joi.string().max(100).required(),
  codigo: Joi.string().max(10).optional().allow('', null),
  descricao: Joi.string().max(1000).optional().allow('', null),
  tipo_banco: Joi.string().valid('efi', 'asaas', 'bancario', 'outros').optional(),
  agencia: Joi.string().max(20).optional().allow('', null),
  conta: Joi.string().max(30).optional().allow('', null),
  tipo_conta: Joi.string().valid('corrente', 'poupanca', 'pagamento').optional(),
  pix_chave: Joi.string().max(255).optional().allow('', null),
  pix_tipo: Joi.string().valid('cpf', 'cnpj', 'email', 'telefone', 'aleatoria').optional().allow(null),
  ativo: Joi.boolean().optional(),
  api_url: Joi.string().max(500).optional().allow('', null),
  api_key: Joi.string().max(255).optional().allow('', null),
  api_secret: Joi.string().max(255).optional().allow('', null),
  sandbox: Joi.boolean().optional(),
  identificador_conta: Joi.string().max(100).optional().allow('', null),
  client_id_producao: Joi.string().max(255).optional().allow('', null),
  client_secret_producao: Joi.string().max(255).optional().allow('', null),
  url_retorno: Joi.string().max(500).optional().allow('', null),
  webhook_secret: Joi.string().max(255).optional().allow('', null),
  repassar_email_cliente: Joi.boolean().optional(),
  percentual_multa: Joi.number().min(0).optional().allow(null),
  percentual_juros: Joi.number().min(0).optional().allow(null),
  desconto_tipo: Joi.string().max(50).optional().allow('', null),
  desconto_valor: Joi.number().min(0).optional().allow(null),
  contra_apresentacao: Joi.boolean().optional(),
  recalcular_segunda_via: Joi.boolean().optional(),
  maximo_dias_recalcular: Joi.number().integer().min(0).optional().allow(null),
  exibir_mes_referente: Joi.boolean().optional(),
  taxa_cobranca: Joi.number().min(0).optional().allow(null),
  incluir_taxa: Joi.boolean().optional(),
  usar_integracao_banco_nfse: Joi.boolean().optional(),
  observacao_linha_1: Joi.string().max(255).optional().allow('', null),
  observacao_linha_2: Joi.string().max(255).optional().allow('', null),
  observacao_linha_3: Joi.string().max(255).optional().allow('', null),
  observacao_linha_4: Joi.string().max(255).optional().allow('', null),
  instrucao_linha_1: Joi.string().max(255).optional().allow('', null),
  instrucao_linha_2: Joi.string().max(255).optional().allow('', null),
  instrucao_linha_3: Joi.string().max(255).optional().allow('', null),
  instrucao_linha_4: Joi.string().max(255).optional().allow('', null),
  instrucao_linha_5: Joi.string().max(255).optional().allow('', null),
  local_pagamento: Joi.string().max(255).optional().allow('', null),
  logo: Joi.string().max(500).optional().allow('', null),
});

const bancoUpdateSchema = bancoSchema.fork(['banco'], (s) => s.optional());

export class SaasBancoController {
  static async list(req: SaasAuthenticatedRequest, res: Response) {
    try { sendSuccess(res, await SaasBancoService.list(listParams(req))); }
    catch (err) { sendError(res, err, 'Erro ao listar bancos', 500, true); }
  }
  static async getById(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const item = await SaasBancoService.getById(Number(req.params.id));
      if (!item) { sendNotFound(res, 'Banco não encontrado'); return; }
      sendSuccess(res, item);
    } catch (err) { sendError(res, err, 'Erro ao buscar banco', 500, true); }
  }
  static async create(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const { error, value } = bancoSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) { sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details)); return; }
      const item = await SaasBancoService.create(value);
      await registrarCriacao(req as any, 'SaasBanco', item.id, toPlain(item) as Record<string, unknown>);
      res.status(201).json({ success: true, message: 'Banco criado com sucesso', data: item });
    } catch (err) {
      if (err instanceof Error && err.message.includes('API Key do Asaas é obrigatória')) {
        sendValidationError(res, err.message);
        return;
      }
      sendError(res, err, 'Erro ao criar banco', 500, true);
    }
  }
  static async update(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const { error, value } = bancoUpdateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) { sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details)); return; }
      const antigo = await SaasBancoService.getById(Number(req.params.id));
      await SaasBancoService.update(Number(req.params.id), value);
      if (antigo) {
        await registrarAtualizacao(req as any, 'SaasBanco', Number(req.params.id),
          toPlain(antigo) as Record<string, unknown>,
          { ...toPlain(antigo), ...value } as Record<string, unknown>);
      }
      sendSuccess(res, null, 'Banco atualizado com sucesso');
    } catch (err) {
      if (err instanceof Error && err.message.includes('API Key do Asaas é obrigatória')) {
        sendValidationError(res, err.message);
        return;
      }
      sendError(res, err, 'Erro ao atualizar banco', 500, true);
    }
  }
  static async delete(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const antigo = await SaasBancoService.getById(Number(req.params.id));
      await SaasBancoService.delete(Number(req.params.id));
      if (antigo) await registrarExclusao(req as any, 'SaasBanco', Number(req.params.id), toPlain(antigo) as Record<string, unknown>);
      sendSuccess(res, null, 'Banco removido');
    }
    catch (err) { sendError(res, err, 'Erro ao remover banco', 500, true); }
  }
  static async testarConexao(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const item = await SaasBancoService.getById(Number(req.params.id));
      if (!item) { sendNotFound(res, 'Banco não encontrado'); return; }
      const banco = item.get({ plain: true }) as unknown as Parameters<typeof BancoApiService.testarAutenticacao>[0];
      const resultado = await BancoApiService.testarAutenticacao(banco);
      if (resultado.success) {
        sendSuccess(res, undefined, resultado.message || 'Conexão com a API do banco realizada com sucesso!');
      } else {
        sendError(res, new Error(resultado.message || 'Falha na conexão'), resultado.message || 'Falha na conexão', 400, false);
      }
    } catch (err) { sendError(res, err, 'Erro ao testar conexão', 500, true); }
  }
  static async gerarWebhookSecret(req: SaasAuthenticatedRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const item = await SaasBancoService.getById(id);
      if (!item) { sendNotFound(res, 'Banco não encontrado'); return; }
      if (item.tipo_banco !== 'asaas') {
        sendValidationError(res, 'Webhook secret disponível apenas para bancos do tipo Asaas');
        return;
      }
      sendValidationError(res, 'O Webhook Secret do Asaas deve ser gerado no painel da Asaas e informado no cadastro do banco.');
    } catch (err) { sendError(res, err, 'Erro ao gerar webhook secret', 500, true); }
  }
}
