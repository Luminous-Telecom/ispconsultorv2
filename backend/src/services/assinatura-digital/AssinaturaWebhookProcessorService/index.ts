import { Request } from 'express';
import { logger } from '../../../utils/logger';
import { AssinaturaDigitalService } from '../AssinaturaDigitalService';
import { TermoContratoService } from '../../contratos/TermoContratoService';
import { ClienteArquivoService } from '../../cadastros';
import { AssinaturaEnvioService } from '../AssinaturaEnvioService';
import { registrarAtualizacaoElasticsearch, registrarCriacaoElasticsearch } from '../../elasticsearch/ElasticsearchAuditService';

interface ISignatureService {
  baixarPdfAssinado(documentId: string, url?: string): Promise<Buffer | null>;
}

export class AssinaturaWebhookProcessorService {
  /**
   * Processa webhook em background
   */
  static async processarWebhookEmBackground(
    documentId: string,
    status: string | undefined,
    signedPdf?: string,
    event?: string,
    assignmentCompletedCount?: number,
    assignmentSignerCount?: number,
    signingUrl?: string,
    certificatedPdfUrl?: string,
    provider?: 'assinafy' | 'zapsign',
    req?: Request
  ): Promise<void> {
    const assinatura = await AssinaturaDigitalService.getByApiDocumentId(documentId);
    if (!assinatura) {
      return;
    }

    if (signingUrl && !assinatura.url_assinatura) {
      const dadosAnteriores = assinatura.toJSON() as Record<string, unknown>;
      await AssinaturaDigitalService.updateById(assinatura.id, { url_assinatura: signingUrl });
      await assinatura.reload();
      const dadosNovos = assinatura.toJSON() as Record<string, unknown>;
      
      if (req) {
        try {
          await registrarAtualizacaoElasticsearch(
            req,
            'AssinaturaDigital',
            assinatura.id,
            dadosAnteriores,
            dadosNovos,
            `Atualização via webhook (URL assinatura) - Provider: ${provider || 'desconhecido'}`
          );
        } catch (auditError) {
          logger.warn('Erro ao registrar auditoria de webhook (URL assinatura)', {
            assinatura_id: assinatura.id,
            error: auditError instanceof Error ? auditError.message : 'Erro desconhecido'
          });
        }
      }
    }

    const isAssinado = 
      status === 'certificated' || 
      event === 'document_ready' ||
      status === 'signed' ||
      status === 'completed' ||
      event === 'doc_signed' ||
      (provider === 'zapsign' && (status === 'signed' || status === 'completed' || event === 'doc_signed'));

    if (!isAssinado) {
      if (status === 'canceled' || event === 'document.canceled') {
        await this.processarCancelamento(assinatura, req, provider);
      }
      return;
    }

    if (assinatura.status === 'assinado') {
      return;
    }

    await this.processarAssinaturaCompleta(
      assinatura,
      signedPdf,
      certificatedPdfUrl,
      documentId,
      provider,
      req
    );
  }

  /**
   * Processa cancelamento de assinatura
   */
  private static async processarCancelamento(
    assinatura: any,
    req: Request | undefined,
    provider?: 'assinafy' | 'zapsign'
  ): Promise<void> {
    const dadosAnteriores = assinatura.toJSON() as Record<string, unknown>;
    assinatura.status = 'cancelado';
    await assinatura.save();
    await assinatura.reload();
    const dadosNovos = assinatura.toJSON() as Record<string, unknown>;
    
    if (req) {
      try {
        await registrarAtualizacaoElasticsearch(
          req,
          'AssinaturaDigital',
          assinatura.id,
          dadosAnteriores,
          dadosNovos,
          `Atualização via webhook (cancelamento) - Provider: ${provider || 'desconhecido'}`
        );
      } catch (auditError) {
        logger.warn('Erro ao registrar auditoria de webhook (cancelamento)', {
          assinatura_id: assinatura.id,
          error: auditError instanceof Error ? auditError.message : 'Erro desconhecido'
        });
      }
    }
  }

