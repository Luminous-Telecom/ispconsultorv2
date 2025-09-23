"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanoController = void 0;
const Plano_1 = require("../models/Plano");
const sequelize_1 = require("sequelize");
class PlanoController {
    static async list(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 15;
            const search = req.query.search;
            const status = req.query.status;
            const tipo_servico = req.query.tipo_servico;
            const offset = (page - 1) * limit;
            const where = {};
            if (search) {
                where[sequelize_1.Op.or] = [
                    { nome_plano: { [sequelize_1.Op.like]: `%${search}%` } },
                    { descricao: { [sequelize_1.Op.like]: `%${search}%` } }
                ];
            }
            if (status) {
                where.status = status;
            }
            if (tipo_servico) {
                where.tipo_servico = tipo_servico;
            }
            const { count, rows: planos } = await Plano_1.Plano.findAndCountAll({
                where,
                include: [
                    {
                        association: 'clientes',
                        attributes: ['id', 'razao_social', 'nome_fantasia'],
                        through: { attributes: ['desconto_percentual', 'desconto_valor', 'valor_final', 'status'] }
                    }
                ],
                order: [['created_at', 'DESC']],
                limit,
                offset
            });
            res.json({
                data: planos,
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
            console.error('Erro ao listar planos:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    static async getById(req, res) {
        try {
            const { id } = req.params;
            const plano = await Plano_1.Plano.findByPk(id, {
                include: [
                    {
                        association: 'clientes',
                        attributes: ['id', 'razao_social', 'nome_fantasia'],
                        through: { attributes: ['desconto_percentual', 'desconto_valor', 'valor_final', 'status'] }
                    }
                ]
            });
            if (!plano) {
                res.status(404).json({ error: 'Plano não encontrado' });
                return;
            }
            res.json(plano);
        }
        catch (error) {
            console.error('Erro ao buscar plano:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    static async create(req, res) {
        try {
            const plano = await Plano_1.Plano.create(req.body);
            res.status(201).json(plano);
        }
        catch (error) {
            console.error('Erro ao criar plano:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    static async update(req, res) {
        try {
            const { id } = req.params;
            const [updatedRowsCount] = await Plano_1.Plano.update(req.body, {
                where: { id }
            });
            if (updatedRowsCount === 0) {
                res.status(404).json({ error: 'Plano não encontrado' });
                return;
            }
            const plano = await Plano_1.Plano.findByPk(id);
            res.json(plano);
        }
        catch (error) {
            console.error('Erro ao atualizar plano:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    static async delete(req, res) {
        try {
            const { id } = req.params;
            const deletedRowsCount = await Plano_1.Plano.destroy({
                where: { id }
            });
            if (deletedRowsCount === 0) {
                res.status(404).json({ error: 'Plano não encontrado' });
                return;
            }
            res.status(204).send();
        }
        catch (error) {
            console.error('Erro ao deletar plano:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    static async findAtivos(req, res) {
        try {
            const planos = await Plano_1.Plano.findAll({
                where: { status: 'ativo' },
                order: [['nome_plano', 'ASC']]
            });
            res.json(planos);
        }
        catch (error) {
            console.error('Erro ao buscar planos ativos:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
}
exports.PlanoController = PlanoController;
//# sourceMappingURL=PlanoController.js.map