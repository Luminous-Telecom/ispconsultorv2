import { Op } from 'sequelize';
import { ServidorWhatsApp } from '../models/ServidorWhatsApp';
import { MensagemWhatsApp } from '../models/MensagemWhatsApp';
import { Titulo } from '../models/Titulo';
import { Cliente } from '../models/Cliente';
import { Plano } from '../models/Plano';
import { Banco } from '../models/Banco';
import { Contrato } from '../models/Contrato';
import { logger } from '../utils/logger';
import { VariaveisDocumentoService } from './VariaveisDocumentoService';
import { TituloController } from '../controllers/TituloController';
import { WhatsAppCloudService } from './WhatsAppCloudService';

const INTERACTION_DELAY_MS = 2000;

interface TituloPlainWithRelations {
  cliente?: Cliente;
  plano?: Plano;
  banco?: Banco;
}

interface WhatsAppRequestBody {
  number: string;
  text?: string;
  mediatype?: string;
  media?: string;
  fileName?: string;
  caption?: string;
}

interface ConfiguracoesEnvios {
  antesVencimento?: number[];
  mesmoDia?: boolean;
  depoisVencimento?: number[];
}

export class WhatsAppService {
  static async enviarBoletos(config: ConfiguracoesEnvios): Promise<{
    sucesso: boolean;
    mensagensEnviadas: number;
    erros: number;
  }> {
    try {
      const servidor = await ServidorWhatsApp.findOne({ where: { ativo: true } });
      if (!servidor) {
        return { sucesso: false, mensagensEnviadas: 0, erros: 0 };
      }

      const mensagens = await MensagemWhatsApp.findAll({ where: { ativo: true } });
      if (mensagens.length === 0) {
        return { sucesso: false, mensagensEnviadas: 0, erros: 0 };
      }

      let mensagensEnviadas = 0;
      let erros = 0;

      // Processar todas as configurações de envio
      const envios = [
        ...(config.antesVencimento?.map(dias => ({ dias, tipo: 'antes' as const, tipoMensagem: `${String(dias).padStart(2, '0')}_dias_antes_vencimento` })) || []),
        ...(config.mesmoDia ? [{ dias: 0, tipo: 'mesmo' as const, tipoMensagem: 'mesmo_dia_vencimento' }] : []),
        ...(config.depoisVencimento?.map(dias => ({ dias, tipo: 'depois' as const, tipoMensagem: `${String(dias).padStart(2, '0')}_dias_depois_vencimento` })) || [])
      ];

      for (const envio of envios) {
        const resultado = await this.processarEnvio(mensagens, servidor, envio.tipoMensagem, envio.dias, envio.tipo);
        mensagensEnviadas += resultado.enviadas;
        erros += resultado.erros;
      }

      return { sucesso: mensagensEnviadas > 0, mensagensEnviadas, erros };
    } catch (error) {
      logger.error('Erro ao enviar boletos via WhatsApp:', error);
      return { sucesso: false, mensagensEnviadas: 0, erros: 1 };
    }
  }

