import { Op } from 'sequelize';
import { ServidorEmail } from '../../../models/comunicacao/ServidorEmail';
import { MensagemEmail } from '../../../models/comunicacao/MensagemEmail';
import { registrarMensagemHistorico, type ContextoHistorico } from '../RegistroMensagemHistoricoService';
import { Titulo } from '../../../models/financeiro/Titulo';
import { Cliente } from '../../../models/clientes/Cliente';
import { Plano } from '../../../models/cadastros/Plano';
import { Banco } from '../../../models/cadastros/Banco';
import { Contrato } from '../../../models/contratos/Contrato';
import { logger } from '../../../utils/logger';
import { VariaveisDocumentoService } from '../../documentos/VariaveisDocumentoService';
import { registrarMensagemElasticsearch } from '../../elasticsearch/MensagemHistoricoElasticsearchService';
import nodemailer, { SendMailOptions } from 'nodemailer';
import { TituloPDFController } from '../../../controllers/titulos/TituloPDFController';
import type { TituloComRelacoes } from '../../../controllers/titulos/TituloHelpers/types';
import { parseDateFromDb, formatDate } from '../../../utils/dateUtils';

interface ConfiguracoesEnvios {
  antesVencimento?: number[];
  mesmoDia?: boolean;
  depoisVencimento?: number[];
}

