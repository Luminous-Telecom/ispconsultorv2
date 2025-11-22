import { Op } from 'sequelize';
import { ServidorEmail } from '../models/ServidorEmail';
import { MensagemEmail } from '../models/MensagemEmail';
import { Titulo } from '../models/Titulo';
import { Cliente } from '../models/Cliente';
import { Plano } from '../models/Plano';
import { Banco } from '../models/Banco';
import { Contrato } from '../models/Contrato';
import { logger } from '../utils/logger';
import { VariaveisDocumentoService } from './VariaveisDocumentoService';
import nodemailer, { SendMailOptions } from 'nodemailer';
import { TituloPDFController } from '../controllers/titulos/TituloPDFController';
import { parseDateFromDb, formatDate } from '../utils/dateUtils';

interface ConfiguracoesEnvios {
  antesVencimento?: number[];
  mesmoDia?: boolean;
  depoisVencimento?: number[];
}

export class EmailService {
  static async enviarBoletos(config: ConfiguracoesEnvios): Promise<{
    sucesso: boolean;
    emailsEnviados: number;
    erros: number;
  }> {
    try {
      const servidor = await ServidorEmail.findOne({ where: { ativo: true } });
      if (!servidor) {
        return { sucesso: false, emailsEnviados: 0, erros: 0 };
      }

      const mensagens = await MensagemEmail.findAll({ where: { ativo: true } });
      if (mensagens.length === 0) {
        return { sucesso: false, emailsEnviados: 0, erros: 0 };
      }

      let emailsEnviados = 0;
      let erros = 0;

      const envios = [
        ...(config.antesVencimento?.map(dias => ({ dias, tipo: 'antes' as const, tipoMensagem: `${String(dias).padStart(2, '0')}_dias_antes_vencimento` })) || []),
        ...(config.mesmoDia ? [{ dias: 0, tipo: 'mesmo' as const, tipoMensagem: 'mesmo_dia_vencimento' }] : []),
        ...(config.depoisVencimento?.map(dias => ({ dias, tipo: 'depois' as const, tipoMensagem: `${String(dias).padStart(2, '0')}_dias_depois_vencimento` })) || [])
      ];

      for (const envio of envios) {
        const resultado = await this.processarEnvio(mensagens, servidor, envio.tipoMensagem, envio.dias, envio.tipo);
        emailsEnviados += resultado.enviadas;
        erros += resultado.erros;
      }

      return { sucesso: emailsEnviados > 0, emailsEnviados, erros };
    } catch (error) {
      logger.error('Erro ao enviar boletos via Email:', error);
      return { sucesso: false, emailsEnviados: 0, erros: 1 };
    }
  }

