import { ServidorWhatsApp } from '../../../models/comunicacao/ServidorWhatsApp';
import { registrarMensagemHistorico, type ContextoHistorico } from '../RegistroMensagemHistoricoService';
import { Cliente } from '../../../models/clientes/Cliente';
import { logger } from '../../../utils/logger';
import { WhatsAppCloudService } from '../WhatsAppCloudService';

const INTERACTION_DELAY_MS = 2000;

interface WhatsAppRequestBody {
  number: string;
  text?: string;
  mediatype?: string;
  media?: string;
  fileName?: string;
  caption?: string;
}

export class WhatsAppSenderService {
  /**
   * Envia mensagem de texto
   */
  static async enviarTexto(
    servidor: ServidorWhatsApp,
    telefone: string,
    mensagem: string,
    contextoSaas?: ContextoHistorico
  ): Promise<boolean> {
    if (servidor.tipo_api === 'whatsapp_cloud') {
      return WhatsAppCloudService.enviarTexto(servidor, telefone, mensagem, contextoSaas);
    }
    const baseUrl = this.getBaseUrl(servidor);
    const url = `${baseUrl}/message/sendText/${servidor.instance_name}`;
    return this.fazerRequisicao(url, servidor, { number: telefone, text: mensagem }, telefone, mensagem, undefined, undefined, undefined, undefined, undefined, contextoSaas);
  }

  /**
   * Envia PDF em base64
   */
  static async enviarPdfBase64(
    servidor: ServidorWhatsApp,
    telefone: string,
    base64: string,
    descricao?: string,
    entidadeTipo?: string,
    entidadeId?: number,
    contextoSaas?: ContextoHistorico
  ): Promise<boolean> {
    try {
      if (servidor.tipo_api === 'whatsapp_cloud') {
        return WhatsAppCloudService.enviarDocumento(
          servidor,
          telefone,
          base64,
          'boleto.pdf',
          descricao,
          contextoSaas
        );
      }
      const baseUrl = this.getBaseUrl(servidor);
      const url = `${baseUrl}/message/sendMedia/${servidor.instance_name}`;
      return this.fazerRequisicao(url, servidor, {
        number: telefone,
        mediatype: 'document',
        media: base64,
        fileName: 'boleto.pdf',
        caption: descricao || undefined
      }, telefone, descricao || 'Boleto em PDF', entidadeTipo, entidadeId, undefined, undefined, undefined, contextoSaas);
    } catch (error) {
      logger.error('Erro ao enviar PDF via WhatsApp:', error);
      return false;
    }
  }

  /**
   * Faz requisição HTTP para Evolution API
   */
  private static async fazerRequisicao(
    url: string,
    servidor: ServidorWhatsApp,
    body: WhatsAppRequestBody,
    telefone?: string,
    mensagem?: string,
    entidadeTipo?: string,
    entidadeId?: number,
    clienteNome?: string,
    clienteEmail?: string,
    clienteTelefone?: string,
    contextoSaas?: ContextoHistorico
  ): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), servidor.timeout);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': servidor.evolution_api_key },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeout);
      
      const responseData = await response.json().catch(() => ({}));
      
      if (response.ok) {
        // Registrar mensagem enviada no histórico
        if (telefone && mensagem) {
          try {
            // Buscar dados do cliente baseado no telefone
            let clienteData = null;
            if (telefone) {
              // Limpar telefone para busca (remover caracteres especiais)
              const telefoneLimpo = telefone.replace(/\D/g, '');
              clienteData = await Cliente.findOne({
                where: {
                  telefone: {
                    [require('sequelize').Op.like]: `%${telefoneLimpo}%`
                  }
                },
                attributes: ['razao_social', 'nome_fantasia', 'email', 'telefone']
              });
            }

            const clienteNome = clienteData ? (clienteData.razao_social || clienteData.nome_fantasia || undefined) : undefined;
            const clienteEmail = clienteData?.email || undefined;
            const clienteTelefone = clienteData?.telefone || undefined;

            await registrarMensagemHistorico(
              {
                tipo: 'whatsapp',
                destinatario: telefone,
                mensagem: mensagem,
                status: 'enviada',
                entidade_tipo: entidadeTipo,
                entidade_id: entidadeId,
                servidor_id: servidor.id,
                cliente_nome: clienteNome,
                cliente_email: clienteEmail,
                cliente_telefone: clienteTelefone,
              },
              contextoSaas
            );
          } catch (registroError) {
            logger.error('Erro ao registrar WhatsApp enviado no histórico:', registroError);
            // Não falha o envio por erro no registro
          }
        }
        return true;
      } else {
        // Registrar erro no histórico
        if (telefone && mensagem) {
          try {
            // Buscar dados do cliente baseado no telefone
            let clienteData = null;
            if (telefone) {
              // Limpar telefone para busca (remover caracteres especiais)
              const telefoneLimpo = telefone.replace(/\D/g, '');
              clienteData = await Cliente.findOne({
                where: {
                  telefone: {
                    [require('sequelize').Op.like]: `%${telefoneLimpo}%`
                  }
                },
                attributes: ['razao_social', 'nome_fantasia', 'email', 'telefone']
              });
            }

            const clienteNome = clienteData ? (clienteData.razao_social || clienteData.nome_fantasia || undefined) : undefined;
            const clienteEmail = clienteData?.email || undefined;
            const clienteTelefone = clienteData?.telefone || undefined;

            await registrarMensagemHistorico(
              {
                tipo: 'whatsapp',
                destinatario: telefone,
                mensagem: mensagem,
                status: 'erro',
                erro_mensagem: `Erro HTTP ${response.status}: ${JSON.stringify(responseData)}`,
                entidade_tipo: entidadeTipo,
                entidade_id: entidadeId,
                servidor_id: servidor.id,
                cliente_nome: clienteNome,
                cliente_email: clienteEmail,
                cliente_telefone: clienteTelefone,
              },
              contextoSaas
            );
          } catch (registroError) {
            logger.error('Erro ao registrar erro de WhatsApp no histórico:', registroError);
            // Não falha o envio por erro no registro
          }
        }
        logger.error('Erro na requisição WhatsApp:', { url, status: response.status, data: responseData });
        return false;
      }
    } catch (error) {
      logger.error('Erro ao fazer requisição WhatsApp:', error);
      return false;
    }
  }

  /**
   * Obtém URL base do servidor Evolution API
   */
  private static getBaseUrl(servidor: ServidorWhatsApp): string {
    return servidor.evolution_api_url.replace(/\/$/, '');
  }

  /**
   * Delay entre interações
   */
  static async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Delay padrão para interações
   */
  static async delayInteracao(): Promise<void> {
    return this.delay(INTERACTION_DELAY_MS);
  }
}
