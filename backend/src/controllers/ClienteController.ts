import { Request, Response } from 'express';
import { Cliente } from '../models/Cliente';
import { Titulo } from '../models/Titulo';
import { Op, WhereOptions } from 'sequelize';
import Joi from 'joi';
import axios from 'axios';
import { logger } from '../utils/logger';
import { setAuditData } from '../middleware/auditMiddleware';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../services/AuditoriaService';

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
    recebe_whatsapp: Joi.boolean().default(false)
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
    recebe_whatsapp: Joi.boolean()
  });

  // Listar todos os clientes
  static async index(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 15;
      const search = req.query.search as string;
      const ativo = req.query.ativo as string;
      const cidade = req.query.cidade as string;
      const estado = req.query.estado as string;

      const offset = (page - 1) * limit;

      // Construir filtros
      const where: WhereOptions = {};
      
      if (search) {
        (where as Record<symbol, unknown>)[Op.or] = [
          { razao_social: { [Op.like]: `%${search}%` } },
          { nome_fantasia: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { cnpj: { [Op.like]: `%${search}%` } }
        ];
      }

      if (ativo !== undefined) {
        where.ativo = ativo === 'true';
      }

      if (cidade) {
        where.cidade = { [Op.like]: `%${cidade}%` };
      }

      if (estado) {
        where.estado = estado.toUpperCase();
      }

      // Contar total de clientes sem includes para evitar duplicatas
      const count = await Cliente.count({ where });
      
      // Buscar clientes com includes
      const clientes = await Cliente.findAll({
        where,
        include: [
          { association: 'planos', attributes: ['id', 'nome_plano', 'valor_mensal', 'status'] },
          { association: 'titulos', attributes: ['id', 'numero_titulo', 'status', 'valor'] },
          { association: 'contratos' }
        ],
        order: [['id', 'DESC']], // Maior ID para o menor
        limit,
        offset
      });

      const totalPages = Math.ceil(count / limit);

      res.json({
        success: true,
        data: clientes,
        pagination: {
          current_page: page,
          per_page: limit,
          total: count,
          last_page: totalPages,
          from: offset + 1,
          to: Math.min(offset + limit, count)
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao listar clientes', {
        context: 'ClienteController',
        action: 'list',
        error: errorMessage,
        stack: errorStack,
        query: req.query
      });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage
      });
    }
  }

  // Mostrar um cliente específico
  static async show(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const cliente = await Cliente.findByPk(id, {
        include: [
          { 
            association: 'planos',
            include: [{ association: 'clientes', attributes: ['id', 'razao_social'] }]
          },
          { 
            association: 'titulos',
            include: [
              { association: 'plano', attributes: ['id', 'nome_plano'] },
              { 
                association: 'banco', 
                attributes: ['id', 'nome', 'tipo_banco', 'client_id_producao', 'client_secret_producao'] 
              }
            ]
          },
          { association: 'contratos' }
        ]
      });

      if (!cliente) {
        res.status(404).json({
          success: false,
          error: 'Cliente não encontrado'
        });
        return;
      }

      // Serializar cliente e títulos relacionados usando toJSON()
      // Os títulos relacionados precisam ser serializados explicitamente
      // pois o Sequelize não chama toJSON() customizado em relacionamentos
      // Primeiro, obter as instâncias dos títulos ANTES de serializar o cliente
      interface ClienteWithTitulos extends Cliente {
        titulos?: Titulo[];
      }
      
      const clienteWithTitulos = cliente as ClienteWithTitulos;
      const titulosInstances = clienteWithTitulos.titulos;
      
      // Serializar o cliente
      const clienteData = cliente.toJSON() as Record<string, unknown>;
      
      // Serializar títulos relacionados explicitamente usando toJSON()
      // Se temos instâncias de modelo, usar toJSON() customizado
      if (titulosInstances && Array.isArray(titulosInstances)) {
        clienteData.titulos = titulosInstances.map((titulo: Titulo) => {
          if (titulo && typeof titulo.toJSON === 'function') {
            return titulo.toJSON();
          }
          return titulo;
        });
      }

      res.json({
        success: true,
        data: clienteData
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao buscar cliente', {
        context: 'ClienteController',
        action: 'show',
        error: errorMessage,
        stack: errorStack,
        clienteId: req.params.id
      });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Criar novo cliente
  static async store(req: Request, res: Response): Promise<void> {
    try {
      // Normalizar CNPJ (remover HTML entities se houver)
      const bodyNormalizado = { ...req.body };
      // CNPJ não precisa mais de decodificação - sanitize não codifica mais barras

      // Validar dados
      const { error, value } = ClienteController.createSchema.validate(bodyNormalizado);
      
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          details: error.details.map(d => d.message)
        });
        return;
      }

      // Verificar se CNPJ já existe
      const clienteExistente = await Cliente.findOne({
        where: { cnpj: value.cnpj }
      });

      if (clienteExistente) {
        res.status(409).json({
          success: false,
          error: 'CNPJ já cadastrado',
          message: 'Já existe um cliente cadastrado com este CNPJ'
        });
        return;
      }

      // Criar cliente
      const cliente = await Cliente.create(value);

      // Buscar cliente criado com relacionamentos
      const clienteCriado = await Cliente.findByPk(cliente.id, {
        include: [
          { association: 'planos' },
          { association: 'titulos' },
        ]
      });

      // Registrar auditoria
      if (clienteCriado) {
        await registrarCriacao(
          req,
          'Cliente',
          clienteCriado.id,
          clienteCriado.toJSON() as Record<string, unknown>
        );
      }

      res.status(201).json({
        success: true,
        data: clienteCriado,
        message: 'Cliente criado com sucesso'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao criar cliente', {
        context: 'ClienteController',
        action: 'create',
        error: errorMessage,
        stack: errorStack,
        body: req.body
      });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage
      });
    }
  }

  // Atualizar cliente
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      logger.info('Iniciando atualização de cliente', {
        context: 'ClienteController',
        action: 'update',
        clienteId: id,
        bodyKeys: Object.keys(req.body || {}),
        bodySize: JSON.stringify(req.body || {}).length
      });

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
        
        res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          details: error.details.map(d => d.message)
        });
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

      const cliente = await Cliente.findByPk(id);
      
      if (!cliente) {
        logger.warn('Cliente não encontrado para atualização', {
          context: 'ClienteController',
          action: 'update',
          clienteId: id
        });
        
        res.status(404).json({
          success: false,
          error: 'Cliente não encontrado'
        });
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

        const clienteExistente = await Cliente.findOne({
          where: { 
            cnpj: value.cnpj,
            id: { [Op.ne]: id }
          }
        });

        if (clienteExistente) {
          logger.warn('CNPJ já cadastrado em outro cliente', {
            context: 'ClienteController',
            action: 'update',
            clienteId: id,
            cnpj: value.cnpj,
            clienteExistenteId: clienteExistente.id
          });
          
          res.status(409).json({
            success: false,
            error: 'CNPJ já cadastrado',
            message: 'Já existe outro cliente cadastrado com este CNPJ'
          });
          return;
        }
      }

      // Capturar dados anteriores para auditoria
      const dadosAnteriores = cliente.toJSON() as Record<string, unknown>;
      
      // Atualizar cliente
      logger.debug('Atualizando cliente no banco de dados', {
        context: 'ClienteController',
        action: 'update',
        clienteId: id,
        camposAtualizados: Object.keys(value)
      });

      await cliente.update(value);
      
      // Recarregar cliente para obter dados atualizados
      await cliente.reload();
      
      // Capturar dados novos para auditoria
      const dadosNovos = cliente.toJSON() as Record<string, unknown>;
      
      // Registrar dados para auditoria
      setAuditData(req, dadosAnteriores, dadosNovos);
      
      // Registrar auditoria
      await registrarAtualizacao(
        req,
        'Cliente',
        cliente.id,
        dadosAnteriores,
        dadosNovos
      );

      logger.debug('Cliente atualizado com sucesso, buscando dados atualizados com relacionamentos', {
        context: 'ClienteController',
        action: 'update',
        clienteId: id
      });

      // Buscar cliente atualizado com relacionamentos
      const clienteAtualizado = await Cliente.findByPk(id, {
        include: [
          { association: 'planos' },
          { association: 'titulos' },
        ]
      });

      if (!clienteAtualizado) {
        logger.error('Cliente não encontrado após atualização', {
          context: 'ClienteController',
          action: 'update',
          clienteId: id
        });
        
        res.status(500).json({
          success: false,
          error: 'Erro interno do servidor',
          message: 'Cliente não encontrado após atualização'
        });
        return;
      }

      // Serializar títulos relacionados usando toJSON()
      // Primeiro, obter as instâncias dos títulos ANTES de serializar o cliente
      interface ClienteWithTitulos extends Cliente {
        titulos?: Titulo[];
      }
      
      const clienteWithTitulos = clienteAtualizado as ClienteWithTitulos;
      const titulosInstances = clienteWithTitulos.titulos;
      
      // Serializar o cliente
      const clienteData = clienteAtualizado.toJSON() as Record<string, unknown>;
      
      // Serializar títulos relacionados explicitamente usando toJSON()
      // Se temos instâncias de modelo, usar toJSON() customizado
      if (titulosInstances && Array.isArray(titulosInstances) && clienteData) {
        clienteData.titulos = titulosInstances.map((titulo: Titulo) => {
          if (titulo && typeof titulo.toJSON === 'function') {
            return titulo.toJSON();
          }
          return titulo;
        });
      }

      logger.info('Cliente atualizado com sucesso', {
        context: 'ClienteController',
        action: 'update',
        clienteId: id
      });

      res.json({
        success: true,
        data: clienteData || clienteAtualizado,
        message: 'Cliente atualizado com sucesso'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      logger.error('Erro ao atualizar cliente', {
        context: 'ClienteController',
        action: 'update',
        error: errorMessage,
        stack: errorStack,
        clienteId: req.params.id,
        body: req.body
      });
      
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage
      });
    }
  }

  // Excluir cliente
  static async destroy(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const cliente = await Cliente.findByPk(id);
      
      if (!cliente) {
        res.status(404).json({
          success: false,
          error: 'Cliente não encontrado'
        });
        return;
      }

      // Verificar se cliente tem títulos associados
      const titulosCount = await cliente.countTitulos();

      if (titulosCount > 0) {
        res.status(409).json({
          success: false,
          error: 'Não é possível excluir cliente',
          message: `Cliente possui ${titulosCount} título(s) associado(s). Remova os títulos antes de excluir o cliente.`
        });
        return;
      }

      // Verificar se cliente tem contratos de planos associados
      const contratosCount = await cliente.countPlanos();

      if (contratosCount > 0) {
        res.status(409).json({
          success: false,
          error: 'Não é possível excluir cliente',
          message: `Cliente possui ${contratosCount} contrato(s) de plano(s) associado(s). Remova os contratos antes de excluir o cliente.`
        });
        return;
      }

      // Capturar dados anteriores para auditoria
      const dadosAnteriores = cliente.toJSON() as Record<string, unknown>;
      setAuditData(req, dadosAnteriores);
      
      // Registrar auditoria
      await registrarExclusao(
        req,
        'Cliente',
        cliente.id,
        dadosAnteriores
      );

      // Excluir cliente
      await cliente.destroy();

      res.json({
        success: true,
        message: 'Cliente excluído com sucesso'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao excluir cliente', {
        context: 'ClienteController',
        action: 'delete',
        error: errorMessage,
        stack: errorStack,
        clienteId: req.params.id
      });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage
      });
    }
  }

  // Buscar cliente por CNPJ
  static async findByCnpj(req: Request, res: Response): Promise<void> {
    try {
      const { cnpj } = req.params;

      const cliente = await Cliente.findByCnpj(cnpj);

      if (!cliente) {
        res.status(404).json({
          success: false,
          error: 'Cliente não encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: cliente
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao buscar cliente por CNPJ', {
        context: 'ClienteController',
        action: 'findByCnpj',
        error: errorMessage,
        stack: errorStack,
        cnpj: req.params.cnpj
      });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage
      });
    }
  }

  // Listar clientes ativos
  static async findAtivos(req: Request, res: Response): Promise<void> {
    try {
      const clientes = await Cliente.findAtivos();

      res.json({
        success: true,
        data: clientes
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao listar clientes ativos', {
        context: 'ClienteController',
        action: 'listAtivos',
        error: errorMessage,
        stack: errorStack
      });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage
      });
    }
  }

  // Buscar CEP usando ViaCEP
  static async buscarCep(req: Request, res: Response): Promise<void> {
    try {
      const { cep } = req.params;

      // Remover formatação do CEP
      const cepLimpo = cep.replace(/\D/g, '');
      
      if (cepLimpo.length !== 8) {
        res.status(400).json({
          success: false,
          error: 'CEP inválido',
          message: 'CEP deve ter 8 dígitos'
        });
        return;
      }

      // Consultar na API ViaCEP
      const response = await axios.get(`https://viacep.com.br/ws/${cepLimpo}/json/`, {
        timeout: 10000
      });

      if (response.data.erro) {
        res.status(404).json({
          success: false,
          error: 'CEP não encontrado',
          message: 'CEP não encontrado na base dos Correios'
        });
        return;
      }

      // Mapear dados da API para o formato do sistema
      const dadosCep = {
        cep: response.data.cep || cepLimpo.replace(/^(\d{5})(\d{3})$/, '$1-$2'),
        logradouro: response.data.logradouro || '',
        complemento: response.data.complemento || '',
        bairro: response.data.bairro || '',
        localidade: response.data.localidade || '',
        uf: response.data.uf || '',
        ibge: response.data.ibge || '',
        gia: response.data.gia || '',
        ddd: response.data.ddd || '',
        siafi: response.data.siafi || ''
      };

      res.json({
        success: true,
        data: dadosCep
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          logger.warn('CEP não encontrado', {
            context: 'ClienteController',
            action: 'buscarCep',
            cep: req.params.cep
          });
          res.status(404).json({
            success: false,
            error: 'CEP não encontrado',
            message: 'CEP não encontrado na base dos Correios'
          });
          return;
        }
      }

      logger.error('Erro ao buscar CEP', {
        context: 'ClienteController',
        action: 'buscarCep',
        error: errorMessage,
        stack: errorStack,
        cep: req.params.cep
      });

      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage
      });
    }
  }

  // Consultar dados do CNPJ na ReceitaWS
  static async consultarCnpj(req: Request, res: Response): Promise<void> {
    try {
      const { cnpj } = req.params;
      
      // Remover formatação do CNPJ
      const cnpjLimpo = cnpj.replace(/\D/g, '');
      
      if (cnpjLimpo.length !== 14) {
        res.status(400).json({
          success: false,
          error: 'CNPJ inválido',
          message: 'CNPJ deve ter 14 dígitos'
        });
        return;
      }

      // Consultar na API ReceitaWS
      const response = await axios.get(`https://www.receitaws.com.br/v1/cnpj/${cnpjLimpo}`, {
        timeout: 10000
      });

      if (response.data.status === 'ERROR') {
        res.status(404).json({
          success: false,
          error: 'CNPJ não encontrado',
          message: response.data.message || 'CNPJ não encontrado na base da Receita Federal'
        });
        return;
      }

      // Mapear dados da API para o formato do sistema
      const dadosEmpresa = {
        razao_social: response.data.nome || '',
        nome_fantasia: response.data.fantasia || '',
        cep: response.data.cep ? response.data.cep.replace(/^(\d{5})(\d{3})$/, '$1-$2') : '',
        endereco: response.data.logradouro || '',
        numero: response.data.numero || '',
        complemento: response.data.complemento || '',
        bairro: response.data.bairro || '',
        cidade: response.data.municipio || '',
        estado: response.data.uf || '',
        telefone: response.data.telefone || '',
        email: response.data.email || '',
        situacao: response.data.situacao || '',
        abertura: response.data.abertura || '',
        natureza_juridica: response.data.natureza_juridica || '',
        capital_social: response.data.capital_social || ''
      };

      res.json({
        success: true,
        data: dadosEmpresa
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          logger.warn('Limite de requisições excedido ao consultar CNPJ', {
            context: 'ClienteController',
            action: 'consultarCnpj',
            cnpj: req.params.cnpj
          });
          res.status(429).json({
            success: false,
            error: 'Limite de requisições excedido',
            message: 'Muitas requisições. Tente novamente em alguns instantes.'
          });
          return;
        }
        
        if (error.response?.status === 404) {
          logger.warn('CNPJ não encontrado', {
            context: 'ClienteController',
            action: 'consultarCnpj',
            cnpj: req.params.cnpj
          });
          res.status(404).json({
            success: false,
            error: 'CNPJ não encontrado',
            message: 'CNPJ não encontrado na base da Receita Federal'
          });
          return;
        }
      }

      logger.error('Erro ao consultar CNPJ', {
        context: 'ClienteController',
        action: 'consultarCnpj',
        error: errorMessage,
        stack: errorStack,
        cnpj: req.params.cnpj
      });

      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage
      });
    }
  }
}
