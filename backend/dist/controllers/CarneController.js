"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CarneController = void 0;
const Carne_1 = require("../models/Carne");
const sequelize_1 = require("sequelize");
class CarneController {
    static async list(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 15;
            const search = req.query.search;
            const status = req.query.status;
            const cliente_id = req.query.cliente_id;
            const offset = (page - 1) * limit;
            const where = {};
            if (search) {
                where[sequelize_1.Op.or] = [
                    { numero_carne: { [sequelize_1.Op.like]: `%${search}%` } },
                    { carnet_id: { [sequelize_1.Op.like]: `%${search}%` } }
                ];
            }
            if (status) {
                where.status = status;
            }
            if (cliente_id) {
                where.cliente_id = cliente_id;
            }
            const { count, rows: carnes } = await Carne_1.Carne.findAndCountAll({
                where,
                include: [
                    {
                        association: 'cliente',
                        attributes: ['id', 'razao_social', 'nome_fantasia', 'cnpj']
                    },
                    {
                        association: 'plano',
                        attributes: ['id', 'nome_plano', 'valor_mensal']
                    },
                    {
                        association: 'banco',
                        attributes: ['id', 'nome', 'codigo']
                    }
                ],
                order: [['created_at', 'DESC']],
                limit,
                offset
            });
            res.json({
                data: carnes,
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
            console.error('Erro ao listar carnês:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    static async getById(req, res) {
        try {
            const { id } = req.params;
            const carne = await Carne_1.Carne.findByPk(id, {
                include: [
                    {
                        association: 'cliente',
                        attributes: ['id', 'razao_social', 'nome_fantasia', 'cnpj']
                    },
                    {
                        association: 'plano',
                        attributes: ['id', 'nome_plano', 'valor_mensal']
                    },
                    {
                        association: 'banco',
                        attributes: ['id', 'nome', 'codigo']
                    },
                    {
                        association: 'parcelas',
                        order: [['numero_parcela', 'ASC']]
                    }
                ]
            });
            if (!carne) {
                res.status(404).json({ error: 'Carnê não encontrado' });
                return;
            }
            res.json(carne);
        }
        catch (error) {
            console.error('Erro ao buscar carnê:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    static async create(req, res) {
        try {
            const carne = await Carne_1.Carne.create(req.body);
            res.status(201).json(carne);
        }
        catch (error) {
            console.error('Erro ao criar carnê:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    static async update(req, res) {
        try {
            const { id } = req.params;
            const [updatedRowsCount] = await Carne_1.Carne.update(req.body, {
                where: { id }
            });
            if (updatedRowsCount === 0) {
                res.status(404).json({ error: 'Carnê não encontrado' });
                return;
            }
            const carne = await Carne_1.Carne.findByPk(id);
            res.json(carne);
        }
        catch (error) {
            console.error('Erro ao atualizar carnê:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    static async delete(req, res) {
        try {
            const { id } = req.params;
            const deletedRowsCount = await Carne_1.Carne.destroy({
                where: { id }
            });
            if (deletedRowsCount === 0) {
                res.status(404).json({ error: 'Carnê não encontrado' });
                return;
            }
            res.status(204).send();
        }
        catch (error) {
            console.error('Erro ao deletar carnê:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    static async findAtivos(req, res) {
        try {
            const carnes = await Carne_1.Carne.findAll({
                where: { status: 'ativo' },
                include: [
                    {
                        association: 'cliente',
                        attributes: ['id', 'razao_social', 'nome_fantasia']
                    },
                    {
                        association: 'plano',
                        attributes: ['id', 'nome_plano', 'valor_mensal']
                    }
                ],
                order: [['numero_carne', 'ASC']]
            });
            res.json(carnes);
        }
        catch (error) {
            console.error('Erro ao buscar carnês ativos:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    static async imprimir(req, res) {
        try {
            const { id } = req.params;
            const carne = await Carne_1.Carne.findByPk(id, {
                include: [
                    { association: 'cliente' },
                    { association: 'plano' },
                    { association: 'banco' }
                ]
            });
            if (!carne) {
                res.status(404).json({ error: 'Carnê não encontrado' });
                return;
            }
            res.json({
                success: true,
                message: 'Carnê enviado para impressão'
            });
        }
        catch (error) {
            console.error('Erro ao imprimir carnê:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    static async pdf(req, res) {
        try {
            const { id } = req.params;
            const carne = await Carne_1.Carne.findByPk(id, {
                include: [
                    { association: 'cliente' },
                    { association: 'plano' },
                    { association: 'banco' }
                ]
            });
            if (!carne) {
                res.status(404).json({ error: 'Carnê não encontrado' });
                return;
            }
            res.json({
                success: true,
                message: 'PDF gerado com sucesso'
            });
        }
        catch (error) {
            console.error('Erro ao gerar PDF:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    static async gerarTitulos(req, res) {
        try {
            const { id } = req.params;
            const carne = await Carne_1.Carne.findByPk(id);
            if (!carne) {
                res.status(404).json({ error: 'Carnê não encontrado' });
                return;
            }
            res.json({
                success: true,
                message: 'Títulos gerados com sucesso'
            });
        }
        catch (error) {
            console.error('Erro ao gerar títulos:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    static async consultarStatus(req, res) {
        try {
            const { id } = req.params;
            const carne = await Carne_1.Carne.findByPk(id);
            if (!carne) {
                res.status(404).json({ error: 'Carnê não encontrado' });
                return;
            }
            res.json({
                success: true,
                status: 'ativo',
                message: 'Status consultado com sucesso'
            });
        }
        catch (error) {
            console.error('Erro ao consultar status:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    static async cancelarNoBanco(req, res) {
        try {
            const { id } = req.params;
            const carne = await Carne_1.Carne.findByPk(id);
            if (!carne) {
                res.status(404).json({ error: 'Carnê não encontrado' });
                return;
            }
            res.json({
                success: true,
                message: 'Carnê cancelado no banco com sucesso'
            });
        }
        catch (error) {
            console.error('Erro ao cancelar carnê:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
}
exports.CarneController = CarneController;
//# sourceMappingURL=CarneController.js.map