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
        const msg = await VariaveisDocumentoService.processarVariaveis(mensagem.mensagem_padrao, {
          cliente,
          contrato: contratoRef,
          titulo,
          dataReferencia: new Date()
        });

        const telefone = this.formatarTelefone(cliente.telefone);
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

    let jaEnviouAlguma = false;

    for (const interacao of interacoes) {
      if (!interacao || !interacao.trim()) {
        continue;
      }

      if (jaEnviouAlguma) {
        await this.delay(INTERACTION_DELAY_MS);
      }

      try {
        const texto = await VariaveisDocumentoService.processarVariaveis(interacao, {
          cliente,
          contrato,
          titulo,
          dataReferencia: new Date(),
        });

        if (!texto || !texto.trim()) {
          continue;
        }

        const enviou = await this.enviarMensagem(servidor, telefone, texto);
        jaEnviouAlguma = true;

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
}

