import { logger } from '../../../utils/logger';
import { AssinaturaDigitalService } from '../AssinaturaDigitalService';
import { AssinaturaDigitalProviderService } from '../AssinaturaDigitalProviderService';
import { TermoContratoService } from '../../contratos/TermoContratoService';
import { ClienteService } from '../../clientes/ClienteService';
import { ModeloDocumentoService } from '../../documentos/ModeloDocumentoService';
import { VariaveisDocumentoService } from '../../documentos/VariaveisDocumentoService';
import { AssinafyService } from '../AssinafyService';
import { ZapsignService } from '../ZapsignService';
import type { Cliente } from '../../../models/clientes/Cliente';
import type { Contrato } from '../../../models/contratos/Contrato';
import { registrarCriacao } from '../../sistema/AuditoriaService';
import type { AuthenticatedRequest } from '../../../types/auth';

interface EnviarAssinaturaParams {
  termo_contrato_id?: number;
  cliente_id?: number;
  email_assinante: string;
  nome_assinante: string;
  cpf_cnpj_assinante?: string;
  mensagem?: string;
  dias_expiracao?: number;
  req: AuthenticatedRequest;
}

export class AssinaturaEnvioService {
  /**
   * Verifica se a assinatura digital está habilitada
   */
  static async isSignatureEnabled(): Promise<boolean> {
    try {
      const provider = await AssinaturaDigitalProviderService.getEnabled();
      return !!provider && !!provider.api_key;
    } catch (error) {
      logger.error('Erro ao verificar se assinatura digital está habilitada:', error);
      return false;
    }
  }

  /**
   * Obtém o serviço de assinatura digital correto
   */
  static async getSignatureService(provider: 'assinafy' | 'zapsign'): Promise<AssinafyService | ZapsignService | null> {
    try {
      switch (provider) {
        case 'zapsign':
          return await ZapsignService.createFromDatabase();
        case 'assinafy':
        default:
          return await AssinafyService.createFromDatabase();
      }
    } catch (error) {
      logger.error('Erro ao obter serviço de assinatura digital:', error);
      return null;
    }
  }

  /**
   * Prepara conteúdo HTML do documento
   */
  static async prepararConteudoDocumento(
    termo_contrato_id?: number,
    cliente_id?: number
  ): Promise<{ conteudoHtml: string; cliente: Cliente | null; contrato: Contrato | null }> {
    let cliente: Cliente | null = null;
    let contrato: Contrato | null = null;
    let conteudoHtml = '';

    if (termo_contrato_id) {
      const termoContrato = await TermoContratoService.getById(termo_contrato_id);
      if (!termoContrato) {
        throw new Error('Termo de contrato não encontrado');
      }

      if (!termoContrato.modelo_documento_id) {
        throw new Error('Termo de contrato não possui modelo de documento associado');
      }

      contrato = await termoContrato.getContrato();
      if (contrato) {
        cliente = await contrato.getCliente();
      }

      const modeloDocumento = await ModeloDocumentoService.getById(termoContrato.modelo_documento_id);
      if (!modeloDocumento) {
        throw new Error('Modelo de documento não encontrado');
      }

      const conteudoMap: Record<string, string> = {
        'adesao': modeloDocumento.conteudo_adesao || modeloDocumento.conteudo || '',
        'permanencia': modeloDocumento.conteudo_permanencia || modeloDocumento.conteudo || ''
      };
      
      conteudoHtml = conteudoMap[termoContrato.tipo_termo] || modeloDocumento.conteudo || '';

      if (!conteudoHtml) {
        throw new Error('Modelo de documento não possui conteúdo válido');
      }
    } else if (cliente_id) {
      cliente = await ClienteService.getById(cliente_id);
      if (!cliente) {
        throw new Error('Cliente não encontrado');
      }
    }

    return { conteudoHtml, cliente, contrato };
  }

  /**
   * Processa variáveis do documento
   */
  static async processarVariaveis(
    conteudoHtml: string,
    cliente: Cliente | null,
    contrato: Contrato | null
  ): Promise<string> {
    if (conteudoHtml && cliente) {
      const contratoRef = contrato ? { id: contrato.id } : undefined;
      return await VariaveisDocumentoService.processarVariaveis(
        conteudoHtml,
        {
          cliente,
          contrato: contratoRef,
          dataReferencia: new Date()
        },
        undefined
      );
    }
    return conteudoHtml;
  }

