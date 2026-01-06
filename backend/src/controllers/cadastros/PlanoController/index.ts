import { Request, Response } from 'express';
import { Plano } from '../../../models/cadastros/Plano';
import { Contrato } from '../../../models/contratos/Contrato';
import { Op, WhereOptions, Order } from 'sequelize';
import { sequelize } from '../../../config/database';
import { logger } from '../../../utils/logger';
import { cache } from '../../../utils/cache';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService';
import { setAuditData } from '../../../middleware/auditMiddleware';

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

      // Cache key para planos ativos sem filtros (dados mais consultados)
      const cacheKey = `planos:list:${page}:${limit}:${status || 'all'}:${tipo_servico || 'all'}:${search || ''}:${sortColumn || 'id'}:${sortDirection || 'DESC'}`;
      
      // Verificar cache apenas para listagem simples (sem busca)
      if (!search && !sortColumn) {
        const cached = cache.get(cacheKey);
        if (cached) {
          res.json(cached);
          return;
        }
      }

      // Construir filtros
      const whereConditions: Array<WhereOptions<Plano>> = [];
      
      if (search) {
        // Buscar apenas nos campos que correspondem às colunas da tabela
        whereConditions.push({
          [Op.or]: [
            { id: { [Op.like]: `%${search}%` } },
            { nome_plano: { [Op.like]: `%${search}%` } },
            { descricao: { [Op.like]: `%${search}%` } },
            { tipo_servico: { [Op.like]: `%${search}%` } },
            { valor_mensal: { [Op.like]: `%${search}%` } },
            { quantidade_usuarios: { [Op.like]: `%${search}%` } },
            { periodicidade: { [Op.like]: `%${search}%` } },
            { status: { [Op.like]: `%${search}%` } }
          ]
        } as WhereOptions<Plano>);
      }

      if (status) {
        whereConditions.push({ status: status as 'ativo' | 'inativo' });
      }

      if (tipo_servico) {
        whereConditions.push({ tipo_servico: tipo_servico as 'infraestrutura' | 'consultoria' });
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
          'quantidade_usuarios', 'valor_mensal', 'periodicidade', 'renovacao_automatica', 'data_inicio',
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

      // Buscar quantidade de contratos ativos por plano
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

      // Quando raw: true, Sequelize retorna objetos simples, não Models
      interface ContratoCountResult {
        plano_id: number;
        total: string | number;
      }
      const quantidadeClientesMap = (contratosAtivosPorPlano as unknown as ContratoCountResult[]).reduce((acc, item) => {
        acc[item.plano_id] = typeof item.total === 'string' ? parseInt(item.total, 10) : item.total;
        return acc;
      }, {} as Record<number, number>);

      // Interface para plano com quantidade de clientes adicionada
      interface PlanoWithCount extends Record<string, unknown> {
        quantidade_clientes: number;
        servicos_inclusos?: string | string[];
      }
      
      const planosProcessados: PlanoWithCount[] = planos.map(plano => {
        const planoJson = plano.toJSON();
        const planoData = { ...planoJson, quantidade_clientes: 0 } as PlanoWithCount;
        
        if (typeof planoData.servicos_inclusos === 'string') {
          try {
            planoData.servicos_inclusos = JSON.parse(planoData.servicos_inclusos);
          } catch {
            planoData.servicos_inclusos = [];
          }
        }
        const planoId = Number(plano.id);
        planoData.quantidade_clientes = quantidadeClientesMap[planoId] || 0;
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
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao listar planos', {
        context: 'PlanoController',
        action: 'list',
        error: errorMessage,
        stack: errorStack,
        query: req.query
      });
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
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao buscar plano', {
        context: 'PlanoController',
        action: 'getById',
        error: errorMessage,
        stack: errorStack,
        planoId: req.params.id
      });
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
      
      // Registrar auditoria
      await registrarCriacao(
        req,
        'Plano',
        plano.id,
        plano.toJSON() as Record<string, unknown>
      );
      
      // Invalidar cache de planos após criar
      cache.deletePattern('planos:list:.*');
      
      res.status(201).json(plano);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao criar plano', {
        context: 'PlanoController',
        action: 'create',
        error: errorMessage,
        stack: errorStack,
        body: req.body
      });
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
      
      // Capturar dados anteriores para auditoria
      const dadosAnteriores = existingPlano.toJSON() as Record<string, unknown>;
      
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
        'quantidade_usuarios' | 'valor_mensal' | 'periodicidade' | 'renovacao_automatica' | 'data_inicio' |
        'data_fim' | 'status' | 'observacoes';
      
      const allowedFields: AllowedField[] = [
        'nome_plano', 'descricao', 'tipo_servico', 'servicos_inclusos',
        'quantidade_usuarios', 'valor_mensal', 'periodicidade', 'renovacao_automatica', 'data_inicio',
        'data_fim', 'status', 'observacoes'
      ];
      
      interface PlanoUpdateData {
        nome_plano?: string;
        descricao?: string | null;
        tipo_servico?: 'infraestrutura' | 'consultoria';
        servicos_inclusos?: string[] | null;
        quantidade_usuarios?: number | null;
        valor_mensal?: number;
        periodicidade?: 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'bimestral' | 'quinzenal' | 'semanal' | null;
        renovacao_automatica?: boolean;
        data_inicio?: Date | null;
        data_fim?: Date | null;
        status?: 'ativo' | 'inativo';
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
              // Criar data local sem timezone para evitar problemas de conversão
              // Formato esperado: YYYY-MM-DD
              if (typeof dateValue === 'string') {
                const [year, month, day] = dateValue.split('-').map(Number);
                if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
                  const date = new Date(year, month - 1, day);
                  (updateData as Record<string, Date | null>)[fieldKey] = date;
                }
              } else if (dateValue instanceof Date) {
                (updateData as Record<string, Date | null>)[fieldKey] = dateValue;
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
      
      // Registrar auditoria
      if (plano) {
        const dadosNovos = plano.toJSON() as Record<string, unknown>;
        
        // Disponibilizar dados para o middleware
        setAuditData(req, dadosAnteriores, dadosNovos);
        
        await registrarAtualizacao(
          req,
          'Plano',
          plano.id,
          dadosAnteriores,
          dadosNovos
        );
      }
      
      // Invalidar cache de planos após atualizar
      cache.deletePattern('planos:list:.*');
      
      res.json({
        success: true,
        message: 'Plano atualizado com sucesso!',
        data: plano
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      const errorName = error instanceof Error ? error.name : undefined;
      
      logger.error('Erro ao atualizar plano', {
        context: 'PlanoController',
        action: 'update',
        error: errorMessage,
        stack: errorStack,
        name: errorName,
        planId: req.params.id,
        body: req.body
      });
      
      res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? {
          stack: errorStack,
          name: errorName
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
      
      // Capturar dados anteriores para auditoria
      const dadosAnteriores = plano.toJSON() as Record<string, unknown>;
      
      // Registrar auditoria
      await registrarExclusao(
        req,
        'Plano',
        plano.id,
        dadosAnteriores
      );
      
      await plano.destroy();
      
      res.json({
        success: true,
        message: 'Plano excluído com sucesso!'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      const errorName = error instanceof Error ? error.name : undefined;
      
      logger.error('Erro ao deletar plano', {
        context: 'PlanoController',
        action: 'delete',
        error: errorMessage,
        stack: errorStack,
        name: errorName,
        planoId: req.params.id
      });
      
      res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? {
          stack: errorStack,
          name: errorName
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
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao buscar planos ativos', {
        context: 'PlanoController',
        action: 'getAtivos',
        error: errorMessage,
        stack: errorStack
      });
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Desativar/ativar plano
  static async toggleStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Validar status
      if (!status || !['ativo', 'inativo'].includes(status)) {
        res.status(400).json({
          success: false,
          error: 'Status inválido',
          message: 'Status deve ser: ativo ou inativo'
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
        message: `Plano ${status === 'ativo' ? 'ativado' : 'desativado'} com sucesso!`,
        data: {
          id: plano.id,
          nome_plano: plano.nome_plano,
          status: plano.status
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao alterar status do plano', {
        context: 'PlanoController',
        action: 'toggleStatus',
        error: errorMessage,
        stack: errorStack,
        planoId: req.params.id,
        body: req.body
      });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage
      });
    }
  }
}