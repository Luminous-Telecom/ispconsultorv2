import { Request, Response } from 'express';
import { Banco } from '../models/Banco';
import { Op } from 'sequelize';

export class BancoController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 15;
      const search = req.query.search as string;
      const tipo_banco = req.query.tipo_banco as string;

      const offset = (page - 1) * limit;

      // Construir filtros
      const where: any = {};
      
      if (search) {
        where.nome = { [Op.like]: `%${search}%` };
      }

      if (tipo_banco) {
        where.tipo_banco = tipo_banco;
      }

      const { count, rows: bancos } = await Banco.findAndCountAll({
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
    } catch (error) {
      console.error('Erro ao listar bancos:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const banco = await Banco.findByPk(id, {
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
    } catch (error) {
      console.error('Erro ao buscar banco:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const banco = await Banco.create(req.body);
      res.status(201).json(banco);
    } catch (error) {
      console.error('Erro ao criar banco:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const [updatedRowsCount] = await Banco.update(req.body, {
        where: { id }
      });

      if (updatedRowsCount === 0) {
        res.status(404).json({ error: 'Banco não encontrado' });
        return;
      }

      const banco = await Banco.findByPk(id);
      res.json(banco);
    } catch (error) {
      console.error('Erro ao atualizar banco:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deletedRowsCount = await Banco.destroy({
        where: { id }
      });

      if (deletedRowsCount === 0) {
        res.status(404).json({ error: 'Banco não encontrado' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Erro ao deletar banco:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async findAtivos(req: Request, res: Response): Promise<void> {
    try {
      const bancos = await Banco.findAll({
        where: { ativo: true },
        order: [['nome', 'ASC']]
      });

      res.json(bancos);
    } catch (error) {
      console.error('Erro ao buscar bancos ativos:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async testarConexao(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const banco = await Banco.findByPk(id);

      if (!banco) {
        res.status(404).json({ error: 'Banco não encontrado' });
        return;
      }

      // Mock para teste de conexão
      res.json({
        success: true,
        message: 'Conexão com a API do banco realizada com sucesso!'
      });
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async buscarDadosApi(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const banco = await Banco.findByPk(id);

      if (!banco) {
        res.status(404).json({ error: 'Banco não encontrado' });
        return;
      }

      // Mock para busca de dados da API
      res.json({
        success: true,
        data: {
          contas: [],
          webhooks: []
        }
      });
    } catch (error) {
      console.error('Erro ao buscar dados da API:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async urlPadrao(req: Request, res: Response): Promise<void> {
    try {
      const { tipoBanco } = req.params;
      
      // Mock para URL padrão
      const urls: { [key: string]: string } = {
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
    } catch (error) {
      console.error('Erro ao buscar URL padrão:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}