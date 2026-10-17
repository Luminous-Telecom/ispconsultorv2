import { prisma } from '../../../db/prisma';
import { logger } from '../../../utils/logger';
import { AssinaturaDigitalService } from '../AssinaturaDigitalService';
import { TermoContratoService } from '../../contratos/TermoContratoService';
import { AssinaturaEnvioService } from '../AssinaturaEnvioService';
import { AssinafyService } from '../AssinafyService';
import { ZapsignService } from '../ZapsignService';

interface ISignatureService {
  consultarStatus(documentId: string): Promise<{ success: boolean; data?: { id: string; url?: string; status: string }; error?: string }>;
  baixarPdfAssinado(documentId: string, url?: string): Promise<Buffer | null>;
  cancelarAssinatura(documentId: string): Promise<{ success: boolean; error?: string }>;
}

export class AssinaturaConsultaService {
  /**
   * Consulta status de uma assinatura
   */
  static async consultarStatus(assinaturaId: number) {
    const assinatura = await AssinaturaDigitalService.getById(assinaturaId);
    if (!assinatura) {
      throw new Error('Assinatura não encontrada');
    }

    if (!assinatura.api_document_id) {
      throw new Error('Assinatura não possui ID da API');
    }

    const signatureService = await AssinaturaEnvioService.getSignatureService(
      assinatura.api_provider as 'assinafy' | 'zapsign',
      assinatura.empresa_id
    );
    if (!signatureService) {
      throw new Error('API Key não configurada. Configure em Parâmetros > Assinatura Digital');
    }

    const resultado = await (signatureService as unknown as ISignatureService).consultarStatus(assinatura.api_document_id);

    if (resultado.success && resultado.data) {
      if (resultado.data.status === 'signed' || resultado.data.status === 'completed') {
        const dataAssinatura = new Date();
        await prisma.assinatura_digital_assinaturas.update({
          where: { id: assinatura.id },
          data: { status: 'assinado', data_assinatura: dataAssinatura, updated_at: new Date() },
        });
        Object.assign(assinatura, { status: 'assinado', data_assinatura: dataAssinatura });

        if (assinatura.termo_contrato_id) {
          const termoContrato = await TermoContratoService.getById(assinatura.termo_contrato_id);
          if (termoContrato && termoContrato.assinado === 'NAO') {
            const dataAceite = new Date();
            const aceitoPor = assinatura.nome_assinante || 'Assinatura Digital';
            await prisma.contratos_termos.update({
              where: { id: termoContrato.id },
              data: { assinado: 'SIM', data_aceite: dataAceite, aceito_por: aceitoPor, updated_at: new Date() },
            });
          }
        }
      } else if (resultado.data.status === 'canceled') {
        await prisma.assinatura_digital_assinaturas.update({
          where: { id: assinatura.id },
          data: { status: 'cancelado', updated_at: new Date() },
        });
        Object.assign(assinatura, { status: 'cancelado' });
      }
    }

    return {
      assinatura,
      status_api: resultado.data?.status
    };
  }

  /**
   * Baixa PDF assinado
   */
  static async baixarPdfAssinado(assinaturaId: number) {
    const assinatura = await AssinaturaDigitalService.getById(assinaturaId);
    if (!assinatura) {
      throw new Error('Assinatura não encontrada');
    }

    if (!assinatura.api_document_id) {
      throw new Error('Assinatura não possui ID da API');
    }

    const signatureService = await AssinaturaEnvioService.getSignatureService(
      assinatura.api_provider as 'assinafy' | 'zapsign',
      assinatura.empresa_id
    );
    if (!signatureService) {
      throw new Error('API Key não configurada. Configure em Parâmetros > Assinatura Digital');
    }

    const pdfBuffer = await (signatureService as unknown as ISignatureService).baixarPdfAssinado(
      assinatura.api_document_id,
      assinatura.pdf_assinado_url || undefined
    );

    if (!pdfBuffer) {
      throw new Error('Erro ao baixar PDF assinado');
    }

    return pdfBuffer;
  }

  /**
   * Cancela assinatura
   */
  static async cancelar(assinaturaId: number) {
    const assinatura = await AssinaturaDigitalService.getById(assinaturaId);
    if (!assinatura) {
      throw new Error('Assinatura não encontrada');
    }

    if (!assinatura.api_document_id) {
      throw new Error('Assinatura não possui ID da API');
    }

    const signatureService = await AssinaturaEnvioService.getSignatureService(
      assinatura.api_provider as 'assinafy' | 'zapsign',
      assinatura.empresa_id
    );
    if (!signatureService) {
      throw new Error('API Key não configurada. Configure em Parâmetros > Assinatura Digital');
    }

    const resultado = await (signatureService as unknown as ISignatureService).cancelarAssinatura(assinatura.api_document_id);

    if (resultado.success) {
      await prisma.assinatura_digital_assinaturas.update({
        where: { id: assinatura.id },
        data: { status: 'cancelado', updated_at: new Date() },
      });
      Object.assign(assinatura, { status: 'cancelado' });
    } else {
      throw new Error(resultado.error || 'Erro ao cancelar assinatura');
    }

    return assinatura;
  }
}
