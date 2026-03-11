import { Request, Response } from 'express';
import { TermoContrato } from '../../../models/contratos/TermoContrato';
import { TermoContratoService } from '../../../services/contratos/TermoContratoService';
import { ContratoService } from '../../../services/contratos/ContratoService';
import { ModeloDocumentoService } from '../../../services/documentos/ModeloDocumentoService';
import { logger } from '../../../utils/logger';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService/index';
import { setAuditData } from '../../../middleware/auditMiddleware';
import type { AuthenticatedRequest } from '../../../types/auth';
import { sendSuccess, sendError, sendNotFound, sendValidationError } from '../../../utils/responseUtils';

export class TermoContratoController {
  // Listar termos de um contrato específico
  static async getByContrato(req: Request, res: Response): Promise<void> {
    try {
      const { contratoId } = req.params;
      const { sortColumn, sortDirection } = req.query;
      
      if (!contratoId) {
        sendValidationError(res, 'ID do contrato é obrigatório');
        return;
      }

      const termos = await TermoContratoService.getByContrato(parseInt(contratoId), {
        sortColumn: sortColumn as string | undefined,
        sortDirection: (sortDirection as 'ASC' | 'DESC') || undefined
      });
      
      sendSuccess(res, termos);
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao buscar termos do contrato', 500, true, {
        context: 'TermoContratoController',
        action: 'getByContrato',
        contratoId: req.params.contratoId
      });
    }
  }

  // Buscar termo específico por ID
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const termo = await TermoContratoService.getById(id);
      
      if (!termo) {
        sendNotFound(res, 'Termo não encontrado');
        return;
      }

      sendSuccess(res, termo);
    } catch (error) {
      sendError(res, error, 'Erro ao buscar termo', 500, true, {
        context: 'TermoContratoController',
        action: 'show',
        id: req.params.id
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
        sendValidationError(res, 'Contrato ID é obrigatório');
        return;
      }

      // Se não há modelo_documento_id, retornar erro
      if (!modelo_documento_id) {
        sendValidationError(res, 'É obrigatório selecionar um modelo de termo');
        return;
      }

      // Verificar se o contrato existe
      const contrato = await ContratoService.getById(contratoId);
      if (!contrato) {
        sendNotFound(res, 'Contrato não encontrado');
        return;
      }

      // Buscar o modelo de documento (termo) e verificar se pertence à empresa do contrato
      const modeloDocumento = await ModeloDocumentoService.getById(modelo_documento_id);
      if (!modeloDocumento) {
        sendNotFound(res, 'Modelo de termo não encontrado');
        return;
      }
      const empresaIdContrato = contrato.empresa_id ?? null;
      const modeloEmpresaId = (modeloDocumento as { empresa_id?: number | null }).empresa_id;
      const pertenceEmpresa = empresaIdContrato == null || modeloEmpresaId === empresaIdContrato || modeloEmpresaId === null;
      if (!pertenceEmpresa) {
        sendNotFound(res, 'Modelo de termo não encontrado');
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
        sendValidationError(res, `O modelo de termo não possui conteúdo para o tipo '${tipoTermo}'. Verifique se o modelo possui conteúdo cadastrado.`);
        return;
      }

      const termo = await TermoContratoService.create({
        empresa_id: contrato.empresa_id ?? null,
        contrato_id: parseInt(contratoId),
        modelo_documento_id: modelo_documento_id,
        tipo_termo: tipoTermo as 'adesao' | 'permanencia' | 'cancelamento' | 'alteracao',
        conteudo: conteudoTermo,
        assinado: assinado || 'NAO',
        ativo: true
      });

      try {
        await registrarCriacao(
          req as AuthenticatedRequest,
          'TermoContrato',
          termo.id,
          termo.toJSON() as Record<string, unknown>
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }

      sendSuccess(res, termo, 'Termo criado com sucesso', 201);
    } catch (error) {
      // Tratar erro de constraint de unicidade
      if (error instanceof Error && (error as any).name === 'SequelizeUniqueConstraintError') {
        logger.warn('Tentativa de criar termo duplicado', {
          context: 'TermoContratoController',
          action: 'create',
          contratoId,
          tipoTermo: req.body.tipo_termo || 'adesao'
        });
        sendError(res, error, `Já existe um termo do tipo '${req.body.tipo_termo || 'adesao'}' para este contrato. Remova a constraint UNIQUE do banco de dados para permitir múltiplos termos do mesmo tipo.`, 409, false);
        return;
      }
      
      sendError(res, error, 'Erro ao criar termo', 500, true, {
        context: 'TermoContratoController',
        action: 'create',
        body: req.body
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
        sendNotFound(res, 'Termo não encontrado');
        return;
      }

      const dadosAnteriores = termo.toJSON();
      
      // Atualizar apenas campos permitidos
      if (ativo !== undefined) termo.ativo = ativo;
      if (modelo_documento_id !== undefined) {
        const modeloDoc = await ModeloDocumentoService.getById(modelo_documento_id);
        const empresaIdTermo = termo.empresa_id ?? null;
        const pertenceEmpresa = !modeloDoc ? false : empresaIdTermo == null || (modeloDoc as { empresa_id?: number | null }).empresa_id === empresaIdTermo || (modeloDoc as { empresa_id?: number | null }).empresa_id === null;
        if (!modeloDoc || !pertenceEmpresa) {
          sendNotFound(res, 'Modelo de termo não encontrado');
          return;
        }
        termo.modelo_documento_id = modelo_documento_id;
      }
      if (assinado !== undefined) termo.assinado = assinado;

      await termo.save();
      await termo.reload();

      const dadosNovos = termo.toJSON() as Record<string, unknown>;
      
      // Disponibilizar dados para o middleware
      setAuditData(req, dadosAnteriores as Record<string, unknown>, dadosNovos);

      try {
        await registrarAtualizacao(
          req as AuthenticatedRequest,
          'TermoContrato',
          termo.id,
          dadosAnteriores as Record<string, unknown>,
          dadosNovos
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }

      sendSuccess(res, termo, 'Termo atualizado com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao atualizar termo', 500, true, {
        context: 'TermoContratoController',
        action: 'update',
        id: req.params.id,
        body: req.body
      });
    }
  }

  // Marcar termo como aceito
  static async marcarComoAceito(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { aceito_por } = req.body;

      if (!aceito_por) {
        sendValidationError(res, 'Nome de quem aceitou é obrigatório');
        return;
      }

      const termo = await TermoContratoService.getById(id);
      
      if (!termo) {
        sendNotFound(res, 'Termo não encontrado');
        return;
      }

      await termo.marcarComoAceito(aceito_por);

      sendSuccess(res, termo, 'Termo marcado como aceito');
    } catch (error) {
      sendError(res, error, 'Erro ao marcar termo como aceito', 500, true, {
        context: 'TermoContratoController',
        action: 'markAccepted',
        id: req.params.id,
        body: req.body
      });
    }
  }

  // Desativar termo (soft delete)
  static async deactivate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const termo = await TermoContratoService.getById(id);
      
      if (!termo) {
        sendNotFound(res, 'Termo não encontrado');
        return;
      }

      termo.ativo = false;
      await termo.save();

      sendSuccess(res, undefined, 'Termo desativado com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao desativar termo', 500, true, {
        context: 'TermoContratoController',
        action: 'deactivate',
        id: req.params.id
      });
    }
  }

  // Deletar termo permanentemente
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const termo = await TermoContratoService.getById(id);
      
      if (!termo) {
        sendNotFound(res, 'Termo não encontrado');
        return;
      }

      const dadosAnteriores = termo.toJSON() as Record<string, unknown>;
      
      // Disponibilizar dados para o middleware
      setAuditData(req, dadosAnteriores);
      
      await TermoContratoService.delete(id);

      try {
        await registrarExclusao(
          req as AuthenticatedRequest,
          'TermoContrato',
          termo.id,
          dadosAnteriores
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }

      sendSuccess(res, undefined, 'Termo deletado com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao deletar termo', 500, true, {
        context: 'TermoContratoController',
        action: 'delete',
        id: req.params.id
      });
    }
  }

  // Listar todos os termos ativos
  static async getAtivos(req: Request, res: Response): Promise<void> {
    try {
      const termos = await TermoContratoService.list(true);

      sendSuccess(res, termos);
    } catch (error) {
      sendError(res, error, 'Erro ao buscar termos ativos', 500, true, {
        context: 'TermoContratoController',
        action: 'getAtivos'
      });
    }
  }
}