  private static async processarEnvio(
    mensagens: MensagemWhatsApp[],
    servidor: ServidorWhatsApp,
    tipoMensagem: string,
    dias: number,
    tipo: 'antes' | 'mesmo' | 'depois'
  ): Promise<{ enviadas: number; erros: number }> {
    const mensagem = mensagens.find((msg) => msg.tipo === tipoMensagem);
    if (!mensagem || mensagem.tipo_envio === 'desativado') {
      return { enviadas: 0, erros: 0 };
    }

    // Calcular data de vencimento baseada no tipo
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const dataVencimento = new Date(hoje);
    if (tipo === 'antes') {
      dataVencimento.setDate(hoje.getDate() + dias);
    } else if (tipo === 'depois') {
      dataVencimento.setDate(hoje.getDate() - dias);
    }
    
    const proximoDia = new Date(dataVencimento);
    proximoDia.setDate(proximoDia.getDate() + 1);

    const titulos = await Titulo.findAll({
      where: {
        status: 'pendente',
        pago: false,
        data_vencimento: { [Op.gte]: dataVencimento, [Op.lt]: proximoDia }
      },
      include: [
        { model: Cliente, as: 'cliente', required: true },
        { model: Plano, as: 'plano', required: false },
        { model: Banco, as: 'banco', required: false }
      ]
    });

    let enviadas = 0;
    let erros = 0;

    for (const titulo of titulos) {
      try {
        const tituloPlain = titulo.get({ plain: true }) as Titulo & TituloPlainWithRelations;
        const cliente = tituloPlain.cliente;
        
        if (!cliente?.telefone) {
          erros++;
          continue;
        }

        const contratoRef: Contrato | undefined = titulo.contrato_id 
          ? ({ id: titulo.contrato_id } as Contrato)
          : undefined;
        
        // Obter baseUrl para gerar link de pagamento
        const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
        
        const msg = await VariaveisDocumentoService.processarVariaveis(mensagem.mensagem_padrao, {
          cliente,
          contrato: contratoRef,
          titulo,
          dataReferencia: new Date()
        }, baseUrl);

        const telefone = this.formatarTelefone(cliente.telefone);
        
        // Se for WhatsApp Cloud API e houver template configurado, usar template
        if (servidor.tipo_api === 'whatsapp_cloud') {
          const templateName = WhatsAppCloudService.obterTemplateName(servidor, tipoMensagem);
          if (templateName) {
            // Preparar componentes do template com variáveis
            // incluirPdfNoHeader = true se tipo_envio for 'pdf'
            const components = await this.prepararComponentesTemplate({
              servidor,
              cliente,
              contrato: contratoRef,
              titulo,
              mensagemTexto: msg,
              incluirPdfNoHeader: mensagem.tipo_envio === 'pdf'
            });
            
            const enviouTemplate = await WhatsAppCloudService.enviarTemplate(
              servidor,
              telefone,
              templateName,
              'pt_BR',
              components
            );
            
            if (enviouTemplate) {
              enviadas++;
              // Para templates, não enviar interações separadas (já estão no template)
            } else {
              erros++;
            }
            continue;
          }
        }
        
        // Fluxo normal (Evolution API ou WhatsApp Cloud sem template)
        if (mensagem.tipo_envio === 'pdf') {
          const base64 = await TituloController.gerarPdfBase64(titulo);
          if (base64) {
            const enviouPdf = await this.enviarPdfBase64(servidor, telefone, base64, msg);
            if (enviouPdf) {
              enviadas++;
              await this.enviarMensagensInteracao({
                mensagem,
                servidor,
                telefone,
                cliente,
                contrato: contratoRef,
                titulo,
              });
            } else {
              erros++;
            }
          } else {
            logger.error('Falha ao gerar PDF do boleto');
            erros++;
          }
        } else {
          const enviouTexto = await this.enviarMensagem(servidor, telefone, msg);
          if (enviouTexto) {
            enviadas++;
            await this.enviarMensagensInteracao({
              mensagem,
              servidor,
              telefone,
              cliente,
              contrato: contratoRef,
              titulo,
            });
          } else {
            erros++;
          }
        }
      } catch (error) {
        logger.error(`Erro ao enviar boleto ${titulo.id}:`, error);
        erros++;
      }
    }

    return { enviadas, erros };
  }

  private static formatarTelefone(telefone: string): string {
    const apenasNumeros = telefone.replace(/\D/g, '');
    return apenasNumeros.startsWith('55') ? apenasNumeros : `55${apenasNumeros}`;
  }

  private static getBaseUrl(servidor: ServidorWhatsApp): string {
    return servidor.evolution_api_url.replace(/\/$/, '');
  }