  private static async processarEnvio(
    mensagens: MensagemEmail[],
    servidor: ServidorEmail,
    tipoMensagem: string,
    dias: number,
    tipo: 'antes' | 'mesmo' | 'depois'
  ): Promise<{ enviadas: number; erros: number }> {
    const mensagem = mensagens.find((msg) => msg.tipo === tipoMensagem);
    if (!mensagem || mensagem.tipo_envio === 'desativado') {
      return { enviadas: 0, erros: 0 };
    }

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
        const tituloPlain = titulo.get({ plain: true }) as Titulo & { cliente: Cliente };
        const cliente = tituloPlain.cliente;
        
        if (!cliente?.email) {
          erros++;
          continue;
        }

        let corpoHtml = '';
        if (mensagem?.mensagem_padrao) {
          const contratoRef: (Partial<Contrato> & { id: number }) | undefined = titulo.contrato_id ? { id: titulo.contrato_id } : undefined;
          
          // Obter baseUrl para gerar link de pagamento
          const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
          
          corpoHtml = await VariaveisDocumentoService.processarVariaveis(mensagem.mensagem_padrao, {
            cliente,
            contrato: contratoRef,
            titulo,
            dataReferencia: new Date()
          }, baseUrl);
        } else {
          // Corpo padrão simples
          const dataVenc = formatDate(parseDateFromDb(titulo.data_vencimento)) || '';
          const valor = Number(titulo.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
          corpoHtml = `
            <div style="font-family: Arial, sans-serif; font-size: 14px;">
              <p>Olá, ${cliente.razao_social || cliente.nome_fantasia || 'cliente'}.</p>
              <p>Sua fatura está disponível.</p>
              <p><strong>Vencimento:</strong> ${dataVenc}<br/>
              <strong>Valor:</strong> R$ ${valor}</p>
              ${titulo.linha_digitavel ? `<p><strong>Linha Digitável:</strong><br/>${titulo.linha_digitavel}</p>` : ''}
              <p>Em anexo, o boleto em PDF.</p>
            </div>
          `;
        }

        let base64Pdf: string | undefined = undefined;
        if ((mensagem && mensagem.tipo_envio === 'pdf') || !mensagem) {
          const pdf = await TituloPDFController.gerarPdfBase64(titulo);
          if (pdf) {
            base64Pdf = pdf;
          } else {
            logger.error('Falha ao gerar PDF do boleto para email');
          }
        }
        const enviou = await this.enviarEmail(servidor, cliente.email, corpoHtml, base64Pdf);
        
        if (enviou) {
          enviadas++;
        } else {
          erros++;
        }
      } catch (error) {
        logger.error(`Erro ao enviar boleto ${titulo.id}:`, error);
        erros++;
      }
    }

