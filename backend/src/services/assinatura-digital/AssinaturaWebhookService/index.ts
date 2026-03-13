import { Request } from 'express';
import { logger } from '../../../utils/logger';
import { AssinaturaDigitalService } from '../AssinaturaDigitalService';
import { AssinafyService } from '../AssinafyService';
import { ZapsignService } from '../ZapsignService';
import { TermoContratoService } from '../../contratos/TermoContratoService';
import { registrarAtualizacao } from '../../sistema/AuditoriaService';
import { registrarAtualizacaoElasticsearch } from '../../elasticsearch/ElasticsearchAuditService';

export class AssinaturaWebhookService {
  /**
   * Processa webhook do Assinafy
   */
  static async processAssinafyWebhook(req: Request): Promise<void> {
    const { event, document } = req.body;

    if (!event || !document) {
      throw new Error('Dados do webhook inválidos');
    }

    const documentId = document.id || document.document_id;
    if (!documentId) {
      throw new Error('ID do documento não encontrado no webhook');
    }

    const assinatura = await AssinaturaDigitalService.getByApiDocumentId(documentId);
    if (!assinatura) {
      logger.warn('Assinatura não encontrada para documentId', { documentId });
      return;
    }

    const statusMap: Record<string, string> = {
      'document.created': 'pendente',
      'document.signed': 'assinado',
      'document.refused': 'recusado',
      'document.cancelled': 'cancelado',
      'document.expired': 'expirado'
    };

    const novoStatus = (statusMap[event] || assinatura.status) as 'pendente' | 'enviado' | 'assinado' | 'cancelado' | 'expirado' | 'erro';

    if (novoStatus !== assinatura.status) {
      await assinatura.update({ status: novoStatus });

      const reqSimulado = req as unknown as Request;
      const dadosAnteriores = { status: assinatura.status };
      const dadosNovos = { status: novoStatus };

      try {
        await registrarAtualizacao(
          reqSimulado,
          'AssinaturaDigital',
          assinatura.id,
          dadosAnteriores,
          dadosNovos,
          `Status atualizado via webhook Assinafy: ${event}`
        );

        const empresaId = (assinatura as { empresa_id?: number | null }).empresa_id ?? null;
        await registrarAtualizacaoElasticsearch(
          reqSimulado,
          'AssinaturaDigital',
          assinatura.id,
          dadosAnteriores,
          dadosNovos,
          `Status atualizado via webhook Assinafy: ${event}`,
          empresaId,
          'webhook'
        );
      } catch (error) {
        logger.error('Erro ao registrar auditoria de atualização de assinatura', { error });
      }

      if (novoStatus === 'assinado') {
        // No contexto de webhook, o documento já foi processado
        // Apenas o status foi atualizado acima
        logger.info('Documento assinado via webhook - status atualizado', { documentId });
      }
    }
  }

  /**
   * Processa webhook do Zapsign
   */
  static async processZapsignWebhook(req: Request): Promise<void> {
    const { event, document } = req.body;

    if (!event || !document) {
      throw new Error('Dados do webhook inválidos');
    }

    const documentId = document.id || document.document_id;
    if (!documentId) {
      throw new Error('ID do documento não encontrado no webhook');
    }

    const assinatura = await AssinaturaDigitalService.getByApiDocumentId(documentId);
    if (!assinatura) {
      logger.warn('Assinatura não encontrada para documentId', { documentId });
      return;
    }

    const statusMap: Record<string, 'pendente' | 'enviado' | 'assinado' | 'cancelado' | 'expirado' | 'erro'> = {
      'document.created': 'pendente',
      'document.signed': 'assinado',
      'document.refused': 'erro',
      'document.cancelled': 'cancelado',
      'document.expired': 'expirado'
    };

    const novoStatus = (statusMap[event] || assinatura.status) as 'pendente' | 'enviado' | 'assinado' | 'cancelado' | 'expirado' | 'erro';

    if (novoStatus !== assinatura.status) {
      await assinatura.update({ status: novoStatus });

      const reqSimulado = req as unknown as Request;
      const dadosAnteriores = { status: assinatura.status };
      const dadosNovos = { status: novoStatus };

      try {
        await registrarAtualizacao(
          reqSimulado,
          'AssinaturaDigital',
          assinatura.id,
          dadosAnteriores,
          dadosNovos,
          `Status atualizado via webhook Zapsign: ${event}`
        );

        const empresaId = (assinatura as { empresa_id?: number | null }).empresa_id ?? null;
        await registrarAtualizacaoElasticsearch(
          reqSimulado,
          'AssinaturaDigital',
          assinatura.id,
          dadosAnteriores,
          dadosNovos,
          `Status atualizado via webhook Zapsign: ${event}`,
          empresaId,
          'webhook'
        );
      } catch (error) {
        logger.error('Erro ao registrar auditoria de atualização de assinatura', { error });
      }

      if (novoStatus === 'assinado') {
        // No contexto de webhook, o documento já foi processado
        // Apenas o status foi atualizado acima
        logger.info('Documento assinado via webhook Zapsign - status atualizado', { documentId });
      }
    }
  }

  /**
   * Processa webhook genérico (detecta provider automaticamente)
   */
  static async processWebhook(req: Request): Promise<void> {
    const provider = req.headers['x-provider'] || req.body.provider;

    if (provider === 'assinafy') {
      await this.processAssinafyWebhook(req);
    } else if (provider === 'zapsign') {
      await this.processZapsignWebhook(req);
    } else {
      // Tentar detectar pelo formato do payload
      if (req.body.event && req.body.document) {
        // Formato Assinafy/Zapsign
        const documentId = req.body.document.id || req.body.document.document_id;
        if (documentId) {
          const assinatura = await AssinaturaDigitalService.getByApiDocumentId(documentId);
          if (assinatura) {
            // Tentar ambos os providers
            try {
              await this.processAssinafyWebhook(req);
            } catch {
              try {
                await this.processZapsignWebhook(req);
              } catch (error) {
                logger.error('Erro ao processar webhook', { error });
                throw error;
              }
            }
          }
        }
      }
    }
  }
}
