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
        status: { [Op.in]: ['pendente', 'vencido'] },
        pago: false,
        data_vencimento: { [Op.gte]: dataVencimento, [Op.lt]: proximoDia }
      },
      include: [
        { model: Cliente, as: 'cliente', required: true, where: { ativo: true } },
        { model: Plano, as: 'plano', required: false },
        { model: Banco, as: 'banco', required: false }
      ],
      order: [['data_vencimento', 'ASC'], ['id', 'ASC']]
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
        
        const baseUrl = process.env.BASE_URL;
        if (!baseUrl) {
          logger.error('BASE_URL não configurada nas variáveis de ambiente');
          erros++;
          continue;
        }
        
        const msg = await VariaveisDocumentoService.processarVariaveis(mensagem.mensagem_padrao, {
          cliente,
          contrato: contratoRef,
          titulo,
          dataReferencia: new Date()
        }, baseUrl);

        const telefone = this.formatarTelefone(cliente.telefone);
        
        // Se for WhatsApp Cloud API, usar APENAS template (não enviar texto simples)
        if (servidor.tipo_api === 'whatsapp_cloud') {
          const templateInfo = WhatsAppCloudService.obterTemplateInfo(mensagem.template_mapping);
          if (templateInfo) {
            const incluirPdfNoHeader = mensagem.tipo_envio === 'pdf' || templateInfo.name === 'fatura_pdf';
            
            const components = await this.prepararComponentesTemplate({
              servidor,
              cliente,
              contrato: contratoRef,
              titulo,
              mensagemTexto: msg,
              incluirPdfNoHeader,
              variables: templateInfo.variables // Passar mapeamento de variáveis configurado
            });
            
            const enviouTemplate = await WhatsAppCloudService.enviarTemplate(
              servidor,
              telefone,
              templateInfo.name,
              templateInfo.language,
              components
            );
            
            if (enviouTemplate) {
              enviadas++;
              continue;
            } else {
              erros++;
              continue;
            }
          } else {
            // WhatsApp Cloud API requer template configurado - não enviar se não houver
            // Não contar como erro, apenas pular (mensagem pode estar desativada ou aguardando configuração)
            continue;
          }
        }
        
        // Fluxo normal (apenas Evolution API)
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
              const baseUrl = process.env.BASE_URL;
              if (!baseUrl) {
                logger.warn('BASE_URL não configurada, pulando processamento de variáveis');
                continue;
              }
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
    variables?: string[]; // Mapeamento de variáveis configurado pelo usuário
  }): Promise<Array<{
    type: 'body' | 'header' | 'button';
    parameters?: Array<{
      type: 'text' | 'currency' | 'date_time' | 'document';
      text?: string;
      currency?: { fallback_value: string; code: string; amount_1000: number };
      date_time?: { fallback_value: string };
      document?: { link?: string; id?: string; filename?: string };
    }>;
    sub_type?: 'url' | 'quick_reply';
    index?: number;
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
        document?: { link?: string; id?: string; filename?: string };
      }>;
      sub_type?: 'url' | 'quick_reply';
      index?: number;
      buttons?: Array<{
        type: 'URL';
        text: string;
        url: string;
        example?: string[];
      }>;
    }> = [];

    if (incluirPdfNoHeader && servidor.tipo_api === 'whatsapp_cloud') {
      try {
        const base64 = await TituloController.gerarPdfBase64(titulo);
        if (base64) {
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
                document: { id: mediaId, filename: 'boleto.pdf' }
              }]
            });
          }
        }
      } catch (error) {
        logger.error('Erro ao preparar header com PDF para template:', error);
      }
    }

    const bodyParams: Array<{
      type: 'text' | 'currency' | 'date_time';
      text?: string;
      currency?: { fallback_value: string; code: string; amount_1000: number };
      date_time?: { fallback_value: string };
    }> = [];

    const variables = params.variables || ['cliente.razao_social', 'titulo.valor_final', 'titulo.data_vencimento', 'dias_vencimento'];

    const calcularDiasVencimento = (): string => {
      if (!titulo.data_vencimento) return 'N/A';
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const vencimento = new Date(titulo.data_vencimento);
      vencimento.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 0) return `${diffDays} dias`;
      if (diffDays === 0) return 'hoje';
      return `${Math.abs(diffDays)} dias atrás`;
    };

    const diasVencimento = calcularDiasVencimento();

    for (const variable of variables) {
      switch (variable) {
        case 'cliente.razao_social':
          bodyParams.push({ type: 'text', text: cliente?.razao_social || 'Cliente' });
          break;
        case 'titulo.valor_final': {
          const valor = titulo.valor_final ? parseFloat(String(titulo.valor_final)) : 0;
          bodyParams.push({ type: 'text', text: valor.toFixed(2) });
          break;
        }
        case 'titulo.valor_final_currency': {
          const valor = titulo.valor_final ? parseFloat(String(titulo.valor_final)) : 0;
          bodyParams.push({
            type: 'currency',
            currency: {
              fallback_value: `R$ ${valor.toFixed(2)}`,
              code: 'BRL',
              amount_1000: Math.round(valor * 1000)
            }
          });
          break;
        }
        case 'titulo.data_vencimento': {
          const texto = titulo.data_vencimento 
            ? new Date(titulo.data_vencimento).toLocaleDateString('pt-BR')
            : 'N/A';
          bodyParams.push({ type: 'text', text: texto });
          break;
        }
        case 'dias_vencimento':
          bodyParams.push({ type: 'text', text: diasVencimento });
          break;
        default:
          logger.warn(`Variável desconhecida no template: ${variable}`);
          bodyParams.push({ type: 'text', text: '' });
      }
    }

    if (bodyParams.length > 0) {
      components.push({
        type: 'body',
        parameters: bodyParams
      });
    }

    // BUTTONS com URL dinâmica - se o template tiver botão URL, precisamos enviar o parâmetro
    // O template fatura_pdf tem um botão URL com {{1}} na URL que precisa do path completo do link de pagamento
    // Gerar link de pagamento público completo e extrair o path (sem o domínio)
    try {
      const baseUrl = process.env.BASE_URL;
      if (!baseUrl) {
        logger.warn('BASE_URL não configurada, não será possível gerar link de pagamento no template');
        return components;
      }
      
      if (!titulo?.id) {
        return components;
      }
      
      const linkPagamento = TituloController.gerarLinkPagamentoPublico(titulo.id, baseUrl);
      const pathCompleto = new URL(linkPagamento).pathname;
      
      if (pathCompleto) {
        const pathParaTemplate = pathCompleto.startsWith('/') ? pathCompleto.substring(1) : pathCompleto;
        components.push({
          type: 'button',
          sub_type: 'url',
          index: 0,
          parameters: [{ type: 'text', text: pathParaTemplate }]
        });
      }
    } catch (error) {
      logger.warn('Erro ao preparar componente button para template:', error);
    }

    return components;
  }

  /**
   * Enviar título manualmente via WhatsApp usando mensagem_manual
   */
  static async enviarTituloManual(tituloId: number): Promise<{ sucesso: boolean; mensagem?: string }> {
    try {
      const titulo = await Titulo.findByPk(tituloId, {
        include: [
          { model: Cliente, as: 'cliente' },
          { model: Plano, as: 'plano' },
          { model: Banco, as: 'banco' }
        ]
      });

      if (!titulo) {
        return { sucesso: false, mensagem: 'Título não encontrado' };
      }

      const tituloPlain = titulo.get({ plain: true }) as TituloPlainWithRelations;
      const cliente = tituloPlain.cliente;

      if (!cliente) {
        return { sucesso: false, mensagem: 'Cliente não encontrado' };
      }

      if (!cliente.telefone) {
        return { sucesso: false, mensagem: 'Cliente não possui telefone cadastrado' };
      }

      const servidor = await ServidorWhatsApp.findOne({ where: { ativo: true } });
      if (!servidor) {
        return { sucesso: false, mensagem: 'Nenhum servidor WhatsApp ativo encontrado' };
      }


      const mensagem = await MensagemWhatsApp.findOne({ 
        where: { tipo: 'envio_manual', ativo: true } 
      });

      if (!mensagem) {
        return { sucesso: false, mensagem: 'Mensagem de envio manual não configurada' };
      }

      const contratoRef: Contrato | undefined = titulo.contrato_id 
        ? ({ id: titulo.contrato_id } as Contrato)
        : undefined;
      
      const baseUrl = process.env.BASE_URL;
      if (!baseUrl) {
        return { sucesso: false, mensagem: 'BASE_URL não configurada' };
      }

      const telefone = this.formatarTelefone(cliente.telefone);
      
      const mensagemTexto = mensagem.mensagem_manual || mensagem.mensagem_padrao || '';
      
      if (servidor.tipo_api === 'whatsapp_cloud') {
        const templateInfo = WhatsAppCloudService.obterTemplateInfo(mensagem.template_mapping);
        if (!templateInfo) {
          return { sucesso: false, mensagem: 'Template não configurado para WhatsApp Cloud API' };
        }

        let msg = mensagemTexto;
        if (mensagemTexto) {
          msg = await VariaveisDocumentoService.processarVariaveis(mensagemTexto, {
            cliente,
            contrato: contratoRef,
            titulo,
            dataReferencia: new Date()
          }, baseUrl);
        }

        const components = await this.prepararComponentesTemplate({
          servidor,
          cliente,
          contrato: contratoRef,
          titulo,
          mensagemTexto: msg,
          incluirPdfNoHeader: mensagem.tipo_envio === 'pdf' || templateInfo.name === 'fatura_pdf',
          variables: templateInfo.variables
        });

        const enviouTemplate = await WhatsAppCloudService.enviarTemplate(
          servidor,
          telefone,
          templateInfo.name,
          templateInfo.language,
          components
        );

        return enviouTemplate
          ? { sucesso: true, mensagem: 'Mensagem enviada com sucesso' }
          : { sucesso: false, mensagem: 'Erro ao enviar mensagem via template' };
      }

      if (!mensagemTexto) {
        return { sucesso: false, mensagem: 'Mensagem de envio manual não configurada' };
      }

      const msg = await VariaveisDocumentoService.processarVariaveis(mensagemTexto, {
        cliente,
        contrato: contratoRef,
        titulo,
        dataReferencia: new Date()
      }, baseUrl);
      
      if (mensagem.tipo_envio === 'pdf') {
        const base64 = await TituloController.gerarPdfBase64(titulo);
        if (!base64) {
          return { sucesso: false, mensagem: 'Erro ao gerar PDF do boleto' };
        }
        const enviouPdf = await this.enviarPdfBase64(servidor, telefone, base64, msg);
        if (!enviouPdf) {
          return { sucesso: false, mensagem: 'Erro ao enviar PDF' };
        }
        await this.enviarMensagensInteracao({
          mensagem,
          servidor,
          telefone,
          cliente,
          contrato: contratoRef,
          titulo,
        });
        return { sucesso: true, mensagem: 'Mensagem enviada com sucesso' };
      }

      const enviouTexto = await this.enviarMensagem(servidor, telefone, msg);
      if (!enviouTexto) {
        return { sucesso: false, mensagem: 'Erro ao enviar mensagem' };
      }
      await this.enviarMensagensInteracao({
        mensagem,
        servidor,
        telefone,
        cliente,
        contrato: contratoRef,
        titulo,
      });
      return { sucesso: true, mensagem: 'Mensagem enviada com sucesso' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao enviar título manual via WhatsApp:', { 
        tituloId, 
        error: errorMessage, 
        stack: errorStack 
      });
      return { sucesso: false, mensagem: `Erro interno ao enviar mensagem: ${errorMessage}` };
    }
  }
}

