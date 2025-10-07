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
      const sortColumn = req.query.sortColumn as string;
      const sortDirection = req.query.sortDirection as string;

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

      // Construir ordenação
      let order: any[] = [['created_at', 'DESC']]; // Padrão
      if (sortColumn && sortDirection) {
        // Validar colunas permitidas para ordenação
        const allowedColumns = [
          'id', 'nome_plano', 'descricao', 'tipo_servico', 'quantidade_usuarios', 
          'valor_mensal', 'periodicidade', 'status', 'created_at'
        ];
        
        if (allowedColumns.includes(sortColumn)) {
          const direction = sortDirection.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
          order = [[sortColumn, direction]];
        }
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
        order,
        limit,
        offset,
        raw: false
      });

      // Garantir que servicos_inclusos seja um array
      const planosProcessados = planos.map(plano => {
        const planoData = plano.toJSON();
        if (typeof planoData.servicos_inclusos === 'string') {
          try {
            planoData.servicos_inclusos = JSON.parse(planoData.servicos_inclusos);
          } catch (e) {
            planoData.servicos_inclusos = [];
          }
        }
        return planoData;
      });

      res.json({
        data: planosProcessados,
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

      // Garantir que servicos_inclusos seja um array
      const planoData = plano.toJSON();
      if (typeof planoData.servicos_inclusos === 'string') {
        try {
          planoData.servicos_inclusos = JSON.parse(planoData.servicos_inclusos);
        } catch (e) {
          planoData.servicos_inclusos = [];
        }
      }

      res.json(planoData);
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
      
      console.log('Dados recebidos para atualização:', req.body);
      console.log('ID do plano:', id);
      
      // Verificar se o plano existe
      const existingPlano = await Plano.findByPk(id);
      if (!existingPlano) {
        res.status(404).json({
          success: false,
          error: 'Plano não encontrado'
        });
        return;
      }
      
      // Validar dados obrigatórios
      const { nome_plano, tipo_servico, valor_mensal } = req.body;
      if (!nome_plano || !tipo_servico || valor_mensal === undefined) {
        res.status(400).json({
          success: false,
          error: 'Dados obrigatórios não fornecidos',
          message: 'Nome do plano, tipo de serviço e valor mensal são obrigatórios'
        });
        return;
      }
      
      // Filtrar apenas campos válidos para atualização
      const allowedFields = [
        'nome_plano', 'descricao', 'tipo_servico', 'servicos_inclusos',
        'quantidade_usuarios', 'valor_mensal', 'desconto_percentual', 'desconto_valor',
        'desconto_ativo', 'periodicidade', 'renovacao_automatica', 'data_inicio',
        'data_fim', 'status', 'observacoes'
      ];
      
      const updateData: any = {};
      Object.keys(req.body).forEach(key => {
        if (allowedFields.includes(key)) {
          // Validar datas
          if (key === 'data_inicio' || key === 'data_fim') {
            const dateValue = req.body[key];
            if (dateValue && dateValue !== '' && dateValue !== 'Invalid date') {
              // Verificar se é uma data válida
              const date = new Date(dateValue);
              if (!isNaN(date.getTime())) {
                updateData[key] = dateValue;
              }
            }
          } else {
            updateData[key] = req.body[key];
          }
        }
      });
      
      console.log('Dados filtrados para atualização:', updateData);
      
      const [updatedRowsCount] = await Plano.update(updateData, {
        where: { id }
      });

      if (updatedRowsCount === 0) {
        res.status(404).json({ 
          success: false,
          error: 'Plano não encontrado' 
        });
        return;
      }

      const plano = await Plano.findByPk(id);
      res.json({
        success: true,
        message: 'Plano atualizado com sucesso!',
        data: plano
      });
    } catch (error) {
      console.error('Erro ao atualizar plano:', error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A');
      
      // Log mais detalhado para debugging
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
      }
      
      res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        details: process.env.NODE_ENV === 'development' ? {
          stack: error instanceof Error ? error.stack : undefined,
          name: error instanceof Error ? error.name : undefined
        } : undefined
      });
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const plano = await Plano.findByPk(id);
      
      if (!plano) {
        res.status(404).json({ 
          success: false,
          error: 'Plano não encontrado' 
        });
        return;
      }
      
      // Verificar se tem títulos associados
      const titulosCount = await plano.countTitulos();
      
      if (titulosCount > 0) {
        res.status(409).json({ 
          success: false,
          error: 'Não é possível excluir plano',
          message: `Plano possui ${titulosCount} título(s) associado(s). Remova os títulos antes de excluir o plano.`
        });
        return;
      }
      
      // Verificar se tem contratos de clientes associados
      const contratosCount = await plano.countClientes();
      
      if (contratosCount > 0) {
        res.status(409).json({ 
          success: false,
          error: 'Não é possível excluir plano',
          message: `Plano possui ${contratosCount} contrato(s) de cliente(s) associado(s). Remova os contratos antes de excluir o plano.`
        });
        return;
      }
      
      await plano.destroy();
      
      res.json({
        success: true,
        message: 'Plano excluído com sucesso!'
      });
    } catch (error) {
      console.error('Erro ao deletar plano:', error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A');
      
      // Log mais detalhado para debugging
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
      }
      
      res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        details: process.env.NODE_ENV === 'development' ? {
          stack: error instanceof Error ? error.stack : undefined,
          name: error instanceof Error ? error.name : undefined
        } : undefined
      });
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

  // Desativar/ativar plano
  static async toggleStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Validar status
      if (!status || !['ativo', 'suspenso', 'cancelado'].includes(status)) {
        res.status(400).json({
          success: false,
          error: 'Status inválido',
          message: 'Status deve ser: ativo, suspenso ou cancelado'
        });
        return;
      }

      const plano = await Plano.findByPk(id);
      
      if (!plano) {
        res.status(404).json({
          success: false,
          error: 'Plano não encontrado'
        });
        return;
      }

      // Atualizar status
      await plano.update({ status });

      res.json({
        success: true,
        message: `Plano ${status === 'ativo' ? 'ativado' : status === 'suspenso' ? 'suspenso' : 'cancelado'} com sucesso!`,
        data: {
          id: plano.id,
          nome_plano: plano.nome_plano,
          status: plano.status
        }
      });
    } catch (error) {
      console.error('Erro ao alterar status do plano:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
}