    return { enviadas, erros };
  }

  private static async enviarEmail(
    servidor: ServidorEmail, 
    emailDestino: string, 
    mensagem: string,
    base64Pdf?: string
  ): Promise<boolean> {
    try {
      const transporter = nodemailer.createTransport({
        host: servidor.host,
        port: servidor.porta,
        secure: servidor.ssl,
        auth: {
          user: servidor.usuario,
          pass: servidor.senha
        },
        tls: servidor.tls ? {
          rejectUnauthorized: false
        } : undefined
      });

      const mailOptions: SendMailOptions = {
        from: `"${servidor.nome_remetente}" <${servidor.email_remetente}>`,
        to: emailDestino,
        subject: `${servidor.nome_remetente} - Boleto de Pagamento`,
        html: mensagem || '<p>Boleto em anexo.</p>',
        text: 'Seu cliente de email não suporta HTML. Por favor, visualize o anexo PDF.'
      };

      if (base64Pdf) {
        mailOptions.attachments = [{
          filename: 'boleto.pdf',
          content: base64Pdf,
          encoding: 'base64',
          contentType: 'application/pdf'
        }];
      }

      const result = await transporter.sendMail(mailOptions);
      logger.info('Email enviado com sucesso:', { 
        messageId: result.messageId,
        to: emailDestino,
        temAnexo: !!base64Pdf,
        tamanhoMensagem: mensagem?.length || 0
      });
      return true;
    } catch (error) {
      logger.error('Erro ao enviar email:', error);
      return false;
    }
  }

  /**
   * Enviar título manualmente via Email usando mensagem_manual
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

      const tituloPlain = titulo.get({ plain: true }) as Titulo & { cliente: Cliente };
      const cliente = tituloPlain.cliente;

      if (!cliente) {
        return { sucesso: false, mensagem: 'Cliente não encontrado' };
      }

      if (!cliente.email) {
        return { sucesso: false, mensagem: 'Cliente não possui email cadastrado' };
      }

      const servidor = await ServidorEmail.findOne({ where: { ativo: true } });
      if (!servidor) {
        return { sucesso: false, mensagem: 'Nenhum servidor de email ativo encontrado' };
      }

      const mensagem = await MensagemEmail.findOne({ 
        where: { tipo: 'envio_manual', ativo: true } 
      });

      if (!mensagem) {
        return { sucesso: false, mensagem: 'Mensagem de envio manual não configurada' };
      }

      // Para envio_manual, priorizar mensagem_manual, mas usar mensagem_padrao como fallback
      let mensagemTexto = mensagem.mensagem_manual;
      
      // Se mensagem_manual estiver vazia ou inválida, usar mensagem_padrao
      if (!mensagemTexto || mensagemTexto.trim() === '' || mensagemTexto.trim() === '<p></p>') {
        mensagemTexto = mensagem.mensagem_padrao;
      }
      
      if (!mensagemTexto || mensagemTexto.trim() === '' || mensagemTexto.trim() === '<p></p>') {
        logger.warn('Mensagem de envio manual não configurada:', { 
          tituloId,
          temMensagemManual: !!mensagem.mensagem_manual,
          temMensagemPadrao: !!mensagem.mensagem_padrao,
          mensagemManualPreview: mensagem.mensagem_manual?.substring(0, 100),
          mensagemPadraoPreview: mensagem.mensagem_padrao?.substring(0, 100)
        });
        return { sucesso: false, mensagem: 'Mensagem de envio manual não configurada. Configure a mensagem manual ou a mensagem padrão.' };
      }

      // Verificar se a mensagem tem conteúdo real (não só tags HTML vazias)
      const mensagemSemTags = mensagemTexto.replace(/<[^>]*>/g, '').trim();
      
      if (mensagemSemTags === '' || mensagemSemTags.length < 3) {
        logger.warn('Mensagem contém apenas tags HTML vazias:', { 
          tituloId,
          mensagemOriginal: mensagemTexto.substring(0, 200),
          mensagemSemTags: mensagemSemTags
        });
        return { sucesso: false, mensagem: 'Mensagem de envio manual está vazia ou contém apenas tags HTML vazias. Adicione conteúdo à mensagem.' };
      }

      const contratoRef: (Partial<Contrato> & { id: number }) | undefined = titulo.contrato_id 
        ? { id: titulo.contrato_id } 
        : undefined;
      
      const baseUrl = process.env.BASE_URL;
      if (!baseUrl) {
        return { sucesso: false, mensagem: 'BASE_URL não configurada' };
      }
      
      const corpoHtml = await VariaveisDocumentoService.processarVariaveis(mensagemTexto, {
        cliente,
        contrato: contratoRef,
        titulo,
        dataReferencia: new Date()
      }, baseUrl);

      // Verificar se após processamento a mensagem ainda tem conteúdo
      const corpoHtmlSemTags = corpoHtml?.replace(/<[^>]*>/g, '').trim() || '';
      
      if (!corpoHtml || corpoHtml.trim() === '' || corpoHtmlSemTags.length < 3) {
        logger.warn('Mensagem HTML vazia após processamento:', { 
          tituloId, 
          mensagemOriginal: mensagemTexto.substring(0, 200),
          corpoHtml: corpoHtml?.substring(0, 200) || 'VAZIO',
          corpoHtmlSemTags: corpoHtmlSemTags
        });
        return { sucesso: false, mensagem: 'Mensagem vazia ou inválida após processamento. Verifique se a mensagem manual está configurada corretamente.' };
      }

      let base64Pdf: string | undefined = undefined;
      if (mensagem.tipo_envio === 'pdf') {
        const pdf = await TituloPDFController.gerarPdfBase64(titulo);
        if (pdf) {
          base64Pdf = pdf;
        } else {
          logger.warn('Erro ao gerar PDF do boleto, enviando apenas a mensagem');
        }
      }

      logger.info('Enviando email manual:', { 
        email: cliente.email, 
        temMensagem: !!corpoHtml,
        tamanhoMensagem: corpoHtml.length,
        temPdf: !!base64Pdf,
        tipoEnvio: mensagem.tipo_envio
      });

      const enviou = await this.enviarEmail(servidor, cliente.email, corpoHtml, base64Pdf);
      
      if (enviou) {
        return { sucesso: true, mensagem: 'Email enviado com sucesso' };
      } else {
        return { sucesso: false, mensagem: 'Erro ao enviar email' };
      }
    } catch (error) {
      logger.error('Erro ao enviar título manual via Email:', error);
      return { sucesso: false, mensagem: 'Erro interno ao enviar email' };
    }
  }
}

