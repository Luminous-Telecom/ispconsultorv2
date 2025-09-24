import { Request, Response } from 'express';
import { Plano } from '../models/Plano';
import { Cliente } from '../models/Cliente';
import { Op } from 'sequelize';

export class PlanoController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 15;
      const search = req.query.search as string;
      const status = req.query.status as string;
      const tipo_servico = req.query.tipo_servico as string;

      const offset = (page - 1) * limit;

      // Construir filtros
      const where: any = {};
      
      if (search) {
        where[Op.or] = [
          { nome_plano: { [Op.like]: `%${search}%` } },
          { descricao: { [Op.like]: `%${search}%` } }
        ];
      }

      if (status) {
        where.status = status;
      }

      if (tipo_servico) {
        where.tipo_servico = tipo_servico;
      }

      const { count, rows: planos } = await Plano.findAndCountAll({
        where,
        attributes: [
          'id', 'nome_plano', 'descricao', 'tipo_servico', 'servicos_inclusos',
          'quantidade_usuarios', 'valor_mensal', 'desconto_percentual', 'desconto_valor',
          'desconto_ativo', 'periodicidade', 'renovacao_automatica', 'data_inicio',
          'data_fim', 'status', 'observacoes', 'created_at', 'updated_at'
        ],
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
    } catch (error) {
      console.error('Erro ao listar planos:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const plano = await Plano.findByPk(id, {
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
    } catch (error) {
      console.error('Erro ao buscar plano:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const plano = await Plano.create(req.body);
      res.status(201).json(plano);
    } catch (error) {
      console.error('Erro ao criar plano:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const [updatedRowsCount] = await Plano.update(req.body, {
        where: { id }
      });

      if (updatedRowsCount === 0) {
        res.status(404).json({ error: 'Plano não encontrado' });
        return;
      }

      const plano = await Plano.findByPk(id);
      res.json(plano);
    } catch (error) {
      console.error('Erro ao atualizar plano:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deletedRowsCount = await Plano.destroy({
        where: { id }
      });

      if (deletedRowsCount === 0) {
        res.status(404).json({ error: 'Plano não encontrado' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Erro ao deletar plano:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async findAtivos(req: Request, res: Response): Promise<void> {
    try {
      const planos = await Plano.findAll({
        where: { status: 'ativo' },
        order: [['nome_plano', 'ASC']]
      });

      res.json(planos);
    } catch (error) {
      console.error('Erro ao buscar planos ativos:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}