import { toPlain } from '../../../utils/toPlain';
import { Request, Response } from 'express';
import { ClienteService } from '../../../services/clientes/ClienteService';
import { ViaCepService } from '../../../services/externos/ViaCepService';
import { ReceitaWsService } from '../../../services/externos/ReceitaWsService';
import Joi from 'joi';
import { logger } from '../../../utils/logger';
import { setAuditData } from '../../../middleware/auditMiddleware';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService/index';
import { sendSuccess, sendError, sendNotFound, sendValidationError, sendForbidden } from '../../../utils/responseUtils';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';
import { SaasPlanoLimitesService } from '../../../services/saas/SaasPlanoLimitesService';
import { parseListQuery, queryString } from '../../../utils/listQuery';
import { joiErrorsToFieldMap } from '../../../utils/validationUtils';

export class ClienteController {
  // Schema de validação para criação
  private static createSchema = Joi.object({
    cnpj: Joi.string().length(18).required().messages({
      'string.length': 'CNPJ deve ter exatamente 18 caracteres',
      'any.required': 'CNPJ é obrigatório'
    }),
    razao_social: Joi.string().min(2).max(255).required().messages({
      'string.min': 'Razão social deve ter pelo menos 2 caracteres',
      'string.max': 'Razão social deve ter no máximo 255 caracteres',
      'any.required': 'Razão social é obrigatória'
    }),
    nome_fantasia: Joi.string().max(255).allow(null, ''),
    email: Joi.string().email().required().messages({
      'string.email': 'Email deve ser válido',
      'any.required': 'Email é obrigatório'
    }),
    telefone: Joi.string().max(20).allow(null, ''),
    whatsapp: Joi.string().max(20).allow(null, ''),
    cep: Joi.string().pattern(/^\d{5}-?\d{3}$/).required().messages({
      'string.pattern.base': 'CEP inválido',
      'any.required': 'CEP é obrigatório'
    }),
    endereco: Joi.string().min(3).max(255).required().messages({
      'string.min': 'Endereço deve ter pelo menos 3 caracteres',
      'string.max': 'Endereço deve ter no máximo 255 caracteres',
      'any.required': 'Endereço é obrigatório'
    }),
    numero: Joi.string().max(10).required().messages({
      'string.max': 'Número deve ter no máximo 10 caracteres',
      'any.required': 'Número é obrigatório'
    }),
    complemento: Joi.string().max(100).allow(null, ''),
    bairro: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Bairro deve ter pelo menos 2 caracteres',
      'string.max': 'Bairro deve ter no máximo 100 caracteres',
      'any.required': 'Bairro é obrigatório'
    }),
    cidade: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Cidade deve ter pelo menos 2 caracteres',
      'string.max': 'Cidade deve ter no máximo 100 caracteres',
      'any.required': 'Cidade é obrigatória'
    }),
    estado: Joi.string().length(2).required().messages({
      'string.length': 'Estado deve ter exatamente 2 caracteres',
      'any.required': 'Estado é obrigatório'
    }),
    observacoes: Joi.string().allow(null, ''),
    ativo: Joi.boolean().default(true),
    tipo_cobranca: Joi.string().valid('titulo', 'carne').allow(null),
    valor_primeiro_titulo: Joi.string().valid('total', 'proporcional').required(),
    recebe_email: Joi.boolean().default(true),
    recebe_sms: Joi.boolean().default(false),
    recebe_whatsapp: Joi.boolean().default(false),
    central_assinante_senha: Joi.string().min(6).max(255).allow(null, '').messages({
      'string.min': 'Senha deve ter pelo menos 6 caracteres',
      'string.max': 'Senha deve ter no máximo 255 caracteres'
    })
  });

  // Schema de validação para atualização
  private static updateSchema = Joi.object({
    cnpj: Joi.string().length(18).messages({
      'string.length': 'CNPJ deve ter exatamente 18 caracteres'
    }),
    razao_social: Joi.string().min(2).max(255).messages({
      'string.min': 'Razão social deve ter pelo menos 2 caracteres',
      'string.max': 'Razão social deve ter no máximo 255 caracteres'
    }),
    nome_fantasia: Joi.string().max(255).allow(null, ''),
    email: Joi.string().email().messages({
      'string.email': 'Email deve ser válido'
    }),
    telefone: Joi.string().max(20).allow(null, ''),
    whatsapp: Joi.string().max(20).allow(null, ''),
    cep: Joi.string().max(10).allow(null, ''),
    endereco: Joi.string().max(255).allow(null, ''),
    numero: Joi.string().max(10).allow(null, ''),
    complemento: Joi.string().max(100).allow(null, ''),
    bairro: Joi.string().max(100).allow(null, ''),
    cidade: Joi.string().max(100).allow(null, ''),
    estado: Joi.string().length(2).allow(null, ''),
    observacoes: Joi.string().allow(null, ''),
    ativo: Joi.boolean(),
    tipo_cobranca: Joi.string().valid('titulo', 'carne').allow(null),
    valor_primeiro_titulo: Joi.string().valid('total', 'proporcional').allow(null, ''),
    recebe_email: Joi.boolean(),
    recebe_sms: Joi.boolean(),
    recebe_whatsapp: Joi.boolean(),
    central_assinante_senha: Joi.string().min(6).max(255).allow(null, '').messages({
      'string.min': 'Senha deve ter pelo menos 6 caracteres',
      'string.max': 'Senha deve ter no máximo 255 caracteres'
    })
  });

  // Listar todos os clientes
  static async index(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, search, searchField, sortColumn, sortDirection } = parseListQuery(req.query);
      const ativo = queryString(req.query.ativo);
      const cidade = queryString(req.query.cidade);
      const estado = queryString(req.query.estado);
      const created_at_inicio = queryString(req.query.created_at_inicio);
      const created_at_fim = queryString(req.query.created_at_fim);

      const empresaId = getEmpresaIdOrNull(req);

      const result = await ClienteService.list({
        page,
        limit,
        search,
        searchField,
        ativo,
        cidade,
        estado,
        created_at_inicio,
        created_at_fim,
        sortColumn,
        sortDirection,
        empresa_id: empresaId ?? undefined,
      });

      sendSuccess(res, result);
    } catch (error) {
      sendError(res, error, 'Erro ao listar clientes', 500, true, {
        context: 'ClienteController',
        action: 'list',
        query: req.query
      });
    }
  }

  static async show(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const empresaId = getEmpresaIdOrNull(req);

      const cliente = await ClienteService.getById(id);

      if (!cliente) {
        sendNotFound(res, 'Cliente não encontrado');
        return;
      }

      if (empresaId !== null && cliente.empresa_id !== empresaId) {
        sendNotFound(res, 'Cliente não encontrado');
        return;
      }

      sendSuccess(res, toPlain(cliente));
    } catch (error) {
      sendError(res, error, 'Erro ao buscar cliente', 500, true, {
        context: 'ClienteController',
        action: 'show',
        clienteId: req.params.id
      });
    }
  }

  static async store(req: Request, res: Response): Promise<void> {
    try {
      // Normalizar CNPJ (remover HTML entities se houver)
      const bodyNormalizado = { ...req.body };
      // CNPJ não precisa mais de decodificação - sanitize não codifica mais barras

      // Validar dados
      const { error, value } = ClienteController.createSchema.validate(bodyNormalizado);
      
      if (error) {
        sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details));
        return;
      }

      const empresaId = getEmpresaIdOrNull(req);

      const limitError = await SaasPlanoLimitesService.validateLimiteCreate(
        empresaId,
        'cadastros_limite_clientes'
      );
      if (limitError) {
        sendForbidden(res, limitError);
        return;
      }

      // Verificar se CNPJ já existe (dentro da empresa)
      const clienteExistente = await ClienteService.existsByCnpj(value.cnpj, undefined, empresaId ?? undefined);

      if (clienteExistente) {
        sendValidationError(res, 'Já existe um cliente cadastrado com este CNPJ');
        return;
      }

      // Criar cliente com empresa_id
      const cliente = await ClienteService.create({ ...value, empresa_id: empresaId });

      // Buscar cliente criado com relacionamentos
      const clienteCriado = await ClienteService.getById(cliente.id);

      // Registrar auditoria
      if (clienteCriado) {
        try {
          const empresaId = getEmpresaIdOrNull(req) ?? clienteCriado.empresa_id ?? null;
          await registrarCriacao(
            req,
            'Cliente',
            clienteCriado.id,
            toPlain(clienteCriado) as Record<string, unknown>,
            undefined,
            empresaId
          );
        } catch (auditError) {
          // Não interromper o fluxo
        }
      }

      sendSuccess(res, clienteCriado, 'Cliente criado com sucesso', 201);
    } catch (error) {
      sendError(res, error, 'Erro ao criar cliente', 500, true, {
        context: 'ClienteController',
        action: 'create',
        body: req.body
      });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Normalizar CNPJ (remover HTML entities se houver)
      const bodyNormalizado = { ...req.body };
      // CNPJ não precisa mais de decodificação - sanitize não codifica mais barras

      // Validar dados
      logger.debug('Validando dados do cliente', {
        context: 'ClienteController',
        action: 'update',
        clienteId: id,
        body: bodyNormalizado
      });

      const { error, value } = ClienteController.updateSchema.validate(bodyNormalizado);
      
      if (error) {
        logger.warn('Validação falhou ao atualizar cliente', {
          context: 'ClienteController',
          action: 'update',
          clienteId: id,
          validationErrors: error.details.map(d => ({
            message: d.message,
            path: d.path,
            type: d.type
          })),
          body: req.body
        });
        
        const errors: Record<string, string[]> = {};
        error.details.forEach(detail => {
          const path = detail.path.join('.');
          if (!errors[path]) {
            errors[path] = [];
          }
          errors[path].push(detail.message);
        });
        sendValidationError(res, 'Dados inválidos', errors);
        return;
      }

      logger.debug('Validação passou, dados validados', {
        context: 'ClienteController',
        action: 'update',
        clienteId: id,
        validatedKeys: Object.keys(value)
      });

      // Buscar cliente
      logger.debug('Buscando cliente no banco de dados', {
        context: 'ClienteController',
        action: 'update',
        clienteId: id
      });

      const cliente = await ClienteService.getById(id);
      
      if (!cliente) {
        logger.warn('Cliente não encontrado para atualização', {
          context: 'ClienteController',
          action: 'update',
          clienteId: id
        });
        
        sendNotFound(res, 'Cliente não encontrado');
        return;
      }

      logger.debug('Cliente encontrado', {
        context: 'ClienteController',
        action: 'update',
        clienteId: id,
        cnpjAtual: cliente.cnpj,
        cnpjNovo: value.cnpj
      });

      // Verificar se CNPJ já existe em outro cliente
      if (value.cnpj && value.cnpj !== cliente.cnpj) {
        logger.debug('Verificando se CNPJ já existe em outro cliente', {
          context: 'ClienteController',
          action: 'update',
          clienteId: id,
          cnpj: value.cnpj
        });

        const clienteExistente = await ClienteService.existsByCnpj(value.cnpj, cliente.id);

        if (clienteExistente) {
          logger.warn('CNPJ já cadastrado em outro cliente', {
            context: 'ClienteController',
            action: 'update',
            clienteId: id,
            cnpj: value.cnpj
          });
          
          sendValidationError(res, 'Já existe outro cliente cadastrado com este CNPJ');
          return;
        }
      }

      // Capturar dados anteriores para auditoria
      const dadosAnteriores = toPlain(cliente) as Record<string, unknown>;
      
      // Atualizar cliente
      logger.debug('Atualizando cliente no banco de dados', {
        context: 'ClienteController',
        action: 'update',
        clienteId: id,
        camposAtualizados: Object.keys(value)
      });

      const clienteAtualizado = await ClienteService.update(id, value);
      
      // Capturar dados novos para auditoria
      const dadosNovos = toPlain(clienteAtualizado) as Record<string, unknown>;
      
      // Registrar dados para auditoria
      setAuditData(req, dadosAnteriores, dadosNovos);

      // Registrar auditoria
      const empresaId = getEmpresaIdOrNull(req) ?? clienteAtualizado.empresa_id ?? null;
      await registrarAtualizacao(
        req,
        'Cliente',
        clienteAtualizado.id,
        dadosAnteriores,
        dadosNovos,
        undefined,
        empresaId
      );

      logger.debug('Cliente atualizado com sucesso, buscando dados atualizados com relacionamentos', {
        context: 'ClienteController',
        action: 'update',
        clienteId: id
      });

      // Buscar cliente atualizado com relacionamentos
      const clienteComRelacionamentos = await ClienteService.getById(id);

      if (!clienteComRelacionamentos) {
        logger.error('Cliente não encontrado após atualização', {
          context: 'ClienteController',
          action: 'update',
          clienteId: id
        });
        
        sendError(res, new Error('Cliente não encontrado após atualização'), 'Cliente não encontrado após atualização', 500, true, {
          context: 'ClienteController',
          action: 'update',
          clienteId: id
        });
        return;
      }

      sendSuccess(res, toPlain(clienteComRelacionamentos), 'Cliente atualizado com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro interno do servidor', 500, true, {
        context: 'ClienteController',
        action: 'update',
        clienteId: req.params.id,
        body: req.body
      });
    }
  }

  // Excluir cliente
  static async destroy(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const cliente = await ClienteService.getById(id);

      if (!cliente) {
        sendNotFound(res, 'Cliente não encontrado');
        return;
      }

      // Capturar dados anteriores para auditoria
      const dadosAnteriores = toPlain(cliente) as Record<string, unknown>;
      setAuditData(req, dadosAnteriores);
      
      try {
        await ClienteService.delete(id);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        if (errorMessage.includes('título(s) associado(s)')) {
          sendForbidden(res, errorMessage);
          return;
        }
        if (errorMessage.includes('contrato(s)')) {
          sendForbidden(res, errorMessage);
          return;
        }
        throw error;
      }
      
      // Registrar auditoria
      const empresaId = getEmpresaIdOrNull(req) ?? cliente.empresa_id ?? null;
      await registrarExclusao(
        req,
        'Cliente',
        cliente.id,
        dadosAnteriores,
        undefined,
        empresaId
      );

      sendSuccess(res, undefined, 'Cliente excluído com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro interno do servidor', 500, true, {
        context: 'ClienteController',
        action: 'delete',
        clienteId: req.params.id
      });
    }
  }

  static async findByCnpj(req: Request, res: Response): Promise<void> {
    try {
      const { cnpj } = req.params;
      const empresaId = getEmpresaIdOrNull(req);
      const cliente = await ClienteService.findByCnpj(cnpj, empresaId ?? undefined);

      if (!cliente) {
        sendNotFound(res, 'Cliente não encontrado');
        return;
      }

      sendSuccess(res, cliente);
    } catch (error) {
      sendError(res, error, 'Erro ao buscar cliente por CNPJ', 500, true, {
        context: 'ClienteController',
        action: 'findByCnpj',
        cnpj: req.params.cnpj
      });
    }
  }

  static async findAtivos(req: Request, res: Response): Promise<void> {
    try {
      const empresaId = getEmpresaIdOrNull(req);
      const clientes = await ClienteService.findAtivos(empresaId ?? undefined);
      sendSuccess(res, clientes);
    } catch (error) {
      sendError(res, error, 'Erro ao listar clientes ativos', 500, true, {
        context: 'ClienteController',
        action: 'findAtivos'
      });
    }
  }

  static async buscarCep(req: Request, res: Response): Promise<void> {
    try {
      const { cep } = req.params;
      const dadosCep = await ViaCepService.buscarCep(cep);

      if (!dadosCep) {
        sendNotFound(res, 'CEP não encontrado na base dos Correios');
        return;
      }

      sendSuccess(res, dadosCep);
    } catch (error) {
      if (error instanceof Error && error.message === 'CEP deve ter 8 dígitos') {
        sendValidationError(res, error.message);
        return;
      }
      sendError(res, error, 'Erro ao buscar CEP', 500, true, {
        context: 'ClienteController',
        action: 'buscarCep',
        cep: req.params.cep
      });
    }
  }

  static async consultarCnpj(req: Request, res: Response): Promise<void> {
    try {
      const { cnpj } = req.params;
      const dadosEmpresa = await ReceitaWsService.consultarCnpj(cnpj);

      if (!dadosEmpresa) {
        sendNotFound(res, 'CNPJ não encontrado na base da Receita Federal');
        return;
      }

      sendSuccess(res, dadosEmpresa);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'CNPJ deve ter 14 dígitos') {
          sendValidationError(res, error.message);
          return;
        }
        if (error.message.includes('Muitas requisições')) {
          sendError(res, error, error.message, 429, true, {
            context: 'ClienteController',
            action: 'consultarCnpj',
            cnpj: req.params.cnpj
          });
          return;
        }
      }
      sendError(res, error, 'Erro ao consultar CNPJ', 500, true, {
        context: 'ClienteController',
        action: 'consultarCnpj',
        cnpj: req.params.cnpj
      });
    }
  }
}