  /**
   * Envia documento para assinatura
   */
  static async enviarParaAssinatura(params: EnviarAssinaturaParams) {
    const {
      termo_contrato_id,
      cliente_id,
      email_assinante,
      nome_assinante,
      cpf_cnpj_assinante,
      mensagem,
      dias_expiracao = 30,
      req
    } = params;

    if (!email_assinante || !nome_assinante) {
      throw new Error('Email e nome do assinante são obrigatórios');
    }

    const isEnabled = await this.isSignatureEnabled();
    if (!isEnabled) {
      throw new Error('Assinatura digital não está habilitada. Configure em Parâmetros > Assinatura Digital');
    }

    const providerConfig = await AssinaturaDigitalProviderService.getEnabled();
    if (!providerConfig) {
      throw new Error('Nenhum provider de assinatura digital habilitado. Configure em Parâmetros > Assinatura Digital');
    }

    const provider = providerConfig.provider as 'assinafy' | 'zapsign';
    const signatureService = await this.getSignatureService(provider);
    if (!signatureService) {
      throw new Error('API Key não configurada. Configure em Parâmetros > Assinatura Digital');
    }

    const { conteudoHtml: conteudoHtmlRaw, cliente, contrato } = await this.prepararConteudoDocumento(
      termo_contrato_id,
      cliente_id
    );

    const conteudoHtml = await this.processarVariaveis(conteudoHtmlRaw, cliente, contrato);

    const pdfBase64 = await AssinafyService.gerarPdfBase64(
      conteudoHtml || '<html><body><h1>Documento para assinatura</h1></body></html>',
      `termo-${termo_contrato_id || 'documento'}.pdf`
    );

    const diasExpiracaoFinal = dias_expiracao || providerConfig.dias_expiracao_padrao || 30;
    const dataExpiracao = new Date();
    dataExpiracao.setDate(dataExpiracao.getDate() + diasExpiracaoFinal);
    const cpfCnpjLimpo = cpf_cnpj_assinante?.replace(/[.\-\/\s]/g, '') || '';
    
    const signers = [{
      name: nome_assinante,
      email: email_assinante,
      cpf: cpfCnpjLimpo.length === 11 ? cpfCnpjLimpo : undefined,
      cnpj: cpfCnpjLimpo.length === 14 ? cpfCnpjLimpo : undefined,
      order: 1
    }];
    
    const uploadResult = await signatureService.uploadDocumento({
      name: `Termo de Contrato ${termo_contrato_id || 'Documento'}`,
      file: pdfBase64,
      signers: provider === 'zapsign' ? signers : undefined
    });

    if (!uploadResult.success || !uploadResult.data) {
      throw new Error(uploadResult.message || uploadResult.error || 'Erro ao fazer upload do documento');
    }

    const documentId = uploadResult.data.id;
    
    if (provider === 'assinafy') {
      signatureService.processarDocumentoEmBackground?.(documentId, {
        name: `Termo de Contrato ${termo_contrato_id || 'Documento'}`,
        file: pdfBase64,
        signers: signers,
        expiresAt: dataExpiracao.toISOString(),
        message: mensagem || 'Por favor, assine este documento'
      }).catch((error: unknown) => {
        logger.error('Erro ao processar documento em background', {
          documentId,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      });
    }

    const urlAssinatura = provider === 'zapsign' && uploadResult.data?.url 
      ? uploadResult.data.url 
      : null;

    const assinatura = await AssinaturaDigitalService.create({
      termo_contrato_id: termo_contrato_id || null,
      cliente_id: cliente?.id || cliente_id || null,
      documento_tipo: termo_contrato_id ? 'termo' : 'outro' as const,
      documento_id: termo_contrato_id || null,
      api_provider: provider as 'assinafy' | 'zapsign',
      api_document_id: documentId,
      status: 'enviado' as const,
      url_assinatura: urlAssinatura,
      email_assinante,
      nome_assinante,
      cpf_cnpj_assinante: cpfCnpjLimpo || null,
      data_envio: new Date(),
      data_expiracao: dataExpiracao
    });

    try {
      await registrarCriacao(
        req,
        'AssinaturaDigital',
        assinatura.id,
        assinatura.toJSON() as Record<string, unknown>
      );
    } catch (auditError) {
      // Não interromper o fluxo
    }

    return assinatura;
  }
}
