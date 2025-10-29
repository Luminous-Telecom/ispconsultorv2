import { Op } from 'sequelize';
import { ServidorWhatsApp } from '../models/ServidorWhatsApp';
import { MensagemWhatsApp } from '../models/MensagemWhatsApp';
import { Titulo } from '../models/Titulo';
import { Cliente } from '../models/Cliente';
import { Plano } from '../models/Plano';
import { logger } from '../utils/logger';
import { VariaveisDocumentoService } from './VariaveisDocumentoService';

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
        logger.warn('Nenhum servidor de WhatsApp ativo encontrado');
        return { sucesso: false, mensagensEnviadas: 0, erros: 0 };
      }

      const mensagens = await MensagemWhatsApp.findAll({ where: { ativo: true } });
      if (mensagens.length === 0) {
        logger.warn('Nenhuma mensagem de WhatsApp configurada');
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
    } catch (error: unknown) {
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
        { model: Plano, as: 'plano', required: false }
      ]
    });

    let enviadas = 0;
    let erros = 0;

    for (const titulo of titulos) {
      try {
        const cliente = (titulo.get({ plain: true }) as any).cliente as Cliente;
        
        if (!cliente?.telefone) {
          erros++;
          continue;
        }

        const msg = await VariaveisDocumentoService.processarVariaveis(mensagem.mensagem_padrao, {
          cliente,
          titulo,
          dataReferencia: new Date()
        });

        const telefone = this.formatarTelefone(cliente.telefone);
        const enviou = await this.enviarMensagem(servidor, telefone, msg);
        
        if (enviou) {
          if (mensagem.tipo_envio === 'pdf' && titulo.url_boleto) {
            await this.enviarPdf(servidor, telefone, titulo.url_boleto);
          }
          enviadas++;
        } else {
          erros++;
        }
      } catch (error: unknown) {
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
    body: any
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
      return response.ok;
    } catch {
      return false;
    }
  }

  private static async enviarMensagem(servidor: ServidorWhatsApp, telefone: string, msg: string): Promise<boolean> {
    const baseUrl = this.getBaseUrl(servidor);
    const url = `${baseUrl}/message/sendText/${servidor.instance_name}`;
    return this.fazerRequisicao(url, servidor, { number: telefone, text: msg });
  }

  private static async enviarPdf(servidor: ServidorWhatsApp, telefone: string, urlBoleto: string): Promise<boolean> {
    try {
      const response = await fetch(urlBoleto);
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');

      const baseUrl = this.getBaseUrl(servidor);
      const url = `${baseUrl}/message/sendMedia/${servidor.instance_name}`;
      
      return this.fazerRequisicao(url, servidor, {
        number: telefone,
        mediatype: 'document',
        media: `data:application/pdf;base64,${base64}`,
        fileName: 'boleto.pdf'
      });
    } catch {
      return false;
    }
  }
}

