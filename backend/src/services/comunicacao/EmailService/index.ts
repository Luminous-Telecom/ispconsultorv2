import type { Prisma, comunicacao_mensagens_email, comunicacao_servidores_email } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { registrarMensagemHistorico, type ContextoHistorico } from '../RegistroMensagemHistoricoService';
import { logger } from '../../../utils/logger';
import { VariaveisDocumentoService } from '../../documentos/VariaveisDocumentoService';
import nodemailer, { SendMailOptions } from 'nodemailer';
import { TituloPDFController } from '../../../controllers/titulos/TituloPDFController';
import type { TituloComRelacoes } from '../../../controllers/titulos/TituloHelpers/types';
import { parseDateFromDb, formatDate } from '../../../utils/dateUtils';
import { whereComunicacaoEmpresaEstrito } from '../../../utils/comunicacaoEmpresaWhere';
import { escolherMensagemCobranca, textoMensagemCobranca } from '../ReenviarNotificacoesCobrancaService/selecao';

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
   * @param options.saas - Se true, usa saas_titulos e saas_dados_empresa
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
      let servidor: comunicacao_servidores_email;
      if (saas) {
        const rows = await prisma.$queryRawUnsafe<Array<{
          id: number;
          nome: string;
          host_smtp: string;
          porta: number;
          usuario: string;
          senha_criptografada: string;
          ssl: boolean | number;
        }>>("SELECT id, nome, host_smtp, porta, usuario, senha_criptografada, ssl FROM saas_servidores_email WHERE status = 'ativo' LIMIT 1");
        const saasSrv = rows[0];
        if (!saasSrv) {
          return { sucesso: false, emailsEnviados: 0, erros: 0 };
        }
        servidor = {
          id: saasSrv.id,
          host: saasSrv.host_smtp || '',
          porta: saasSrv.porta,
          usuario: saasSrv.usuario,
          senha: saasSrv.senha_criptografada || '',
          ssl: !!saasSrv.ssl,
          tls: false,
          nome_remetente: saasSrv.nome,
          email_remetente: saasSrv.usuario,
          ativo: true,
          timeout: 30000,
          tentativas: 1,
          intervalo_tentativas: 0,
        } as unknown as comunicacao_servidores_email;
      } else {
        const whereSrv = whereComunicacaoEmpresaEstrito(empresaId, { ativo: true });
        if (!whereSrv) {
          logger.info('[Email Boleto] empresa_id ausente — envio abortado (isolamento multi-tenant)');
          return { sucesso: false, emailsEnviados: 0, erros: 0 };
        }
        const srv = await prisma.comunicacao_servidores_email.findFirst({
          where: whereSrv as Prisma.comunicacao_servidores_emailWhereInput,
        });
        if (!srv) {
          return { sucesso: false, emailsEnviados: 0, erros: 0 };
        }
        servidor = srv;
      }

      const whereMsg = saas
        ? { ativo: true }
        : whereComunicacaoEmpresaEstrito(empresaId, { ativo: true });
      if (!whereMsg) {
        return { sucesso: false, emailsEnviados: 0, erros: 0 };
      }
      const mensagens = await prisma.comunicacao_mensagens_email.findMany({
        where: whereMsg as Prisma.comunicacao_mensagens_emailWhereInput,
      });
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
    mensagens: comunicacao_mensagens_email[],
    servidor: comunicacao_servidores_email,
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

    type TituloParaEnvio = { id: number; valor: number; data_vencimento: Date; numero_titulo?: string; linha_digitavel?: string | null; contrato_id?: number | null; empresa_id?: number | null; cliente?: { id?: number; razao_social?: string | null; nome_fantasia?: string | null; email?: string | null; telefone?: string | null; recebe_email?: boolean | null; empresa_id?: number | null }; banco?: unknown; plano?: unknown };
    let titulos: TituloParaEnvio[];

    if (saas) {
      const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        "SELECT * FROM saas_titulos WHERE status IN ('pendente', 'vencido') AND pago = 0 AND data_vencimento >= ? AND data_vencimento < ?",
        dataVencimento,
        proximoDia
      );
      const empresaIds = [...new Set(rows.map((row) => Number(row.empresa_id)).filter((id) => id > 0))];
      const planoIds = [...new Set(rows.map((row) => Number(row.plano_id)).filter((id) => id > 0))];
      const bancoIds = [...new Set(rows.map((row) => Number(row.banco_id)).filter((id) => id > 0))];
      const [empresas, planos, bancos] = await Promise.all([
        empresaIds.length
          ? prisma.sistema_tenants.findMany({
              where: { id: { in: empresaIds } },
              select: { id: true, razao_social: true, nome_fantasia: true, email: true, telefone: true },
            })
          : Promise.resolve([]),
        planoIds.length
          ? prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
              `SELECT * FROM saas_planos WHERE id IN (${planoIds.map(() => '?').join(',')})`,
              ...planoIds
            )
          : Promise.resolve([]),
        bancoIds.length
          ? prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
              `SELECT * FROM saas_bancos WHERE id IN (${bancoIds.map(() => '?').join(',')})`,
              ...bancoIds
            )
          : Promise.resolve([]),
      ]);
      const empresaPorId = new Map(empresas.map((empresa) => [empresa.id, empresa]));
      const planoPorId = new Map(planos.map((plano) => [Number(plano.id), plano]));
      const bancoPorId = new Map(bancos.map((banco) => [Number(banco.id), banco]));
      titulos = rows.flatMap((row) => {
        const emp = empresaPorId.get(Number(row.empresa_id));
        if (!emp) return [];
        return [{
          ...row,
          id: Number(row.id),
          valor: Number(row.valor),
          data_vencimento: row.data_vencimento as Date,
          numero_titulo: row.numero_titulo as string | undefined,
          linha_digitavel: row.linha_digitavel as string | null | undefined,
          contrato_id: row.contrato_id == null ? null : Number(row.contrato_id),
          empresa_id: Number(row.empresa_id),
          cliente: {
            razao_social: emp.razao_social || emp.nome_fantasia || undefined,
            nome_fantasia: emp.nome_fantasia || undefined,
            email: emp.email || undefined,
          },
          banco: bancoPorId.get(Number(row.banco_id)),
          plano: planoPorId.get(Number(row.plano_id)),
        }];
      });
    } else {
      const rows = await prisma.financeiro_titulos.findMany({
        where: {
          status: { in: ['pendente', 'vencido'] },
          pago: false,
          data_vencimento: { gte: dataVencimento, lt: proximoDia },
          ...(empresaId != null ? { empresa_id: empresaId } : {}),
          clientes: { ativo: true, recebe_email: true },
        },
        include: {
          clientes: true,
          cadastros_planos: true,
          cadastros_bancos: true,
        },
      });
      titulos = rows.map((row) => ({
        ...row,
        valor: Number(row.valor),
        cliente: row.clientes,
        plano: row.cadastros_planos,
        banco: row.cadastros_bancos,
      }));
    }

    let enviadas = 0;
    let erros = 0;

    for (const titulo of titulos) {
      try {
        const tituloPlain = titulo;
        const tituloObj = tituloPlain as TituloParaEnvio & { cliente?: { email?: string; recebe_email?: boolean; razao_social?: string; nome_fantasia?: string; telefone?: string } };
        const cliente = tituloObj.cliente;
        
        if (!cliente?.email) {
          erros++;
          continue;
        }

        if (!saas && cliente.recebe_email === false) {
          logger.info(`Email não enviado para cliente ${cliente.id}: comunicação por email desativada`);
          continue;
        }

        let corpoHtml = '';
        if (mensagem?.mensagem_padrao) {
          const contratoRef = titulo.contrato_id ? { id: titulo.contrato_id } : undefined;
          
          // baseUrl não é necessário - links serão relativos
          // Em produção, o navegador resolve automaticamente
          const baseUrl = undefined;
          
          corpoHtml = await VariaveisDocumentoService.processarVariaveis(mensagem.mensagem_padrao, {
            cliente: cliente as never,
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
          const tituloPdf = tituloObj;
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
          servidor,
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
    servidor: comunicacao_servidores_email,
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
   * Se tipo_envio === 'pdf', anexa o PDF do recibo (aba Recibos do modelo de contrato).
   */
  static async enviarReciboPagamento(titulo: TituloComRelacoes): Promise<boolean> {
    try {
      logger.info('[Recibo Email] Iniciando envio', { titulo_id: titulo.id });

      const tituloComCliente = titulo as TituloComRelacoes & { cliente?: { email?: string | null; recebe_email?: boolean; razao_social?: string | null; nome_fantasia?: string | null; telefone?: string | null; empresa_id?: number | null } };
      const cliente = tituloComCliente.cliente;
      if (!cliente) {
        logger.info('[Recibo Email] Cliente não encontrado', { titulo_id: titulo.id });
        return false;
      }

      const empresaId = (titulo as { empresa_id?: number }).empresa_id ?? (cliente as { empresa_id?: number }).empresa_id ?? undefined;
      const whereSrv = whereComunicacaoEmpresaEstrito(empresaId, { ativo: true });
      if (!whereSrv) {
        logger.info('[Recibo Email] empresa_id ausente — envio abortado', { titulo_id: titulo.id });
        return false;
      }
      const servidor = await prisma.comunicacao_servidores_email.findFirst({
        where: whereSrv as Prisma.comunicacao_servidores_emailWhereInput,
      });
      if (!servidor) {
        logger.info('[Recibo Email] Servidor de email inativo ou não configurado', { titulo_id: titulo.id, empresa_id: empresaId });
        return false;
      }

      const whereMsg = whereComunicacaoEmpresaEstrito(empresaId, { tipo: 'recibo_pagamento', ativo: true });
      const mensagem = whereMsg
        ? await prisma.comunicacao_mensagens_email.findFirst({
            where: whereMsg as Prisma.comunicacao_mensagens_emailWhereInput,
          })
        : null;
      if (!mensagem || mensagem.tipo_envio === 'desativado') {
        logger.info('[Recibo Email] Mensagem recibo_pagamento não encontrada ou desativada', { titulo_id: titulo.id });
        return false;
      }

      if (!cliente?.email || !cliente.recebe_email) {
        logger.info('[Recibo Email] Cliente sem email ou recebe_email desativado', {
          titulo_id: titulo.id,
          tem_email: !!cliente?.email,
          recebe_email: !!cliente?.recebe_email
        });
        return false;
      }

      const contratoRef = titulo.contrato_id
        ? { id: titulo.contrato_id }
        : undefined;

      const corpoHtml = await VariaveisDocumentoService.processarVariaveis(mensagem.mensagem_padrao, {
        cliente: cliente as never,
        contrato: contratoRef,
        titulo,
        dataReferencia: new Date()
      }, undefined);

      let base64Pdf: string | undefined;
      if (mensagem.tipo_envio === 'pdf') {
        const { ReciboPDFService } = await import('../../titulos/ReciboPDFService');
        base64Pdf = await ReciboPDFService.gerarReciboBase64({ titulo, cliente, baseUrl: undefined }) ?? undefined;
      }

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
      const titulo = await prisma.financeiro_titulos.findUnique({
        where: { id: Number(tituloId) },
        include: {
          clientes: true,
          cadastros_planos: true,
          cadastros_bancos: true,
        },
      });

      if (!titulo) {
        return { sucesso: false, mensagem: 'Título não encontrado' };
      }

      const tituloPlain = {
        ...titulo,
        valor: Number(titulo.valor),
        cliente: titulo.clientes,
        plano: titulo.cadastros_planos,
        banco: titulo.cadastros_bancos,
      };
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

      const empresaId = (titulo as { empresa_id?: number }).empresa_id ?? (cliente as { empresa_id?: number }).empresa_id ?? undefined;
      const whereSrv = whereComunicacaoEmpresaEstrito(empresaId, { ativo: true });
      if (!whereSrv) {
        return { sucesso: false, mensagem: 'Empresa do título não identificada para envio de email' };
      }
      const servidor = await prisma.comunicacao_servidores_email.findFirst({
        where: whereSrv as Prisma.comunicacao_servidores_emailWhereInput,
      });
      if (!servidor) {
        return { sucesso: false, mensagem: 'Nenhum servidor de email ativo encontrado para esta empresa' };
      }

      const whereMsg = whereComunicacaoEmpresaEstrito(empresaId, { tipo: 'envio_manual', ativo: true });
      const mensagem = whereMsg
        ? await prisma.comunicacao_mensagens_email.findFirst({
            where: whereMsg as Prisma.comunicacao_mensagens_emailWhereInput,
          })
        : null;

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

      const contratoRef = titulo.contrato_id 
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
        const pdf = await TituloPDFController.gerarPdfBase64(
          titulo as unknown as Parameters<typeof TituloPDFController.gerarPdfBase64>[0]
        );
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

  /**
   * Reenvia a cobrança de um título SaaS que falhou.
   */
  static async reenviarCobrancaSaas(tituloId: number): Promise<{ sucesso: boolean; mensagem?: string }> {
    try {
      const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        'SELECT * FROM saas_titulos WHERE id = ? LIMIT 1',
        tituloId
      );
      const titulo = rows[0];
      if (!titulo) {
        return { sucesso: false, mensagem: 'Título não encontrado' };
      }
      const empresa = await prisma.sistema_tenants.findUnique({
        where: { id: Number(titulo.empresa_id) },
        select: { id: true, razao_social: true, nome_fantasia: true, email: true, telefone: true },
      });
      if (!empresa) {
        return { sucesso: false, mensagem: 'Título não encontrado' };
      }
      const [planoRows, bancoRows, srvRows] = await Promise.all([
        titulo.plano_id
          ? prisma.$queryRawUnsafe<Array<Record<string, unknown>>>('SELECT * FROM saas_planos WHERE id = ? LIMIT 1', Number(titulo.plano_id))
          : Promise.resolve([]),
        titulo.banco_id
          ? prisma.$queryRawUnsafe<Array<Record<string, unknown>>>('SELECT * FROM saas_bancos WHERE id = ? LIMIT 1', Number(titulo.banco_id))
          : Promise.resolve([]),
        prisma.$queryRawUnsafe<Array<{
          id: number; nome: string; host_smtp: string; porta: number; usuario: string; senha_criptografada: string; ssl: boolean | number;
        }>>("SELECT id, nome, host_smtp, porta, usuario, senha_criptografada, ssl FROM saas_servidores_email WHERE status = 'ativo' LIMIT 1"),
      ]);
      const saasSrv = srvRows[0];
      if (!saasSrv) {
        return { sucesso: false, mensagem: 'Nenhum servidor de email ativo encontrado' };
      }
      const servidor = {
        id: saasSrv.id,
        host: saasSrv.host_smtp || '',
        porta: saasSrv.porta,
        usuario: saasSrv.usuario,
        senha: saasSrv.senha_criptografada || '',
        ssl: !!saasSrv.ssl,
        tls: false,
        nome_remetente: saasSrv.nome,
        email_remetente: saasSrv.usuario,
        ativo: true,
        timeout: 30000,
        tentativas: 1,
        intervalo_tentativas: 0,
      } as unknown as comunicacao_servidores_email;

      const globais = await prisma.comunicacao_mensagens_email.findMany({
        where: { ativo: true, empresa_id: null },
      });
      const mensagem = escolherMensagemCobranca(
        globais.length > 0 ? globais : await prisma.comunicacao_mensagens_email.findMany({ where: { ativo: true } })
      );
      if (!mensagem) {
        return { sucesso: false, mensagem: 'Mensagem de cobrança não configurada' };
      }

      const email = empresa.email || '';
      if (!email) {
        return { sucesso: false, mensagem: 'Empresa sem e-mail cadastrado' };
      }

      const cliente = {
        razao_social: empresa.razao_social || empresa.nome_fantasia || '',
        nome_fantasia: empresa.nome_fantasia || '',
        email,
        telefone: empresa.telefone || undefined,
      };
      const tituloObj = {
        ...titulo,
        id: Number(titulo.id),
        valor: Number(titulo.valor),
        cliente,
        banco: bancoRows[0],
        plano: planoRows[0],
      };
      const mensagemTexto = textoMensagemCobranca(mensagem);
      const contratoRef = titulo.contrato_id != null ? { id: Number(titulo.contrato_id) } : undefined;
      const corpoHtml = mensagemTexto
        ? await VariaveisDocumentoService.processarVariaveis(mensagemTexto, {
          cliente: cliente as never,
          contrato: contratoRef,
          titulo: tituloObj as unknown as TituloComRelacoes,
          dataReferencia: new Date(),
        }, undefined)
        : '<p>Boleto em anexo.</p>';

      let base64Pdf: string | undefined;
      if (mensagem.tipo_envio === 'pdf') {
        const pdf = await TituloPDFController.gerarPdfBase64(tituloObj as unknown as TituloComRelacoes);
        if (pdf) base64Pdf = pdf;
      }

      const enviou = await this.enviarEmail(
        servidor,
        email,
        corpoHtml,
        base64Pdf,
        'titulo',
        Number(titulo.id),
        `${servidor.nome_remetente} - Boleto de Pagamento`,
        cliente.razao_social || cliente.nome_fantasia,
        email,
        cliente.telefone,
        { saas: true, empresa_id: Number(titulo.empresa_id), entidade_tipo: 'titulo', entidade_id: Number(titulo.id), titulo_historico: 'Boleto de Pagamento' }
      );
      return enviou
        ? { sucesso: true, mensagem: 'Email enviado com sucesso' }
        : { sucesso: false, mensagem: 'Erro ao enviar email' };
    } catch (error) {
      logger.error('Erro ao reenviar cobrança SaaS por email', {
        tituloId,
        error: error instanceof Error ? error.message : String(error),
      });
      return { sucesso: false, mensagem: 'Erro interno ao enviar email' };
    }
  }
}

