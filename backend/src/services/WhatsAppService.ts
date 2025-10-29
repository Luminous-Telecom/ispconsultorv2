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

      // Processar mensagens ANTES do vencimento
      if (config.antesVencimento) {
        for (const dias of config.antesVencimento) {
          const tipo = `${String(dias).padStart(2, '0')}_dias_antes_vencimento`;
          const resultado = await this.processarEnvio(mensagens, servidor, tipo, dias, 'antes');
          mensagensEnviadas += resultado.enviadas;
          erros += resultado.erros;
        }
      }

      // Processar MESMO DIA
      if (config.mesmoDia) {
        const resultado = await this.processarEnvio(mensagens, servidor, 'mesmo_dia_vencimento', 0, 'mesmo');
        mensagensEnviadas += resultado.enviadas;
        erros += resultado.erros;
      }

      // Processar mensagens DEPOIS do vencimento
      if (config.depoisVencimento) {
        for (const dias of config.depoisVencimento) {
          const tipo = `${String(dias).padStart(2, '0')}_dias_depois_vencimento`;
          const resultado = await this.processarEnvio(mensagens, servidor, tipo, dias, 'depois');
          mensagensEnviadas += resultado.enviadas;
          erros += resultado.erros;
        }
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

    // Calcular data
    const hoje = new Date();
    const dataBusca = new Date();
    
    if (tipo === 'antes') {
      dataBusca.setDate(hoje.getDate() + dias);
    } else if (tipo === 'depois') {
      dataBusca.setDate(hoje.getDate() - dias);
    }
    
    dataBusca.setHours(0, 0, 0, 0);
    const proximoDia = new Date(dataBusca);
    proximoDia.setDate(proximoDia.getDate() + 1);

    // Buscar títulos
    const { Op } = await import('sequelize');
    const titulos = await Titulo.findAll({
      where: {
        status: 'pendente',
        pago: false,
        data_vencimento: { [Op.gte]: dataBusca, [Op.lt]: proximoDia }
      },
      include: [
        { model: Cliente, as: 'cliente', required: true },
        { model: Plano, as: 'plano', required: false }
      ]
    });

    logger.info(`Encontrados ${titulos.length} títulos para ${tipoMensagem}`);

    let enviadas = 0;
    let erros = 0;

    // Enviar para cada título
    for (const titulo of titulos) {
      try {
        const tituloData = titulo.get({ plain: true }) as any;
        const cliente = tituloData.cliente as Cliente;
        
      if (!cliente?.telefone) {
        erros++;
        continue;
      }

        // Usar o serviço existente para processar variáveis
        const msg = await VariaveisDocumentoService.processarVariaveis(mensagem.mensagem_padrao, {
          cliente,
          titulo,
          dataReferencia: new Date()
        });

        let telefone = cliente.telefone.replace(/\D/g, '');
        
        // Adicionar código do país (55 = Brasil) se não tiver
        if (!telefone.startsWith('55')) {
          telefone = '55' + telefone;
        }
        
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
        erros++;
      }
    }

    return { enviadas, erros };
  }

  private static async enviarMensagem(servidor: ServidorWhatsApp, telefone: string, msg: string): Promise<boolean> {
    try {
      const baseUrl = servidor.evolution_api_url.replace(/\/$/, '');
      const url = `${baseUrl}/message/sendText/${servidor.instance_name}`;
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), servidor.timeout);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': servidor.evolution_api_key },
        body: JSON.stringify({ number: telefone, text: msg }),
        signal: controller.signal
      });

      clearTimeout(timeout);
      return response.ok;
    } catch (error: unknown) {
      return false;
    }
  }

  private static async enviarPdf(servidor: ServidorWhatsApp, telefone: string, urlBoleto: string): Promise<boolean> {
    try {
      const response = await fetch(urlBoleto);
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');

      const baseUrl = servidor.evolution_api_url.replace(/\/$/, '');
      const url = `${baseUrl}/message/sendMedia/${servidor.instance_name}`;
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), servidor.timeout);

      const sendResponse = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': servidor.evolution_api_key },
        body: JSON.stringify({
          number: telefone,
          mediatype: 'document',
          media: `data:application/pdf;base64,${base64}`,
          fileName: 'boleto.pdf'
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);
      return sendResponse.ok;
    } catch {
      return false;
    }
  }
}

