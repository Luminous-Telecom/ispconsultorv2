import { Request, Response } from 'express';
import { TermoContrato } from '../../../models/contratos/TermoContrato';
import { TermoContratoService } from '../../../services/contratos/TermoContratoService';
import { ContratoService } from '../../../services/contratos/ContratoService';
import { ModeloDocumentoService } from '../../../services/documentos/ModeloDocumentoService';
import { logger } from '../../../utils/logger';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService/index';
import { setAuditData } from '../../../middleware/auditMiddleware';
import type { AuthenticatedRequest } from '../../../types/auth';

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

      const termos = await TermoContratoService.getByContrato(parseInt(contratoId));
      
      res.json({
        success: true,
        data: termos
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao buscar termos do contrato', {
        context: 'TermoContratoController',
        action: 'getByContrato',
        error: errorMessage,
        stack: errorStack,
        contratoId: req.params.contratoId
      });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: errorMessage
      });
    }
  }

  // Buscar termo específico por ID
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const termo = await TermoContratoService.getById(id);
      
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
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao buscar termo', {
        context: 'TermoContratoController',
        action: 'show',
        error: errorMessage,
        stack: errorStack,
        id: req.params.id
      });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Criar novo termo para um contrato
  static async create(req: Request, res: Response): Promise<void> {
    const { contratoId } = req.params;
    try {
      const { modelo_documento_id, tipo_termo, assinado } = req.body;

      // Validações
      if (!contratoId) {
        res.status(400).json({
          success: false,
          message: 'Contrato ID é obrigatório'
        });
        return;
      }

      // Se não há modelo_documento_id, retornar erro
      if (!modelo_documento_id) {
        res.status(400).json({
          success: false,
          message: 'É obrigatório selecionar um modelo de termo'
        });
        return;
      }

      // Verificar se o contrato existe
      const contrato = await ContratoService.getById(contratoId);
      if (!contrato) {
        res.status(404).json({
          success: false,
          message: 'Contrato não encontrado'
        });
        return;
      }

      // Buscar o modelo de documento (termo)
      const modeloDocumento = await ModeloDocumentoService.getById(modelo_documento_id);
      if (!modeloDocumento) {
        res.status(404).json({
          success: false,
          message: 'Modelo de termo não encontrado'
        });
        return;
      }

      // O tipo_termo é passado no body ou usa 'adesao' como padrão
      // O modelo_documento agora é sempre do tipo 'termo'
      const tipoTermo = req.body.tipo_termo || 'adesao';

      // Determinar qual conteúdo usar baseado no tipo de termo
      let conteudoTermo = '';
      if (tipoTermo === 'adesao') {
        conteudoTermo = modeloDocumento.conteudo_adesao || modeloDocumento.conteudo || '';
      } else if (tipoTermo === 'permanencia') {
        conteudoTermo = modeloDocumento.conteudo_permanencia || modeloDocumento.conteudo || '';
      } else {
        conteudoTermo = modeloDocumento.conteudo || '';
      }

      // Validar que temos conteúdo
      if (!conteudoTermo || conteudoTermo.trim() === '') {
        res.status(400).json({
          success: false,
          message: `O modelo de termo não possui conteúdo para o tipo '${tipoTermo}'. Verifique se o modelo possui conteúdo cadastrado.`
        });
        return;
      }

      const termo = await TermoContratoService.create({
        contrato_id: parseInt(contratoId),
        modelo_documento_id: modelo_documento_id,
        tipo_termo: tipoTermo as 'adesao' | 'permanencia' | 'cancelamento' | 'alteracao',
        conteudo: conteudoTermo,
        assinado: assinado || 'NAO',
        ativo: true
      });

      await registrarCriacao(
        req as AuthenticatedRequest,
        'TermoContrato',
        termo.id,
        termo.toJSON() as Record<string, unknown>
      );

      res.status(201).json({
        success: true,
        message: 'Termo criado com sucesso',
        data: termo
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      // Tratar erro de constraint de unicidade
      if (error instanceof Error && (error as any).name === 'SequelizeUniqueConstraintError') {
        logger.warn('Tentativa de criar termo duplicado', {
          context: 'TermoContratoController',
          action: 'create',
          contratoId,
          tipoTermo: req.body.tipo_termo || 'adesao',
          error: errorMessage
        });
        res.status(409).json({
          success: false,
          message: `Já existe um termo do tipo '${req.body.tipo_termo || 'adesao'}' para este contrato. Remova a constraint UNIQUE do banco de dados para permitir múltiplos termos do mesmo tipo.`
        });
        return;
      }
      
      logger.error('Erro ao criar termo', {
        context: 'TermoContratoController',
        action: 'create',
        error: errorMessage,
        stack: errorStack,
        body: req.body
      });
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
      const { ativo, modelo_documento_id, assinado } = req.body;

      const termo = await TermoContratoService.getById(id);
      
      if (!termo) {
        res.status(404).json({
          success: false,
          message: 'Termo não encontrado'
        });
        return;
      }

      const dadosAnteriores = termo.toJSON();
      
      // Atualizar apenas campos permitidos
      if (ativo !== undefined) termo.ativo = ativo;
      if (modelo_documento_id !== undefined) termo.modelo_documento_id = modelo_documento_id;
      if (assinado !== undefined) termo.assinado = assinado;

      await termo.save();
      await termo.reload();

      const dadosNovos = termo.toJSON() as Record<string, unknown>;
      
      // Disponibilizar dados para o middleware
      setAuditData(req, dadosAnteriores as Record<string, unknown>, dadosNovos);

      await registrarAtualizacao(
        req as AuthenticatedRequest,
        'TermoContrato',
        termo.id,
        dadosAnteriores as Record<string, unknown>,
        dadosNovos
      );

      res.json({
        success: true,
        message: 'Termo atualizado com sucesso',
        data: termo
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao atualizar termo', {
        context: 'TermoContratoController',
        action: 'update',
        error: errorMessage,
        stack: errorStack,
        id: req.params.id,
        body: req.body
      });
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

      const termo = await TermoContratoService.getById(id);
      
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
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao marcar termo como aceito', {
        context: 'TermoContratoController',
        action: 'markAccepted',
        error: errorMessage,
        stack: errorStack,
        id: req.params.id,
        body: req.body
      });
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

      const termo = await TermoContratoService.getById(id);
      
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
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao desativar termo', {
        context: 'TermoContratoController',
        action: 'deactivate',
        error: errorMessage,
        stack: errorStack,
        id: req.params.id
      });
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

      const termo = await TermoContratoService.getById(id);
      
      if (!termo) {
        res.status(404).json({
          success: false,
          message: 'Termo não encontrado'
        });
        return;
      }

      const dadosAnteriores = termo.toJSON() as Record<string, unknown>;
      
      // Disponibilizar dados para o middleware
      setAuditData(req, dadosAnteriores);
      
      await TermoContratoService.delete(id);

      await registrarExclusao(
        req as AuthenticatedRequest,
        'TermoContrato',
        termo.id,
        dadosAnteriores
      );

      res.json({
        success: true,
        message: 'Termo deletado com sucesso'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao deletar termo', {
        context: 'TermoContratoController',
        action: 'delete',
        error: errorMessage,
        stack: errorStack,
        id: req.params.id
      });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Listar todos os termos ativos
  static async getAtivos(req: Request, res: Response): Promise<void> {
    try {
      const termos = await TermoContratoService.list(true);

      res.json({
        success: true,
        data: termos
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao buscar termos ativos', {
        context: 'TermoContratoController',
        action: 'getAtivos',
        error: errorMessage,
        stack: errorStack
      });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}
