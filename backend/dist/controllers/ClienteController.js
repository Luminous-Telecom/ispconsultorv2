"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClienteController = void 0;
const Cliente_1 = require("../models/Cliente");
const sequelize_1 = require("sequelize");
const joi_1 = __importDefault(require("joi"));
class ClienteController {
    static async index(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const search = req.query.search;
            const ativo = req.query.ativo;
            const cidade = req.query.cidade;
            const estado = req.query.estado;
            const offset = (page - 1) * limit;
            const where = {};
            if (search) {
                where[sequelize_1.Op.or] = [
                    { razao_social: { [sequelize_1.Op.like]: `%${search}%` } },
                    { nome_fantasia: { [sequelize_1.Op.like]: `%${search}%` } },
                    { email: { [sequelize_1.Op.like]: `%${search}%` } },
                    { cnpj: { [sequelize_1.Op.like]: `%${search}%` } }
                ];
            }
            if (ativo !== undefined) {
                where.ativo = ativo === 'true';
            }
            if (cidade) {
                where.cidade = { [sequelize_1.Op.like]: `%${cidade}%` };
            }
            if (estado) {
                where.estado = estado.toUpperCase();
            }
            const { count, rows: clientes } = await Cliente_1.Cliente.findAndCountAll({
                where,
                include: [
                    { association: 'planos', attributes: ['id', 'nome_plano', 'valor_mensal', 'status'] },
                    { association: 'carnes', attributes: ['id', 'numero_carne', 'status', 'valor_total'] },
                    { association: 'bancoBoleto', attributes: ['id', 'nome', 'tipo_banco'] }
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
        }
        catch (error) {
            console.error('Erro ao listar clientes:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }
    static async show(req, res) {
        try {
            const { id } = req.params;
            const cliente = await Cliente_1.Cliente.findByPk(id, {
                include: [
                    {
                        association: 'planos',
                        include: [{ association: 'clientes', attributes: ['id', 'razao_social'] }]
                    },
                    {
                        association: 'carnes',
                        include: [
                            { association: 'parcelas' },
                            { association: 'plano', attributes: ['id', 'nome_plano'] },
                            { association: 'banco', attributes: ['id', 'nome', 'tipo_banco'] }
                        ]
                    },
                    { association: 'bancoBoleto' },
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
        }
        catch (error) {
            console.error('Erro ao buscar cliente:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }
    static async store(req, res) {
        try {
            const { error, value } = this.createSchema.validate(req.body);
            if (error) {
                res.status(400).json({
                    success: false,
                    error: 'Dados inválidos',
                    details: error.details.map(d => d.message)
                });
                return;
            }
            const clienteExistente = await Cliente_1.Cliente.findOne({
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
            const cliente = await Cliente_1.Cliente.create(value);
            const clienteCriado = await Cliente_1.Cliente.findByPk(cliente.id, {
                include: [
                    { association: 'planos' },
                    { association: 'carnes' },
                    { association: 'bancoBoleto' }
                ]
            });
            res.status(201).json({
                success: true,
                data: clienteCriado,
                message: 'Cliente criado com sucesso'
            });
        }
        catch (error) {
            console.error('Erro ao criar cliente:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }
    static async update(req, res) {
        try {
            const { id } = req.params;
            const { error, value } = this.updateSchema.validate(req.body);
            if (error) {
                res.status(400).json({
                    success: false,
                    error: 'Dados inválidos',
                    details: error.details.map(d => d.message)
                });
                return;
            }
            const cliente = await Cliente_1.Cliente.findByPk(id);
            if (!cliente) {
                res.status(404).json({
                    success: false,
                    error: 'Cliente não encontrado'
                });
                return;
            }
            if (value.cnpj && value.cnpj !== cliente.cnpj) {
                const clienteExistente = await Cliente_1.Cliente.findOne({
                    where: {
                        cnpj: value.cnpj,
                        id: { [sequelize_1.Op.ne]: id }
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
            await cliente.update(value);
            const clienteAtualizado = await Cliente_1.Cliente.findByPk(id, {
                include: [
                    { association: 'planos' },
                    { association: 'carnes' },
                    { association: 'bancoBoleto' }
                ]
            });
            res.json({
                success: true,
                data: clienteAtualizado,
                message: 'Cliente atualizado com sucesso'
            });
        }
        catch (error) {
            console.error('Erro ao atualizar cliente:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }
    static async destroy(req, res) {
        try {
            const { id } = req.params;
            const cliente = await Cliente_1.Cliente.findByPk(id);
            if (!cliente) {
                res.status(404).json({
                    success: false,
                    error: 'Cliente não encontrado'
                });
                return;
            }
            const carnesAtivos = await cliente.getCarnes({
                where: { status: 'ativo' }
            });
            if (carnesAtivos.length > 0) {
                res.status(409).json({
                    success: false,
                    error: 'Não é possível excluir cliente',
                    message: 'Cliente possui carnês ativos'
                });
                return;
            }
            await cliente.destroy();
            res.json({
                success: true,
                message: 'Cliente excluído com sucesso'
            });
        }
        catch (error) {
            console.error('Erro ao excluir cliente:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }
    static async findByCnpj(req, res) {
        try {
            const { cnpj } = req.params;
            const cliente = await Cliente_1.Cliente.findByCnpj(cnpj);
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
        }
        catch (error) {
            console.error('Erro ao buscar cliente por CNPJ:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }
    static async findAtivos(req, res) {
        try {
            const clientes = await Cliente_1.Cliente.findAtivos();
            res.json({
                success: true,
                data: clientes
            });
        }
        catch (error) {
            console.error('Erro ao listar clientes ativos:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }
    static async buscarCep(req, res) {
        try {
            const { cep } = req.params;
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
        }
        catch (error) {
            console.error('Erro ao buscar CEP:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }
}
exports.ClienteController = ClienteController;
ClienteController.createSchema = joi_1.default.object({
    cnpj: joi_1.default.string().length(18).required().messages({
        'string.length': 'CNPJ deve ter exatamente 18 caracteres',
        'any.required': 'CNPJ é obrigatório'
    }),
    razao_social: joi_1.default.string().min(2).max(255).required().messages({
        'string.min': 'Razão social deve ter pelo menos 2 caracteres',
        'string.max': 'Razão social deve ter no máximo 255 caracteres',
        'any.required': 'Razão social é obrigatória'
    }),
    nome_fantasia: joi_1.default.string().max(255).allow(null, ''),
    email: joi_1.default.string().email().required().messages({
        'string.email': 'Email deve ser válido',
        'any.required': 'Email é obrigatório'
    }),
    telefone: joi_1.default.string().max(20).allow(null, ''),
    whatsapp: joi_1.default.string().max(20).allow(null, ''),
    cep: joi_1.default.string().max(10).allow(null, ''),
    endereco: joi_1.default.string().max(255).allow(null, ''),
    numero: joi_1.default.string().max(10).allow(null, ''),
    complemento: joi_1.default.string().max(100).allow(null, ''),
    bairro: joi_1.default.string().max(100).allow(null, ''),
    cidade: joi_1.default.string().max(100).allow(null, ''),
    estado: joi_1.default.string().length(2).allow(null, ''),
    observacoes: joi_1.default.string().allow(null, ''),
    ativo: joi_1.default.boolean().default(true),
    tipo_cobranca: joi_1.default.string().max(50).allow(null, ''),
    valor_primeiro_titulo: joi_1.default.number().min(0).allow(null),
    isento_mensalidade: joi_1.default.boolean().default(false),
    recebe_email: joi_1.default.boolean().default(true),
    recebe_sms: joi_1.default.boolean().default(false),
    recebe_whatsapp: joi_1.default.boolean().default(false),
    dia_vencimento: joi_1.default.number().min(1).max(31).allow(null),
    conta_boleto: joi_1.default.number().integer().min(1).allow(null),
    data_validade_desconto: joi_1.default.date().allow(null)
});
ClienteController.updateSchema = joi_1.default.object({
    cnpj: joi_1.default.string().length(18).messages({
        'string.length': 'CNPJ deve ter exatamente 18 caracteres'
    }),
    razao_social: joi_1.default.string().min(2).max(255).messages({
        'string.min': 'Razão social deve ter pelo menos 2 caracteres',
        'string.max': 'Razão social deve ter no máximo 255 caracteres'
    }),
    nome_fantasia: joi_1.default.string().max(255).allow(null, ''),
    email: joi_1.default.string().email().messages({
        'string.email': 'Email deve ser válido'
    }),
    telefone: joi_1.default.string().max(20).allow(null, ''),
    whatsapp: joi_1.default.string().max(20).allow(null, ''),
    cep: joi_1.default.string().max(10).allow(null, ''),
    endereco: joi_1.default.string().max(255).allow(null, ''),
    numero: joi_1.default.string().max(10).allow(null, ''),
    complemento: joi_1.default.string().max(100).allow(null, ''),
    bairro: joi_1.default.string().max(100).allow(null, ''),
    cidade: joi_1.default.string().max(100).allow(null, ''),
    estado: joi_1.default.string().length(2).allow(null, ''),
    observacoes: joi_1.default.string().allow(null, ''),
    ativo: joi_1.default.boolean(),
    tipo_cobranca: joi_1.default.string().max(50).allow(null, ''),
    valor_primeiro_titulo: joi_1.default.number().min(0).allow(null),
    isento_mensalidade: joi_1.default.boolean(),
    recebe_email: joi_1.default.boolean(),
    recebe_sms: joi_1.default.boolean(),
    recebe_whatsapp: joi_1.default.boolean(),
    dia_vencimento: joi_1.default.number().min(1).max(31).allow(null),
    conta_boleto: joi_1.default.number().integer().min(1).allow(null),
    data_validade_desconto: joi_1.default.date().allow(null)
});
//# sourceMappingURL=ClienteController.js.map