  private static async fazerRequisicao(
    url: string,
    servidor: ServidorWhatsApp,
    body: WhatsAppRequestBody
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
        return true;
      } else {
        logger.error('Erro na requisição WhatsApp:', { url, status: response.status, data: responseData });
        return false;
      }
    } catch (error) {
      logger.error('Erro ao fazer requisição WhatsApp:', error);
      return false;
    }
  }

  private static async enviarMensagem(servidor: ServidorWhatsApp, telefone: string, msg: string): Promise<boolean> {
    if (servidor.tipo_api === 'whatsapp_cloud') {
      // Tentar usar template se configurado
      const templateName = WhatsAppCloudService.obterTemplateName(servidor, 'texto');
      if (templateName) {
        // Se houver template configurado, usar template
        // Por enquanto, enviar como texto simples
        return WhatsAppCloudService.enviarTexto(servidor, telefone, msg);
      }
      return WhatsAppCloudService.enviarTexto(servidor, telefone, msg);
    }
    
    // Evolution API
    const baseUrl = this.getBaseUrl(servidor);
    const url = `${baseUrl}/message/sendText/${servidor.instance_name}`;
    return this.fazerRequisicao(url, servidor, { number: telefone, text: msg });
  }

  private static async enviarPdfBase64(
    servidor: ServidorWhatsApp,
    telefone: string,
    base64: string,
    descricao?: string
  ): Promise<boolean> {
    try {
      if (servidor.tipo_api === 'whatsapp_cloud') {
        // WhatsApp Cloud API - usar serviço específico
        return WhatsAppCloudService.enviarDocumento(
          servidor,
          telefone,
          base64,
          'boleto.pdf',
          descricao
        );
      }
      
      // Evolution API
      const baseUrl = this.getBaseUrl(servidor);
      const url = `${baseUrl}/message/sendMedia/${servidor.instance_name}`;
      
      return this.fazerRequisicao(url, servidor, {
        number: telefone,
        mediatype: 'document',
        media: base64,
        fileName: 'boleto.pdf',
        caption: descricao || undefined
      });
    } catch (error) {
      logger.error('Erro ao enviar PDF via WhatsApp:', error);
      return false;
    }
  }

  private static async enviarMensagensInteracao(params: {
    mensagem: MensagemWhatsApp;
    servidor: ServidorWhatsApp;
    telefone: string;
    cliente?: Cliente;
    contrato?: Contrato;
    titulo: Titulo;
  }): Promise<void> {
    const { mensagem, servidor, telefone, cliente, contrato, titulo } = params;
    const interacoes = [mensagem.interacao1, mensagem.interacao2, mensagem.interacao3];

    for (const interacao of interacoes) {
      if (!interacao || !interacao.trim()) {
        continue;
      }

      await this.delay(INTERACTION_DELAY_MS);

            try {
              const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
              const texto = await VariaveisDocumentoService.processarVariaveis(interacao, {
                cliente,
                contrato,
                titulo,
                dataReferencia: new Date(),
              }, baseUrl);

        if (!texto || !texto.trim()) {
          continue;
        }

        const enviou = await this.enviarMensagem(servidor, telefone, texto);
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

  private static async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Preparar componentes do template do WhatsApp Cloud API
   * Suporta templates com HEADER (documento), BODY (variáveis posicionais) e BUTTONS (URL dinâmica)
   */
  private static async prepararComponentesTemplate(params: {
    servidor: ServidorWhatsApp;
    cliente?: Cliente;
    contrato?: Contrato;
    titulo: Titulo;
    mensagemTexto: string;
    incluirPdfNoHeader?: boolean;
  }): Promise<Array<{
    type: 'body' | 'header' | 'button';
    parameters?: Array<{
      type: 'text' | 'currency' | 'date_time' | 'document';
      text?: string;
      currency?: { fallback_value: string; code: string; amount_1000: number };
      date_time?: { fallback_value: string };
      document?: { link?: string; filename?: string };
    }>;
    buttons?: Array<{
      type: 'URL';
      text: string;
      url: string;
      example?: string[];
    }>;
  }>> {
    const { servidor, cliente, titulo, incluirPdfNoHeader = false } = params;
    const components: Array<{
      type: 'body' | 'header' | 'button';
      parameters?: Array<{
        type: 'text' | 'currency' | 'date_time' | 'document';
        text?: string;
        currency?: { fallback_value: string; code: string; amount_1000: number };
        date_time?: { fallback_value: string };
        document?: { link?: string; filename?: string };
      }>;
      buttons?: Array<{
        type: 'URL';
        text: string;
        url: string;
        example?: string[];
      }>;
    }> = [];

    // HEADER com documento (PDF) se solicitado
    if (incluirPdfNoHeader && servidor.tipo_api === 'whatsapp_cloud') {
      try {
        const base64 = await TituloController.gerarPdfBase64(titulo);
        if (base64) {
          // Fazer upload do PDF e obter media ID
          const mediaId = await WhatsAppCloudService.uploadMediaFromBase64(
            servidor,
            base64,
            'document'
          );
          
          if (mediaId) {
            components.push({
              type: 'header',
              parameters: [{
                type: 'document',
                document: {
                  id: mediaId, // Usar media ID do upload
                  filename: 'boleto.pdf'
                }
              }]
            });
          }
        }
      } catch (error) {
        logger.error('Erro ao preparar header com PDF para template:', error);
      }
    }

    // BODY com variáveis posicionais
    // Ordem: {{1}} = razao_social, {{2}} = dias_vencimento, {{3}} = valor, {{4}} = data_vencimento
    const bodyParams: Array<{
      type: 'text' | 'currency' | 'date_time';
      text?: string;
      currency?: { fallback_value: string; code: string; amount_1000: number };
      date_time?: { fallback_value: string };
    }> = [];

    // {{1}} - Razão Social
    if (cliente?.razao_social) {
      bodyParams.push({ type: 'text', text: cliente.razao_social });
    } else {
      bodyParams.push({ type: 'text', text: 'Cliente' });
    }

    // {{2}} - Dias até vencimento
    if (titulo.data_vencimento) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const vencimento = new Date(titulo.data_vencimento);
      vencimento.setHours(0, 0, 0, 0);
      const diffTime = vencimento.getTime() - hoje.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 0) {
        bodyParams.push({ type: 'text', text: `${diffDays} dias` });
      } else if (diffDays === 0) {
        bodyParams.push({ type: 'text', text: 'hoje' });
      } else {
        bodyParams.push({ type: 'text', text: `${Math.abs(diffDays)} dias atrás` });
      }
    } else {
      bodyParams.push({ type: 'text', text: 'N/A' });
    }

    // {{3}} - Valor
    if (titulo.valor_final) {
      const valor = parseFloat(String(titulo.valor_final));
      bodyParams.push({
        type: 'currency',
        currency: {
          fallback_value: `R$ ${valor.toFixed(2)}`,
          code: 'BRL',
          amount_1000: Math.round(valor * 1000)
        }
      });
    } else {
      bodyParams.push({ type: 'text', text: 'R$ 0,00' });
    }

    // {{4}} - Data de vencimento
    if (titulo.data_vencimento) {
      const dataFormatada = new Date(titulo.data_vencimento).toLocaleDateString('pt-BR');
      bodyParams.push({ type: 'text', text: dataFormatada });
    } else {
      bodyParams.push({ type: 'text', text: 'N/A' });
    }

    if (bodyParams.length > 0) {
      components.push({
        type: 'body',
        parameters: bodyParams
      });
    }

    // BUTTONS com URL dinâmica (opcional)
    // Exemplo: botão de pagamento com URL que inclui ID do cliente
    if (cliente?.id) {
      components.push({
        type: 'button',
        buttons: [{
          type: 'URL',
          text: 'Revisar e Pagar',
          url: `https://luminoustelecom.com.br/payment${cliente.id}`,
          example: ['https://luminoustelecom.com.br/']
        }]
      });
    }

    return components;
  }
}

