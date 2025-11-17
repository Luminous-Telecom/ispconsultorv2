import { Request, Response } from 'express';
import { Plano } from '../models/Plano';
import { Contrato } from '../models/Contrato';
import { Op, WhereOptions, Order } from 'sequelize';
import { sequelize } from '../config/database';

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
      const whereConditions: Array<WhereOptions<Plano>> = [];
      
      if (search) {
        whereConditions.push({
          [Op.or]: [
            { nome_plano: { [Op.like]: `%${search}%` } },
            { descricao: { [Op.like]: `%${search}%` } }
          ]
        } as WhereOptions<Plano>);
      }

      if (status) {
        whereConditions.push({ status: status as 'ativo' | 'suspenso' | 'cancelado' });
      }

      if (tipo_servico) {
        whereConditions.push({ tipo_servico: tipo_servico as 'internet' | 'telefonia' | 'tv' | 'suporte' | 'infraestrutura' | 'consultoria' | 'outros' });
      }

      const where: WhereOptions<Plano> = whereConditions.length > 0
        ? { [Op.and]: whereConditions } as WhereOptions<Plano>
        : {};

      // Construir ordenação
      let order: Order = [['id', 'DESC']]; // Padrão: Maior ID para o menor
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

      // Contar total de planos sem includes para evitar duplicatas
      const count = await Plano.count({ where });
      
      // Buscar planos com includes
      const planos = await Plano.findAll({
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
            through: { 
              attributes: ['desconto_percentual', 'desconto_valor', 'valor_final', 'status']
            },
            required: false // Incluir planos mesmo sem clientes
          }
        ],
        order,
        limit,
        offset,
        raw: false
      });

      // Garantir que servicos_inclusos seja um array e adicionar quantidade de clientes
      // Buscar quantidade de contratos ativos para cada plano
      const planoIds = planos.map(p => p.id);
      const contratosAtivosPorPlano = await Contrato.findAll({
        attributes: [
          'plano_id',
          [sequelize.fn('COUNT', sequelize.col('id')), 'total']
        ],
        where: {
          plano_id: { [Op.in]: planoIds },
          status: 'ativo'
        },
        group: ['plano_id'],
        raw: true
      });

      const quantidadeClientesMap = new Map<number, number>();
      contratosAtivosPorPlano.forEach((item: any) => {
        quantidadeClientesMap.set(item.plano_id, parseInt(item.total as string, 10));
      });

      const planosProcessados = planos.map(plano => {
        const planoData = plano.toJSON();
        if (typeof planoData.servicos_inclusos === 'string') {
          try {
            planoData.servicos_inclusos = JSON.parse(planoData.servicos_inclusos);
          } catch {
            planoData.servicos_inclusos = [];
          }
        }
        // Adicionar quantidade de clientes associados ao plano (apenas contratos ativos)
        (planoData as any).quantidade_clientes = quantidadeClientesMap.get(plano.id) || 0;
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
        } catch {
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
      const body = { ...req.body };
      
      // Normalizar strings vazias e 'Invalid date' para null
      if (body.data_inicio === '' || body.data_inicio === 'Invalid date') {
        body.data_inicio = null;
      }
      if (body.data_fim === '' || body.data_fim === 'Invalid date') {
        body.data_fim = null;
      }
      
      // Normalizar descricao undefined para null
      if (body.descricao === undefined) {
        body.descricao = null;
      }
      
      const plano = await Plano.create(body);
      res.status(201).json(plano);
    } catch (error) {
      console.error('Erro ao criar plano:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
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
      type AllowedField = 'nome_plano' | 'descricao' | 'tipo_servico' | 'servicos_inclusos' |
        'quantidade_usuarios' | 'valor_mensal' | 'desconto_percentual' | 'desconto_valor' |
        'desconto_ativo' | 'periodicidade' | 'renovacao_automatica' | 'data_inicio' |
        'data_fim' | 'status' | 'observacoes';
      
      const allowedFields: AllowedField[] = [
        'nome_plano', 'descricao', 'tipo_servico', 'servicos_inclusos',
        'quantidade_usuarios', 'valor_mensal', 'desconto_percentual', 'desconto_valor',
        'desconto_ativo', 'periodicidade', 'renovacao_automatica', 'data_inicio',
        'data_fim', 'status', 'observacoes'
      ];
      
      interface PlanoUpdateData {
        nome_plano?: string;
        descricao?: string | null;
        tipo_servico?: 'internet' | 'telefonia' | 'tv' | 'suporte' | 'infraestrutura' | 'consultoria' | 'outros';
        servicos_inclusos?: string[] | null;
        quantidade_usuarios?: number | null;
        valor_mensal?: number;
        desconto_percentual?: number | null;
        desconto_valor?: number | null;
        desconto_ativo?: boolean;
        periodicidade?: 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'bimestral' | 'quinzenal' | 'semanal' | null;
        renovacao_automatica?: boolean;
        data_inicio?: Date | null;
        data_fim?: Date | null;
        status?: 'ativo' | 'suspenso' | 'cancelado';
        observacoes?: string | null;
      }
      
      const updateData: PlanoUpdateData = {};
      Object.keys(req.body).forEach(key => {
        if (allowedFields.includes(key as AllowedField)) {
          const fieldKey = key as AllowedField;
          // Validar datas
          if (fieldKey === 'data_inicio' || fieldKey === 'data_fim') {
            const dateValue = req.body[fieldKey];
            if (dateValue && dateValue !== '' && dateValue !== 'Invalid date') {
              // Verificar se é uma data válida e converter para Date
              const date = new Date(dateValue);
              if (!isNaN(date.getTime())) {
                (updateData as Record<string, Date | null>)[fieldKey] = date;
              }
            }
          } else {
            // Normalizar undefined para null
            const value = req.body[fieldKey];
            if (value === undefined) {
              (updateData as Record<string, unknown>)[fieldKey] = null;
            } else {
              (updateData as Record<string, unknown>)[fieldKey] = value;
            }
          }
        }
      });
      
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
      if (!status || !['ativo', 'inativo', 'cancelado'].includes(status)) {
        res.status(400).json({
          success: false,
          error: 'Status inválido',
          message: 'Status deve ser: ativo, inativo ou cancelado'
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
        message: `Plano ${status === 'ativo' ? 'ativado' : status === 'inativo' ? 'desativado' : 'cancelado'} com sucesso!`,
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