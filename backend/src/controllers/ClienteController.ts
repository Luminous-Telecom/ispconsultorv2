import { Request, Response } from 'express';
import { Cliente } from '../models/Cliente';
import { Op } from 'sequelize';
import Joi from 'joi';

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
    cep: Joi.string().max(10).allow(null, ''),
    endereco: Joi.string().max(255).allow(null, ''),
    numero: Joi.string().max(10).allow(null, ''),
    complemento: Joi.string().max(100).allow(null, ''),
    bairro: Joi.string().max(100).allow(null, ''),
    cidade: Joi.string().max(100).allow(null, ''),
    estado: Joi.string().length(2).allow(null, ''),
    observacoes: Joi.string().allow(null, ''),
    ativo: Joi.boolean().default(true),
    tipo_cobranca: Joi.string().max(50).allow(null, ''),
    valor_primeiro_titulo: Joi.string().valid('total', 'proporcional').required(),
    isento_mensalidade: Joi.boolean().default(false),
    recebe_email: Joi.boolean().default(true),
    recebe_sms: Joi.boolean().default(false),
    recebe_whatsapp: Joi.boolean().default(false),
    dia_vencimento: Joi.number().min(1).max(31).allow(null),
    conta_boleto: Joi.number().integer().min(1).required(),
    data_validade_desconto: Joi.date().allow(null),
    plano_id: Joi.number().integer().min(1).allow(null),
    desconto_percentual: Joi.number().min(0).max(100).allow(null),
    desconto_valor: Joi.number().min(0).allow(null),
    data_inicio_plano: Joi.date().allow(null)
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
    tipo_cobranca: Joi.string().max(50).allow(null, ''),
    valor_primeiro_titulo: Joi.string().valid('total', 'proporcional').required(),
    isento_mensalidade: Joi.boolean(),
    recebe_email: Joi.boolean(),
    recebe_sms: Joi.boolean(),
    recebe_whatsapp: Joi.boolean(),
    dia_vencimento: Joi.number().min(1).max(31).allow(null),
    conta_boleto: Joi.number().integer().min(1).required(),
    data_validade_desconto: Joi.date().allow(null),
    plano_id: Joi.number().integer().min(1).allow(null),
    desconto_percentual: Joi.number().min(0).max(100).allow(null),
    desconto_valor: Joi.number().min(0).allow(null),
    data_inicio_plano: Joi.date().allow(null)
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
      const where: any = {};
      
      if (search) {
        where[Op.or] = [
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

      const { count, rows: clientes } = await Cliente.findAndCountAll({
        where,
        include: [
          { association: 'planos', attributes: ['id', 'nome_plano', 'valor_mensal', 'status'] },
          { association: 'titulos', attributes: ['id', 'numero_titulo', 'status', 'valor'] },
          { 
            association: 'bancoBoleto', 
            attributes: ['id', 'nome', 'tipo_banco', 'client_id_producao', 'client_secret_producao'] 
          }
        ],
        order: [['razao_social', 'ASC']],
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
          { 
            association: 'bancoBoleto',
            attributes: ['id', 'nome', 'tipo_banco', 'client_id_producao', 'client_secret_producao']
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
      const { error, value } = this.createSchema.validate(req.body);
      
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
          { association: 'carnes' },
          { 
            association: 'bancoBoleto',
            attributes: ['id', 'nome', 'tipo_banco', 'client_id_producao', 'client_secret_producao']
          }
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
    console.log('CLIENTE UPDATE INICIADO');
    try {
      const { id } = req.params;
      
      console.log('CLIENTE UPDATE - ID:', id);
      console.log('CLIENTE UPDATE - BODY:', JSON.stringify(req.body));

      // Validar dados
      const { error, value } = ClienteController.updateSchema.validate(req.body);
      
      if (error) {
        console.log('CLIENTE UPDATE - ERRO VALIDAÇÃO:', error.details);
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
          { association: 'carnes' },
          { 
            association: 'bancoBoleto',
            attributes: ['id', 'nome', 'tipo_banco', 'client_id_producao', 'client_secret_producao']
          }
        ]
      });

      res.json({
        success: true,
        data: clienteAtualizado,
        message: 'Cliente atualizado com sucesso'
      });
    } catch (error) {
      console.log('CLIENTE UPDATE - ERRO CAPTURADO:', error);
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
}
