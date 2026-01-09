import { Request, Response } from 'express';
import { PlanoService } from '../../../services/cadastros/PlanoService';
import { logger } from '../../../utils/logger';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService/index';
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

      const result = await PlanoService.list({
        page,
        limit,
        search,
        status,
        tipo_servico,
        sortColumn,
        sortDirection
      });

      res.json(result);
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
      const plano = await PlanoService.getById(id);

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
      
      const plano = await PlanoService.create(body);
      
      // Registrar auditoria
      await registrarCriacao(
        req,
        'Plano',
        plano.id,
        plano.toJSON() as Record<string, unknown>
      );
      
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
      
      // Verificar se o plano existe e capturar dados anteriores para auditoria
      const existingPlano = await PlanoService.getById(id);
      if (!existingPlano) {
        res.status(404).json({
          success: false,
          error: 'Plano não encontrado'
        });
        return;
      }
      
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
      
      const plano = await PlanoService.update(id, req.body);
      
      // Registrar auditoria
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
        details: !__dirname.includes('dist') ? {
          stack: errorStack,
          name: errorName
        } : undefined
      });
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const plano = await PlanoService.getById(id);
      
      if (!plano) {
        res.status(404).json({ 
          success: false,
          error: 'Plano não encontrado' 
        });
        return;
      }
      
      // Capturar dados anteriores para auditoria
      const dadosAnteriores = plano.toJSON() as Record<string, unknown>;
      
      try {
        await PlanoService.delete(id);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        if (errorMessage.includes('título(s) associado(s)')) {
          res.status(409).json({ 
            success: false,
            error: 'Não é possível excluir plano',
            message: errorMessage
          });
          return;
        }
        if (errorMessage.includes('contrato(s)')) {
          res.status(409).json({ 
            success: false,
            error: 'Não é possível excluir plano',
            message: errorMessage
          });
          return;
        }
        throw error;
      }
      
      // Registrar auditoria
      await registrarExclusao(
        req,
        'Plano',
        plano.id,
        dadosAnteriores
      );
      
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
        details: !__dirname.includes('dist') ? {
          stack: errorStack,
          name: errorName
        } : undefined
      });
    }
  }

  static async findAtivos(req: Request, res: Response): Promise<void> {
    try {
      const planos = await PlanoService.findAtivos();

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

      const plano = await PlanoService.updateStatus(id, status);

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