export class EmailService {
  private static stripHtml(html: string): string {
    // Remove scripts e estilos primeiro
    let cleaned = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // Remove todas as tags HTML
    cleaned = cleaned.replace(/<\/?[^>]+(>|$)/g, '');

    // Decodifica entidades HTML comuns
    cleaned = cleaned
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/')
      .replace(/&#x60;/g, '`')
      .replace(/&#x3D;/g, '=')
      .replace(/&\w+;/g, ' '); // Remove outras entidades HTML

    // Limpa espaços e quebras de linha
    cleaned = cleaned
      .replace(/\s+/g, ' ') // Remove espaços múltiplos
      .replace(/\n\s*\n/g, '\n') // Remove linhas vazias extras
      .trim();

    return cleaned;
  }

  /**
   * @param options.saas - Se true, usa saas_saas_titulos e saas_saas_dados_empresa
   * @param options.empresa_id - Filtra títulos por empresa (ERP)
   */
  static async enviarBoletos(config: ConfiguracoesEnvios, options?: { saas?: boolean; empresa_id?: number }): Promise<{
    sucesso: boolean;
    emailsEnviados: number;
    erros: number;
  }> {
    const saas = options?.saas ?? false;
    const empresaId = options?.empresa_id;
    try {
      let servidor: ServidorEmail;
      if (saas) {
        const SaasServidorEmail = (await import('../../../models/saas/SaasServidorEmail')).default;
        const saasSrv = await SaasServidorEmail.findOne({ where: { status: 'ativo' } });
        if (!saasSrv) {
          return { sucesso: false, emailsEnviados: 0, erros: 0 };
        }
        const srv = saasSrv.get({ plain: true }) as Record<string, unknown>;
        servidor = {
          id: saasSrv.id,
          host: (srv.host_smtp as string) || '',
          porta: saasSrv.porta,
          usuario: saasSrv.usuario,
          senha: (srv.senha as string) || (srv.senha_criptografada as string) || '',
          ssl: saasSrv.ssl,
          tls: false,
          nome_remetente: saasSrv.nome,
          email_remetente: saasSrv.usuario,
          ativo: true,
          timeout: 30000,
          tentativas: 1,
          intervalo_tentativas: 0,
        } as unknown as ServidorEmail;
      } else {
        const whereSrv = empresaId != null
          ? { ativo: true, [Op.or]: [{ empresa_id: empresaId }, { empresa_id: null }] }
          : { ativo: true };
        const srv = await ServidorEmail.findOne({ where: whereSrv });
        if (!srv) {
          return { sucesso: false, emailsEnviados: 0, erros: 0 };
        }
        servidor = srv;
      }

      const whereMsg = empresaId != null
        ? { ativo: true, [Op.or]: [{ empresa_id: empresaId }, { empresa_id: null }] }
        : { ativo: true };
      const mensagens = await MensagemEmail.findAll({ where: whereMsg });
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
        const resultado = await this.processarEnvio(mensagens, servidor, envio.tipoMensagem, envio.dias, envio.tipo, saas, empresaId);
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
    tipo: 'antes' | 'mesmo' | 'depois',
    saas = false,
    empresaId?: number
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

    type TituloParaEnvio = { id: number; valor: number; data_vencimento: Date; numero_titulo?: string; linha_digitavel?: string | null; contrato_id?: number | null; cliente?: { razao_social?: string; nome_fantasia?: string; email?: string; telefone?: string }; banco?: unknown; plano?: unknown };
    let titulos: Array<Titulo | TituloParaEnvio>;

    if (saas) {
      const { SaasTitulo } = await import('../../../models/saas/SaasTitulo');
      const { DadosEmpresa } = await import('../../../models/sistema/DadosEmpresa');
      const { SaasPlano } = await import('../../../models/saas/SaasPlano');
      const { SaasBanco } = await import('../../../models/saas/SaasBanco');
      const rows = await SaasTitulo.findAll({
        where: { status: { [Op.in]: ['pendente', 'vencido'] } as never, pago: false, data_vencimento: { [Op.gte]: dataVencimento, [Op.lt]: proximoDia } },
        include: [
          { model: DadosEmpresa, as: 'empresa', required: true, attributes: ['id', 'razao_social', 'nome_fantasia', 'email', 'telefone'] },
          { model: SaasPlano, as: 'plano', required: false },
          { model: SaasBanco, as: 'banco', required: false },
        ],
      });
      titulos = rows.map((t) => {
        const emp = (t as unknown as { empresa?: { get: (o: { plain: boolean }) => Record<string, unknown> } }).empresa;
        const empData = (emp?.get({ plain: true }) as Record<string, unknown>) || {};
        const plain = t.get({ plain: true }) as Record<string, unknown>;
        return {
          ...plain,
          cliente: { razao_social: empData.razao_social || empData.nome_fantasia, nome_fantasia: empData.nome_fantasia, email: empData.email },
          banco: (t as unknown as { banco?: unknown }).banco,
          plano: (t as unknown as { plano?: unknown }).plano,
        } as TituloParaEnvio;
      });
    } else {
      const whereTitulo: Record<string, unknown> = {
        status: { [Op.in]: ['pendente', 'vencido'] },
        pago: false,
        data_vencimento: { [Op.gte]: dataVencimento, [Op.lt]: proximoDia }
      };
      if (empresaId != null) {
        whereTitulo.empresa_id = empresaId;
      }
      titulos = await Titulo.findAll({
        where: whereTitulo as never,
        include: [
          { model: Cliente, as: 'cliente', required: true, where: { ativo: true, recebe_email: true } },
          { model: Plano, as: 'plano', required: false },
          { model: Banco, as: 'banco', required: false },
        ],
      });
    }

    let enviadas = 0;
    let erros = 0;

    for (const titulo of titulos) {
      try {
        const tituloPlain = saas ? titulo : (titulo as Titulo).get({ plain: true });
        const tituloObj = tituloPlain as TituloParaEnvio & { cliente?: { email?: string; recebe_email?: boolean; razao_social?: string; nome_fantasia?: string; telefone?: string } };
        const cliente = tituloObj.cliente;
        
        if (!cliente?.email) {
          erros++;
          continue;
        }

        if (!saas && cliente.recebe_email === false) {
          logger.info(`Email não enviado para cliente ${(cliente as Cliente).id}: comunicação por email desativada`);
          continue;
        }

        let corpoHtml = '';
        if (mensagem?.mensagem_padrao) {
          const contratoRef: (Partial<Contrato> & { id: number }) | undefined = titulo.contrato_id ? { id: titulo.contrato_id } : undefined;
          
          // baseUrl não é necessário - links serão relativos
          // Em produção, o navegador resolve automaticamente
          const baseUrl = undefined;
          
          corpoHtml = await VariaveisDocumentoService.processarVariaveis(mensagem.mensagem_padrao, {
            cliente: cliente as Cliente,
            contrato: contratoRef,
            titulo: tituloObj as unknown as TituloComRelacoes,
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
          const tituloPdf = saas
            ? { ...tituloObj, cliente: cliente as Cliente & { nome?: string; cpf?: string; cnpj?: string }, banco: tituloObj.banco, plano: tituloObj.plano }
            : (titulo as Titulo);
          const pdf = await TituloPDFController.gerarPdfBase64(tituloPdf as unknown as TituloComRelacoes);
          if (pdf) {
            base64Pdf = pdf;
          } else {
            logger.error('Falha ao gerar PDF do boleto para email');
          }
        }
        const empresaIdHistorico = (titulo as { empresa_id?: number }).empresa_id ?? (cliente as { empresa_id?: number }).empresa_id ?? empresaId;
        const contextoSaas = saas && (titulo as { empresa_id?: number }).empresa_id
          ? { saas: true as const, empresa_id: (titulo as { empresa_id: number }).empresa_id }
          : empresaIdHistorico != null
            ? { empresa_id: empresaIdHistorico }
            : undefined;
        const enviou = await this.enviarEmail(
          servidor as ServidorEmail,
          cliente.email,
          corpoHtml,
          base64Pdf,
          'titulo',
          titulo.id,
          `${servidor.nome_remetente} - Boleto de Pagamento`,
          cliente.razao_social || cliente.nome_fantasia || undefined,
          cliente.email,
          cliente.telefone || undefined,
          contextoSaas
        );
        
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
    base64Pdf?: string,
    entidadeTipo?: string,
    entidadeId?: number,
    titulo?: string,
    clienteNome?: string,
    clienteEmail?: string,
    clienteTelefone?: string,
    contextoSaas?: ContextoHistorico
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

      const subjectEmail = titulo ?? `${servidor.nome_remetente} - Boleto de Pagamento`;
      const mailOptions: SendMailOptions = {
        from: `"${servidor.nome_remetente}" <${servidor.email_remetente}>`,
        to: emailDestino,
        subject: subjectEmail,
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

        // Limpar HTML do conteúdo para exibição
        const mensagemLimpa = this.stripHtml(mensagem);

        // Registrar mensagem enviada no histórico
      try {
        await registrarMensagemHistorico(
          {
            tipo: 'email',
            destinatario: emailDestino,
            titulo: titulo || `${servidor.nome_remetente} - Boleto de Pagamento`,
            mensagem: mensagemLimpa,
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

        // Registrar no Elasticsearch (sem request, então dados de usuário serão null)
        await registrarMensagemElasticsearch(null, {
          tipo: 'email',
          destinatario: emailDestino,
          titulo: titulo || `${servidor.nome_remetente} - Boleto de Pagamento`,
          mensagem: mensagem,
          status: 'enviada',
          entidade_tipo: entidadeTipo,
          entidade_id: entidadeId,
          servidor_id: servidor.id
        });
      } catch (registroError) {
        logger.error('Erro ao registrar email enviado no histórico:', registroError);
        // Não falha o envio por erro no registro
      }

      logger.info('Email enviado com sucesso:', {
        messageId: result.messageId,
        to: emailDestino,
        temAnexo: !!base64Pdf,
        tamanhoMensagem: mensagem?.length || 0
      });
      return true;
    } catch (error) {
      // Limpar HTML do conteúdo para exibição
      const mensagemLimpa = this.stripHtml(mensagem);

      // Registrar erro no histórico
      try {
        await registrarMensagemHistorico(
          {
            tipo: 'email',
            destinatario: emailDestino,
            titulo: titulo || `${servidor.nome_remetente} - Boleto de Pagamento`,
            mensagem: mensagemLimpa,
            status: 'erro',
            erro_mensagem: error instanceof Error ? error.message : 'Erro desconhecido',
            entidade_tipo: entidadeTipo,
            entidade_id: entidadeId,
            servidor_id: servidor.id,
            cliente_nome: clienteNome,
            cliente_email: clienteEmail,
            cliente_telefone: clienteTelefone,
          },
          contextoSaas
        );

        // Registrar erro no Elasticsearch
        await registrarMensagemElasticsearch({} as any, {
          tipo: 'email',
          destinatario: emailDestino,
          titulo: titulo || `${servidor.nome_remetente} - Boleto de Pagamento`,
          mensagem: mensagem,
          status: 'erro',
          erro_mensagem: error instanceof Error ? error.message : 'Erro desconhecido',
          entidade_tipo: entidadeTipo,
          entidade_id: entidadeId,
          servidor_id: servidor.id
        });
      } catch (registroError) {
        logger.error('Erro ao registrar erro de email no histórico:', registroError);
        // Não falha o envio por erro no registro
      }

      logger.error('Erro ao enviar email:', error);
      return false;
    }
  }

  /**
   * Envia email de recibo de pagamento quando o título é marcado como pago.
   * Se tipo_envio === 'pdf', anexa o PDF do recibo (modelo de documento tipo recibo).
   */
  static async enviarReciboPagamento(titulo: TituloComRelacoes): Promise<boolean> {
    try {
      logger.info('[Recibo Email] Iniciando envio', { titulo_id: titulo.id });

      const servidor = await ServidorEmail.findOne({ where: { ativo: true } });
      if (!servidor) {
        logger.info('[Recibo Email] Servidor de email inativo ou não configurado', { titulo_id: titulo.id });
        return false;
      }

      const mensagem = await MensagemEmail.findOne({ where: { tipo: 'recibo_pagamento', ativo: true } });
      if (!mensagem || mensagem.tipo_envio === 'desativado') {
        logger.info('[Recibo Email] Mensagem recibo_pagamento não encontrada ou desativada', { titulo_id: titulo.id });
        return false;
      }

      const tituloComCliente = titulo as TituloComRelacoes & { cliente?: Cliente };
      const cliente = tituloComCliente.cliente;
      if (!cliente?.email || !cliente.recebe_email) {
        logger.info('[Recibo Email] Cliente sem email ou recebe_email desativado', {
          titulo_id: titulo.id,
          tem_email: !!cliente?.email,
          recebe_email: !!cliente?.recebe_email
        });
        return false;
      }

      const contratoRef: (Partial<Contrato> & { id: number }) | undefined = titulo.contrato_id
        ? { id: titulo.contrato_id }
        : undefined;

      const corpoHtml = await VariaveisDocumentoService.processarVariaveis(mensagem.mensagem_padrao, {
        cliente,
        contrato: contratoRef,
        titulo,
        dataReferencia: new Date()
      }, undefined);

      let base64Pdf: string | undefined;
      if (mensagem.tipo_envio === 'pdf') {
        const { ReciboPDFService } = await import('../../titulos/ReciboPDFService');
        base64Pdf = await ReciboPDFService.gerarReciboBase64({ titulo, cliente, baseUrl: undefined }) ?? undefined;
      }

      const empresaId = (titulo as { empresa_id?: number }).empresa_id ?? (cliente as { empresa_id?: number }).empresa_id ?? undefined;
      const contextoSaas = empresaId != null ? { empresa_id: empresaId } : undefined;

      const enviou = await this.enviarEmail(
        servidor,
        cliente.email,
        corpoHtml,
        base64Pdf,
        'titulo',
        titulo.id,
        `${servidor.nome_remetente} - Recibo de Pagamento`,
        cliente.razao_social || cliente.nome_fantasia || undefined,
        cliente.email,
        cliente.telefone || undefined,
        contextoSaas
      );
      logger.info('[Recibo Email] Envio concluído', { titulo_id: titulo.id, sucesso: enviou });
      return enviou;
    } catch (error) {
      logger.error('Erro ao enviar recibo de pagamento por email', {
        titulo_id: titulo.id,
        error: error instanceof Error ? error.message : String(error)
      });
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

      if (!cliente.recebe_email) {
        return { sucesso: false, mensagem: 'Ative a comunicação "Recebe Email" na aba Contato do cadastro do cliente para enviar mensagens' };
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
      
      // baseUrl não é mais necessário - links serão relativos
      // Em produção, o navegador resolve automaticamente
      const baseUrl = undefined; // Links serão relativos
      
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

      const empresaId = (titulo as { empresa_id?: number }).empresa_id ?? (cliente as { empresa_id?: number }).empresa_id ?? undefined;
      const contextoSaas = empresaId != null ? { empresa_id: empresaId } : undefined;

      const enviou = await this.enviarEmail(
        servidor,
        cliente.email,
        corpoHtml,
        base64Pdf,
        'titulo',
        tituloId,
        `${servidor.nome_remetente} - Boleto de Pagamento`,
        cliente.razao_social || cliente.nome_fantasia || undefined,
        cliente.email,
        cliente.telefone || undefined,
        contextoSaas
      );
      
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

