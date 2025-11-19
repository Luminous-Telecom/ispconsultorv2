import { Request, Response } from 'express';
import { Cliente } from '../models/Cliente';
import { Op, WhereOptions } from 'sequelize';
import Joi from 'joi';
import axios from 'axios';

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
    valor_primeiro_titulo: Joi.string().valid('total', 'proporcional').required(),
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
      console.error('Erro ao listar clientes:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
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

      res.json({
        success: true,
        data: cliente
      });
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
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
      // Validar dados
      const { error, value } = ClienteController.createSchema.validate(req.body);
      
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

      res.status(201).json({
        success: true,
        data: clienteCriado,
        message: 'Cliente criado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Atualizar cliente
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Validar dados
      const { error, value } = ClienteController.updateSchema.validate(req.body);
      
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          details: error.details.map(d => d.message)
        });
        return;
      }
      

      // Buscar cliente
      const cliente = await Cliente.findByPk(id);
      
      if (!cliente) {
        res.status(404).json({
          success: false,
          error: 'Cliente não encontrado'
        });
        return;
      }

      // Verificar se CNPJ já existe em outro cliente
      if (value.cnpj && value.cnpj !== cliente.cnpj) {
        const clienteExistente = await Cliente.findOne({
          where: { 
            cnpj: value.cnpj,
            id: { [Op.ne]: id }
          }
        });

        if (clienteExistente) {
          res.status(409).json({
            success: false,
            error: 'CNPJ já cadastrado',
            message: 'Já existe outro cliente cadastrado com este CNPJ'
          });
          return;
        }
      }

      // Atualizar cliente
      await cliente.update(value);

      // Buscar cliente atualizado com relacionamentos
      const clienteAtualizado = await Cliente.findByPk(id, {
        include: [
          { association: 'planos' },
          { association: 'titulos' },
        ]
      });

      res.json({
        success: true,
        data: clienteAtualizado,
        message: 'Cliente atualizado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
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

      // Excluir cliente
      await cliente.destroy();

      res.json({
        success: true,
        message: 'Cliente excluído com sucesso'
      });
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
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
      console.error('Erro ao buscar cliente por CNPJ:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
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
      console.error('Erro ao listar clientes ativos:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Buscar CEP (simulação)
  static async buscarCep(req: Request, res: Response): Promise<void> {
    try {
      const { cep } = req.params;

      // Aqui você pode integrar com uma API real de CEP como ViaCEP
      // Por enquanto, retornando dados fictícios
      const dadosCep = {
        cep: cep.replace(/\D/g, ''),
        logradouro: 'Rua Exemplo',
        complemento: '',
        bairro: 'Centro',
        localidade: 'São Paulo',
        uf: 'SP',
        ibge: '3550308',
        gia: '1004',
        ddd: '11',
        siafi: '7107'
      };

      res.json({
        success: true,
        data: dadosCep
      });
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
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
      console.error('Erro ao consultar CNPJ:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          res.status(429).json({
            success: false,
            error: 'Limite de requisições excedido',
            message: 'Muitas requisições. Tente novamente em alguns instantes.'
          });
          return;
        }
        
        if (error.response?.status === 404) {
          res.status(404).json({
            success: false,
            error: 'CNPJ não encontrado',
            message: 'CNPJ não encontrado na base da Receita Federal'
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro ao consultar CNPJ'
      });
    }
  }
}
