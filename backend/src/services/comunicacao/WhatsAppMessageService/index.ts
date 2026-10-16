import { ServidorWhatsApp } from '../../../models/comunicacao/ServidorWhatsApp';
import { MensagemWhatsApp } from '../../../models/comunicacao/MensagemWhatsApp';
import { Titulo } from '../../../models/financeiro/Titulo';
import { Cliente } from '../../../models/clientes/Cliente';
import { Contrato } from '../../../models/contratos/Contrato';
import { logger } from '../../../utils/logger';
import { VariaveisDocumentoService } from '../../documentos/VariaveisDocumentoService';
import { TituloPDFController } from '../../../controllers/titulos/TituloPDFController';
import { WhatsAppSenderService } from '../WhatsAppSenderService';
import { WhatsAppTemplateService } from '../WhatsAppTemplateService';
import { WhatsAppCloudService } from '../WhatsAppCloudService';
import { TemplateWhatsAppService } from '../TemplateWhatsAppService';
import { TemplateWhatsApp } from '../../../models/comunicacao/TemplateWhatsApp';
import type { ContextoHistorico } from '../RegistroMensagemHistoricoService';
import { whereComunicacaoEmpresaEstrito } from '../../../utils/comunicacaoEmpresaWhere';

export class WhatsAppMessageService {
  /**
   * Envia título manualmente via WhatsApp
   */
  static async enviarTituloManual(tituloId: number): Promise<{ sucesso: boolean; mensagem?: string }> {
    try {
      const titulo = await Titulo.findByPk(tituloId, {
        include: [
          { model: Cliente, as: 'cliente' },
          { model: Contrato, as: 'contrato' },
          { association: 'banco' },
          { association: 'plano' }
        ]
      });

      if (!titulo) {
        return { sucesso: false, mensagem: 'Título não encontrado' };
      }

      const cliente = (titulo as Titulo & { cliente?: Cliente | null }).cliente;
      if (!cliente) {
        return { sucesso: false, mensagem: 'Cliente não encontrado' };
      }

      if (!cliente.telefone) {
        return { sucesso: false, mensagem: 'Cliente não possui telefone cadastrado' };
      }

      if (!cliente.recebe_whatsapp) {
        return { sucesso: false, mensagem: 'Ative a comunicação "Recebe WhatsApp" na aba Contato do cadastro do cliente para enviar mensagens' };
      }

      const empresaId = (titulo as { empresa_id?: number }).empresa_id ?? (cliente as { empresa_id?: number }).empresa_id ?? undefined;
      const whereSrv = whereComunicacaoEmpresaEstrito(empresaId, { ativo: true });
      if (!whereSrv) {
        return { sucesso: false, mensagem: 'Empresa do título não identificada para envio de WhatsApp' };
      }
      const servidor = await ServidorWhatsApp.findOne({ where: whereSrv });
      if (!servidor) {
        return { sucesso: false, mensagem: 'Nenhum servidor WhatsApp ativo encontrado para esta empresa' };
      }

      const whereMsg = whereComunicacaoEmpresaEstrito(empresaId, { tipo: 'envio_manual', ativo: true });
      const mensagem = whereMsg
        ? await MensagemWhatsApp.findOne({
            where: whereMsg,
            include: [{ model: TemplateWhatsApp, as: 'template', required: false }],
          })
        : null;

      if (!mensagem) {
        return { sucesso: false, mensagem: 'Mensagem de envio manual não configurada' };
      }

      const contrato = (titulo as Titulo & { contrato?: Contrato | null }).contrato;
      const telefone = this.formatarTelefone(cliente.telefone);
      const baseUrl = undefined;
      const contextoHistorico: ContextoHistorico = {
        ...(empresaId != null ? { empresa_id: empresaId } : {}),
        entidade_tipo: 'titulo',
        entidade_id: titulo.id,
        titulo_historico: 'Boleto de Pagamento',
      };

      const mensagemTexto = mensagem.mensagem_manual || mensagem.mensagem_padrao || '';
      
      if (servidor.tipo_api === 'whatsapp_cloud') {
        return await this.enviarViaCloud(mensagem, servidor, telefone, titulo, cliente, contrato, mensagemTexto, baseUrl, contextoHistorico);
      }

      return await this.enviarViaEvolution(mensagem, servidor, telefone, titulo, cliente, contrato, mensagemTexto, baseUrl, contextoHistorico);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao enviar título manual via WhatsApp:', { 
        tituloId, 
        error: errorMessage
      });
      return { sucesso: false, mensagem: `Erro interno ao enviar mensagem: ${errorMessage}` };
    }
  }

  /**
   * Envia via WhatsApp Cloud API
   */
  private static async enviarViaCloud(
    mensagem: MensagemWhatsApp,
    servidor: ServidorWhatsApp,
    telefone: string,
    titulo: Titulo,
    cliente: Cliente,
    contrato: Contrato | null | undefined,
    mensagemTexto: string,
    baseUrl: undefined,
    contextoHistorico?: ContextoHistorico
  ): Promise<{ sucesso: boolean; mensagem?: string }> {
    const templateInfo = TemplateWhatsAppService.getTemplateInfoForMensagem(mensagem);
    if (!templateInfo) {
      return { sucesso: false, mensagem: 'Template não configurado para WhatsApp Cloud API' };
    }

    let msg = mensagemTexto;
    if (mensagemTexto) {
      msg = await VariaveisDocumentoService.processarVariaveis(mensagemTexto, {
        cliente,
        contrato: contrato || undefined,
        titulo,
        dataReferencia: new Date()
      }, baseUrl);
    }

    const components = await WhatsAppTemplateService.prepararComponentesParaTemplateCloud({
      servidor,
      cliente,
      contrato: contrato || undefined,
      titulo,
      mensagemTexto: msg,
      templateInfo,
      tipoEnvio: mensagem.tipo_envio,
    });

    const enviouTemplate = await WhatsAppCloudService.enviarTemplate(
      servidor,
      telefone,
      templateInfo.name,
      templateInfo.language,
      components,
      { nome_fantasia: cliente.nome_fantasia || undefined, razao_social: cliente.razao_social || undefined },
      titulo,
      contextoHistorico
    );

    return enviouTemplate
      ? { sucesso: true, mensagem: 'Mensagem enviada com sucesso' }
      : { sucesso: false, mensagem: 'Erro ao enviar mensagem via template' };
  }

  /**
   * Envia via Evolution API
   */
  private static async enviarViaEvolution(
    mensagem: MensagemWhatsApp,
    servidor: ServidorWhatsApp,
    telefone: string,
    titulo: Titulo,
    cliente: Cliente,
    contrato: Contrato | null | undefined,
    mensagemTexto: string,
    baseUrl: undefined,
    contextoHistorico?: ContextoHistorico
  ): Promise<{ sucesso: boolean; mensagem?: string }> {
    if (!mensagemTexto) {
      return { sucesso: false, mensagem: 'Mensagem de envio manual não configurada' };
    }

    const msg = await VariaveisDocumentoService.processarVariaveis(mensagemTexto, {
      cliente,
      contrato: contrato || undefined,
      titulo,
      dataReferencia: new Date()
    }, baseUrl);
    
    if (mensagem.tipo_envio === 'pdf') {
      const base64 = await TituloPDFController.gerarPdfBase64(titulo);
      if (!base64) {
        return { sucesso: false, mensagem: 'Erro ao gerar PDF do boleto' };
      }
      const enviouPdf = await WhatsAppSenderService.enviarPdfBase64(servidor, telefone, base64, msg, 'titulo', titulo.id, contextoHistorico);
      if (!enviouPdf) {
        return { sucesso: false, mensagem: 'Erro ao enviar PDF' };
      }
      await this.enviarMensagensInteracao(mensagem, servidor, telefone, cliente, contrato, titulo, contextoHistorico);
      return { sucesso: true, mensagem: 'Mensagem enviada com sucesso' };
    }

    const enviouTexto = await WhatsAppSenderService.enviarTexto(servidor, telefone, msg, contextoHistorico);
    if (!enviouTexto) {
      return { sucesso: false, mensagem: 'Erro ao enviar mensagem' };
    }
    await this.enviarMensagensInteracao(mensagem, servidor, telefone, cliente, contrato, titulo, contextoHistorico);
    return { sucesso: true, mensagem: 'Mensagem enviada com sucesso' };
  }

  /**
   * Envia mensagens de interação
   */
  private static async enviarMensagensInteracao(
    mensagem: MensagemWhatsApp,
    servidor: ServidorWhatsApp,
    telefone: string,
    cliente: Cliente,
    contrato: Contrato | null | undefined,
    titulo: Titulo,
    contextoHistorico?: ContextoHistorico
  ): Promise<void> {
    const interacoes = [mensagem.interacao1, mensagem.interacao2, mensagem.interacao3];

    for (const interacao of interacoes) {
      if (!interacao || !interacao.trim()) {
        continue;
      }

      await WhatsAppSenderService.delayInteracao();

      try {
        const baseUrl = undefined;
        const texto = await VariaveisDocumentoService.processarVariaveis(interacao, {
          cliente,
          contrato: contrato || undefined,
          titulo,
          dataReferencia: new Date(),
        }, baseUrl);

        if (!texto || !texto.trim()) {
          continue;
        }

        const enviou = await WhatsAppSenderService.enviarTexto(servidor, telefone, texto, contextoHistorico);
        if (!enviou) {
          logger.warn('Falha ao enviar mensagem de interação via WhatsApp', {
            telefone,
            instancia: servidor.instance_name,
          });
        }
      } catch (error) {
        logger.error('Erro ao processar/enviar mensagem de interação via WhatsApp', {
          error,
          telefone,
          instancia: servidor.instance_name,
        });
      }
    }
  }

  /**
   * Formata telefone para padrão brasileiro
   */
  private static formatarTelefone(telefone: string): string {
    const apenasNumeros = telefone.replace(/\D/g, '');
    return apenasNumeros.startsWith('55') ? apenasNumeros : `55${apenasNumeros}`;
  }
}