  /**
   * Processa assinatura completa
   */
  private static async processarAssinaturaCompleta(
    assinatura: any,
    signedPdf: string | undefined,
    certificatedPdfUrl: string | undefined,
    documentId: string,
    provider: 'assinafy' | 'zapsign' | undefined,
    req: Request | undefined
  ): Promise<void> {
    const dadosParaAtualizar: Record<string, unknown> = {
      status: 'assinado',
      data_assinatura: new Date()
    };
    
    if (certificatedPdfUrl) {
      dadosParaAtualizar.pdf_assinado_url = certificatedPdfUrl;
    }

    let pdfBufferParaSalvar: Buffer | null = null;
    let pdfBase64ParaSalvar: string | null = null;
    
    if (signedPdf) {
      const base64Content = signedPdf.replace(/^data:.*,/, '');
      pdfBufferParaSalvar = Buffer.from(base64Content, 'base64');
      dadosParaAtualizar.pdf_assinado_base64 = signedPdf;
      pdfBase64ParaSalvar = signedPdf;
    } else if (!assinatura.pdf_assinado_base64) {
      try {
        const signatureService = await AssinaturaEnvioService.getSignatureService(
          assinatura.api_provider as 'assinafy' | 'zapsign'
        );
        if (signatureService) {
          const pdfBuffer = await (signatureService as unknown as ISignatureService).baixarPdfAssinado(
            documentId,
            certificatedPdfUrl || undefined
          );
          if (pdfBuffer) {
            pdfBufferParaSalvar = pdfBuffer;
            const base64 = pdfBuffer.toString('base64');
            dadosParaAtualizar.pdf_assinado_base64 = base64;
            pdfBase64ParaSalvar = base64;
          }
        }
      } catch (error) {
        // Ignorar erro ao baixar PDF
      }
    } else {
      pdfBase64ParaSalvar = assinatura.pdf_assinado_base64;
      if (pdfBase64ParaSalvar) {
        try {
          const base64Content = pdfBase64ParaSalvar.replace(/^data:.*,/, '');
          pdfBufferParaSalvar = Buffer.from(base64Content, 'base64');
        } catch (error) {
          // Ignorar erro de conversão
        }
      }
    }

    const dadosAnteriores = assinatura.toJSON() as Record<string, unknown>;
    await AssinaturaDigitalService.updateById(assinatura.id, dadosParaAtualizar);
    await assinatura.reload();
    const dadosNovos = assinatura.toJSON() as Record<string, unknown>;
    
    if (req) {
      try {
        await registrarAtualizacaoElasticsearch(
          req,
          'AssinaturaDigital',
          assinatura.id,
          dadosAnteriores,
          dadosNovos,
          `Atualização via webhook (assinatura completa) - Provider: ${provider || 'desconhecido'}`
        );
      } catch (auditError) {
        logger.warn('Erro ao registrar auditoria de webhook (assinatura completa)', {
          assinatura_id: assinatura.id,
          error: auditError instanceof Error ? auditError.message : 'Erro desconhecido'
        });
      }
    }

    if (assinatura.cliente_id && pdfBufferParaSalvar) {
      await this.salvarPdfComoArquivoCliente(assinatura, pdfBufferParaSalvar, provider, req);
    }

    if (assinatura.termo_contrato_id) {
      await this.atualizarTermoContrato(assinatura, req, provider);
    }
  }

  /**
   * Salva PDF como arquivo do cliente
   */
  private static async salvarPdfComoArquivoCliente(
    assinatura: any,
    pdfBuffer: Buffer,
    provider: 'assinafy' | 'zapsign' | undefined,
    req: Request | undefined
  ): Promise<void> {
    try {
      const arquivoExistente = await ClienteArquivoService.findByReferencia(
        assinatura.cliente_id,
        assinatura.id,
        'assinatura_digital'
      );

      if (!arquivoExistente) {
        const nomeArquivo = `Documento_Assinado_${assinatura.id}_${Date.now()}.pdf`;
        
        const arquivoCriado = await ClienteArquivoService.createFromBuffer({
          cliente_id: assinatura.cliente_id,
          nome: nomeArquivo,
          tipo: 'assinatura',
          arquivo_buffer: pdfBuffer,
          mime_type: 'application/pdf',
          descricao: `Documento assinado digitalmente${assinatura.nome_assinante ? ` - ${assinatura.nome_assinante}` : ''}`,
          origem: 'assinatura_digital',
          referencia_id: assinatura.id,
          referencia_tipo: 'assinatura_digital'
        });
        
        if (req && arquivoCriado) {
          try {
            const dadosNovos = arquivoCriado.toJSON 
              ? arquivoCriado.toJSON() as Record<string, unknown> 
              : (arquivoCriado as unknown as Record<string, unknown>);
            await registrarCriacaoElasticsearch(
              req,
              'ClienteArquivo',
              typeof arquivoCriado.id === 'number' ? arquivoCriado.id : parseInt(String(arquivoCriado.id), 10),
              dadosNovos,
              `Criação via webhook (assinatura digital) - Provider: ${provider || 'desconhecido'}`
            );
          } catch (auditError) {
            logger.warn('Erro ao registrar auditoria de webhook (criação arquivo)', {
              error: auditError instanceof Error ? auditError.message : 'Erro desconhecido'
            });
          }
        }
      }
    } catch (error) {
      logger.error('Erro ao salvar PDF assinado como arquivo do cliente', {
        clienteId: assinatura.cliente_id,
        assinaturaId: assinatura.id,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Atualiza termo de contrato relacionado
   */
  private static async atualizarTermoContrato(
    assinatura: any,
    req: Request | undefined,
    provider: 'assinafy' | 'zapsign' | undefined
  ): Promise<void> {
    const termoContrato = await TermoContratoService.getById(assinatura.termo_contrato_id);
    if (termoContrato) {
      const dadosAnteriores = termoContrato.toJSON() as Record<string, unknown>;
      const dataAceite = new Date();
      const aceitoPor = assinatura.nome_assinante || 'Assinatura Digital';
      
      const termoAtualizado = await TermoContratoService.update(assinatura.termo_contrato_id, {
        assinado: 'SIM',
        data_aceite: dataAceite,
        aceito_por: aceitoPor
      });
      
      const dadosNovos = termoAtualizado.toJSON() as Record<string, unknown>;
      
      if (req) {
        try {
          await registrarAtualizacaoElasticsearch(
            req,
            'TermoContrato',
            termoAtualizado.id,
            dadosAnteriores,
            dadosNovos,
            `Atualização via webhook (assinatura digital) - Provider: ${provider || 'desconhecido'}`
          );
        } catch (auditError) {
          logger.warn('Erro ao registrar auditoria de webhook (termo contrato)', {
            termo_contrato_id: termoAtualizado.id,
            error: auditError instanceof Error ? auditError.message : 'Erro desconhecido'
          });
        }
      }
    }
  }
}
