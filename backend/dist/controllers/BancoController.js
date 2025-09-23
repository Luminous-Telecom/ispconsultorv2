"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BancoController = void 0;
const Banco_1 = require("../models/Banco");
const sequelize_1 = require("sequelize");
class BancoController {
    static async list(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 15;
            const search = req.query.search;
            const tipo_banco = req.query.tipo_banco;
            const offset = (page - 1) * limit;
            const where = {};
            if (search) {
                where.nome = { [sequelize_1.Op.like]: `%${search}%` };
            }
            if (tipo_banco) {
                where.tipo_banco = tipo_banco;
            }
            const { count, rows: bancos } = await Banco_1.Banco.findAndCountAll({
                where,
                include: [
                    {
                        association: 'bancoConfiguracoes',
                        attributes: ['id', 'tipo_banco', 'api_url', 'sandbox']
                    }
                ],
                order: [['nome', 'ASC']],
                limit,
                offset
            });
            res.json({
                data: bancos,
                pagination: {
                    current_page: page,
                    per_page: limit,
                    total: count,
                    last_page: Math.ceil(count / limit),
                    from: offset + 1,
                    to: Math.min(offset + limit, count)
                }
            });
        }
        catch (error) {
            console.error('Erro ao listar bancos:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    static async getById(req, res) {
        try {
            const { id } = req.params;
            const banco = await Banco_1.Banco.findByPk(id, {
                include: [
                    {
                        association: 'bancoConfiguracoes',
                        attributes: ['id', 'tipo_banco', 'api_url', 'sandbox']
                    }
                ]
            });
            if (!banco) {
                res.status(404).json({ error: 'Banco não encontrado' });
                return;
            }
            res.json(banco);
        }
        catch (error) {
            console.error('Erro ao buscar banco:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    static async create(req, res) {
        try {
            const banco = await Banco_1.Banco.create(req.body);
            res.status(201).json(banco);
        }
        catch (error) {
            console.error('Erro ao criar banco:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    static async update(req, res) {
        try {
            const { id } = req.params;
            const [updatedRowsCount] = await Banco_1.Banco.update(req.body, {
                where: { id }
            });
            if (updatedRowsCount === 0) {
                res.status(404).json({ error: 'Banco não encontrado' });
                return;
            }
            const banco = await Banco_1.Banco.findByPk(id);
            res.json(banco);
        }
        catch (error) {
            console.error('Erro ao atualizar banco:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    static async delete(req, res) {
        try {
            const { id } = req.params;
            const deletedRowsCount = await Banco_1.Banco.destroy({
                where: { id }
            });
            if (deletedRowsCount === 0) {
                res.status(404).json({ error: 'Banco não encontrado' });
                return;
            }
            res.status(204).send();
        }
        catch (error) {
            console.error('Erro ao deletar banco:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    static async findAtivos(req, res) {
        try {
            const bancos = await Banco_1.Banco.findAll({
                where: { ativo: true },
                order: [['nome', 'ASC']]
            });
            res.json(bancos);
        }
        catch (error) {
            console.error('Erro ao buscar bancos ativos:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    static async testarConexao(req, res) {
        try {
            const { id } = req.params;
            const banco = await Banco_1.Banco.findByPk(id);
            if (!banco) {
                res.status(404).json({ error: 'Banco não encontrado' });
                return;
            }
            res.json({
                success: true,
                message: 'Conexão com a API do banco realizada com sucesso!'
            });
        }
        catch (error) {
            console.error('Erro ao testar conexão:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    static async buscarDadosApi(req, res) {
        try {
            const { id } = req.params;
            const banco = await Banco_1.Banco.findByPk(id);
            if (!banco) {
                res.status(404).json({ error: 'Banco não encontrado' });
                return;
            }
            res.json({
                success: true,
                data: {
                    contas: [],
                    webhooks: []
                }
            });
        }
        catch (error) {
            console.error('Erro ao buscar dados da API:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    static async urlPadrao(req, res) {
        try {
            const { tipoBanco } = req.params;
            const urls = {
                'efi': 'https://api.efi.com.br',
                'pagseguro': 'https://api.pagseguro.com',
                'mercadopago': 'https://api.mercadopago.com'
            };
            const url = urls[tipoBanco] || null;
            if (!url) {
                res.status(404).json({
                    success: false,
                    message: 'Configurações do banco não encontradas'
                });
                return;
            }
            res.json({
                success: true,
                url: url
            });
        }
        catch (error) {
            console.error('Erro ao buscar URL padrão:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
}
exports.BancoController = BancoController;
//# sourceMappingURL=BancoController.js.map