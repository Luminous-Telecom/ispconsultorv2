import { Op } from 'sequelize';
import { ServidorEmail } from '../models/ServidorEmail';
import { MensagemEmail } from '../models/MensagemEmail';
import { Titulo } from '../models/Titulo';
import { Cliente } from '../models/Cliente';
import { Plano } from '../models/Plano';
import { Banco } from '../models/Banco';
import { logger } from '../utils/logger';
import { VariaveisDocumentoService } from './VariaveisDocumentoService';
import nodemailer from 'nodemailer';
import { TituloController } from '../controllers/TituloController';

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
    } catch (error: unknown) {
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
        const cliente = (titulo.get({ plain: true }) as any).cliente as Cliente;
        
        if (!cliente?.email) {
          erros++;
          continue;
        }

        let corpoHtml = '';
        if (mensagem?.mensagem_padrao) {
          const contratoRef = (titulo as any).contrato_id ? { id: (titulo as any).contrato_id } : undefined;
          corpoHtml = await VariaveisDocumentoService.processarVariaveis(mensagem.mensagem_padrao, {
            cliente,
            contrato: contratoRef as any,
            titulo,
            dataReferencia: new Date()
          });
        } else {
          // Corpo padrão simples
          const dataVenc = new Date(titulo.data_vencimento).toLocaleDateString('pt-BR');
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
          const pdf = await TituloController.gerarPdfBase64(titulo);
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
      } catch (error: unknown) {
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

      const mailOptions: any = {
        from: `"${servidor.nome_remetente}" <${servidor.email_remetente}>`,
        to: emailDestino,
        subject: 'Boleto de Pagamento - BackNet',
        html: mensagem
      };

      if (base64Pdf) {
        mailOptions.attachments = [{
          filename: 'boleto.pdf',
          content: base64Pdf,
          encoding: 'base64',
          contentType: 'application/pdf'
        }];
      }

      await transporter.sendMail(mailOptions);
      return true;
    } catch (error: unknown) {
      logger.error('Erro ao enviar email:', error);
      return false;
    }
  }
}

