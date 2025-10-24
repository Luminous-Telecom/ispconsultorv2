import { Request, Response } from 'express';
import { TermoContrato } from '../models/TermoContrato';
import { Contrato } from '../models/Contrato';
import { Op } from 'sequelize';

export class TermoContratoController {
  // Listar termos de um contrato específico
  static async getByContrato(req: Request, res: Response): Promise<void> {
    try {
      const { contratoId } = req.params;
      
      if (!contratoId) {
        res.status(400).json({ 
          success: false, 
          message: 'ID do contrato é obrigatório' 
        });
        return;
      }

      const termos = await TermoContrato.findByContrato(parseInt(contratoId));
      
      res.json({
        success: true,
        data: termos
      });
    } catch (error) {
      console.error('Erro ao buscar termos do contrato:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Buscar termo específico por ID
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const termo = await TermoContrato.findByPk(id);
      
      if (!termo) {
        res.status(404).json({
          success: false,
          message: 'Termo não encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: termo
      });
    } catch (error) {
      console.error('Erro ao buscar termo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Criar novo termo para um contrato
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { contratoId } = req.params;
      const { tipo_termo, conteudo, observacoes } = req.body;

      // Validações
      if (!contratoId || !tipo_termo || !conteudo) {
        res.status(400).json({
          success: false,
          message: 'Contrato ID, tipo do termo e conteúdo são obrigatórios'
        });
        return;
      }

      // Verificar se o contrato existe
      const contrato = await Contrato.findByPk(contratoId);
      if (!contrato) {
        res.status(404).json({
          success: false,
          message: 'Contrato não encontrado'
        });
        return;
      }

      // Verificar se já existe um termo ativo do mesmo tipo para este contrato
      const termoExistente = await TermoContrato.findOne({
        where: {
          contrato_id: contratoId,
          tipo_termo,
          ativo: true
        }
      });

      if (termoExistente) {
        res.status(400).json({
          success: false,
          message: `Já existe um termo ativo do tipo "${tipo_termo}" para este contrato`
        });
        return;
      }

      const termo = await TermoContrato.create({
        contrato_id: parseInt(contratoId),
        tipo_termo,
        conteudo,
        observacoes,
        ativo: true
      });

      res.status(201).json({
        success: true,
        message: 'Termo criado com sucesso',
        data: termo
      });
    } catch (error) {
      console.error('Erro ao criar termo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Atualizar termo existente
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { conteudo, observacoes, ativo } = req.body;

      const termo = await TermoContrato.findByPk(id);
      
      if (!termo) {
        res.status(404).json({
          success: false,
          message: 'Termo não encontrado'
        });
        return;
      }

      // Atualizar apenas campos permitidos
      if (conteudo !== undefined) termo.conteudo = conteudo;
      if (observacoes !== undefined) termo.observacoes = observacoes;
      if (ativo !== undefined) termo.ativo = ativo;

      await termo.save();

      res.json({
        success: true,
        message: 'Termo atualizado com sucesso',
        data: termo
      });
    } catch (error) {
      console.error('Erro ao atualizar termo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Marcar termo como aceito
  static async marcarComoAceito(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { aceito_por } = req.body;

      if (!aceito_por) {
        res.status(400).json({
          success: false,
          message: 'Nome de quem aceitou é obrigatório'
        });
        return;
      }

      const termo = await TermoContrato.findByPk(id);
      
      if (!termo) {
        res.status(404).json({
          success: false,
          message: 'Termo não encontrado'
        });
        return;
      }

      await termo.marcarComoAceito(aceito_por);

      res.json({
        success: true,
        message: 'Termo marcado como aceito',
        data: termo
      });
    } catch (error) {
      console.error('Erro ao marcar termo como aceito:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Desativar termo (soft delete)
  static async deactivate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const termo = await TermoContrato.findByPk(id);
      
      if (!termo) {
        res.status(404).json({
          success: false,
          message: 'Termo não encontrado'
        });
        return;
      }

      termo.ativo = false;
      await termo.save();

      res.json({
        success: true,
        message: 'Termo desativado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao desativar termo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Deletar termo permanentemente
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const termo = await TermoContrato.findByPk(id);
      
      if (!termo) {
        res.status(404).json({
          success: false,
          message: 'Termo não encontrado'
        });
        return;
      }

      await termo.destroy();

      res.json({
        success: true,
        message: 'Termo deletado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao deletar termo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Listar todos os termos ativos
  static async getAtivos(req: Request, res: Response): Promise<void> {
    try {
      const termos = await TermoContrato.findAll({
        where: { ativo: true },
        include: [
          {
            association: 'contrato',
            include: [
              { association: 'cliente' },
              { association: 'plano' }
            ]
          }
        ],
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: termos
      });
    } catch (error) {
      console.error('Erro ao buscar termos ativos:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}
