import type { Prisma, clientes, comunicacao_mensagens_whatsapp, comunicacao_servidores_whatsapp, contratos, financeiro_titulos } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { logger } from '../../../utils/logger';
import { VariaveisDocumentoService } from '../../documentos/VariaveisDocumentoService';
import { TituloPDFController } from '../../../controllers/titulos/TituloPDFController';
import { WhatsAppSenderService } from '../WhatsAppSenderService';
import { WhatsAppTemplateService } from '../WhatsAppTemplateService';
import { WhatsAppCloudService } from '../WhatsAppCloudService';
import { TemplateWhatsAppService } from '../TemplateWhatsAppService';
import { registrarMensagemHistorico, type ContextoHistorico } from '../RegistroMensagemHistoricoService';
import { whereComunicacaoEmpresaEstrito } from '../../../utils/comunicacaoEmpresaWhere';
import { resolverServidorWhatsAppCobranca } from '../resolverServidorCobranca';
import { escolherMensagemCobranca } from '../ReenviarNotificacoesCobrancaService/selecao';
import { RECIBO_MODELO_NAO_CONFIGURADO } from '../../titulos/ReciboPDFService/messages';

interface ConfiguracoesEnvios {
  antesVencimento?: number[];
  mesmoDia?: boolean;
  depoisVencimento?: number[];
}

type ServidorWhatsApp = comunicacao_servidores_whatsapp;
type MensagemWhatsApp = comunicacao_mensagens_whatsapp;
type Titulo = financeiro_titulos & {
  cliente?: clientes | null;
  contrato?: contratos | null;
  banco?: unknown;
  plano?: unknown;
  numero_titulo?: string | null;
  get?: (o: { plain: boolean }) => Record<string, unknown>;
};
type Cliente = clientes;
type Contrato = contratos;

const mensagemInclude = {
  comunicacao_templates_whatsapp: true,
} satisfies Prisma.comunicacao_mensagens_whatsappInclude;

export class WhatsAppBoletoService {
  /**
   * Envia boletos baseado em configurações
   * @param options.empresa_id - Filtra títulos por empresa
   */
  static async enviarBoletos(config: ConfiguracoesEnvios, options?: { empresa_id?: number }): Promise<{
    sucesso: boolean;
    mensagensEnviadas: number;
    erros: number;
  }> {
    const empresaId = options?.empresa_id;
    try {
      const whereSrv = whereComunicacaoEmpresaEstrito(empresaId, { ativo: true });
      if (!whereSrv) {
        logger.info('[WhatsApp Boleto] empresa_id ausente — envio abortado (isolamento multi-tenant)');
        return { sucesso: false, mensagensEnviadas: 0, erros: 0 };
      }
      const servidor = await resolverServidorWhatsAppCobranca(empresaId);
      if (!servidor) {
        return { sucesso: false, mensagensEnviadas: 0, erros: 0 };
      }
      

      const whereMsg = whereComunicacaoEmpresaEstrito(empresaId, { ativo: true });
      if (!whereMsg) {
        return { sucesso: false, mensagensEnviadas: 0, erros: 0 };
      }
      const mensagens = await prisma.comunicacao_mensagens_whatsapp.findMany({
        where: whereMsg as Prisma.comunicacao_mensagens_whatsappWhereInput,
        include: mensagemInclude,
      });
      if (mensagens.length === 0) {
        return { sucesso: false, mensagensEnviadas: 0, erros: 0 };
      }

      let mensagensEnviadas = 0;
      let erros = 0;

      const envios = [
        ...(config.antesVencimento?.map(dias => ({ dias, tipo: 'antes' as const, tipoMensagem: `${String(dias).padStart(2, '0')}_dias_antes_vencimento` })) || []),
        ...(config.mesmoDia ? [{ dias: 0, tipo: 'mesmo' as const, tipoMensagem: 'mesmo_dia_vencimento' }] : []),
        ...(config.depoisVencimento?.map(dias => ({ dias, tipo: 'depois' as const, tipoMensagem: `${String(dias).padStart(2, '0')}_dias_depois_vencimento` })) || [])
      ];

      for (const envio of envios) {
        try {
          const resultado = await this.processarEnvio(mensagens, servidor, envio.tipoMensagem, envio.dias, envio.tipo, empresaId);
          mensagensEnviadas += resultado.enviadas;
          erros += resultado.erros;
        } catch (processError) {
          logger.error('Erro no processamento de envio de boletos', {
            context: 'WhatsAppBoletoService',
            tipoMensagem: envio.tipoMensagem,
            error: processError instanceof Error ? processError.message : String(processError)
          });
          erros += 1;
        }
      }

      return { sucesso: mensagensEnviadas > 0, mensagensEnviadas, erros };
    } catch (error) {
      logger.error('WhatsAppBoletoService.enviarBoletos - Erro geral no processamento', {
        context: 'WhatsAppBoletoService',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        config: JSON.stringify(config)
      });
      return { sucesso: false, mensagensEnviadas: 0, erros: 1 };
    }
  }

  /**
   * Processa envio para um tipo específico
   */
  private static async processarEnvio(
    mensagens: MensagemWhatsApp[],
    servidor: ServidorWhatsApp,
    tipoMensagem: string,
    dias: number,
    tipo: 'antes' | 'mesmo' | 'depois',
    empresaId?: number
  ): Promise<{ enviadas: number; erros: number }> {
    const mensagemPadrao = mensagens.find((msg) => msg.tipo === tipoMensagem && msg.servidor_whatsapp_id === servidor.id)
      ?? mensagens.find((msg) => msg.tipo === tipoMensagem && msg.servidor_whatsapp_id == null);
    if (!mensagemPadrao || mensagemPadrao.tipo_envio === 'desativado') {
      return { enviadas: 0, erros: 0 };
    }
    const cacheServidor = new Map<string, ServidorWhatsApp | null>();

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

    logger.info('WhatsAppBoletoService.processarEnvio - Calculando período de busca', {
      context: 'WhatsAppBoletoService',
      tipoMensagem,
      hoje: hoje.toISOString(),
      dataVencimento: dataVencimento.toISOString(),
      proximoDia: proximoDia.toISOString(),
      dias,
      tipo
    });

    logger.info('WhatsAppBoletoService.processarEnvio - Buscando títulos no banco', {
      context: 'WhatsAppBoletoService',
      tipoMensagem,
      where: {
        status: ['pendente', 'vencido'],
        pago: false,
        data_vencimento: {
          gte: dataVencimento.toISOString(),
          lt: proximoDia.toISOString()
        }
      }
    });

    let titulos: Titulo[];

    
      const whereTitulo: Prisma.financeiro_titulosWhereInput = {
        status: { in: ['pendente', 'vencido'] },
        pago: false,
        data_vencimento: { gte: dataVencimento, lt: proximoDia },
        clientes: { ativo: true, recebe_whatsapp: true },
      };
      if (empresaId != null) {
        whereTitulo.empresa_id = empresaId;
      }
      const rows = await prisma.financeiro_titulos.findMany({
        where: whereTitulo,
        include: {
          clientes: true,
          contratos: true,
          cadastros_bancos: true,
          cadastros_planos: true,
        },
        orderBy: [{ data_vencimento: 'asc' }, { id: 'asc' }],
      });
      titulos = rows.map((row) => ({
        ...row,
        valor: Number(row.valor),
        cliente: row.clientes,
        contrato: row.contratos,
        banco: row.cadastros_bancos,
        plano: row.cadastros_planos,
      })) as unknown as Titulo[];
    

    logger.info('WhatsAppBoletoService.processarEnvio - Títulos encontrados', {
      context: 'WhatsAppBoletoService',
      tipoMensagem,
      quantidadeTitulos: titulos.length,
      titulosIds: titulos.map(t => ({ id: t.id, numero: t.numero_titulo, cliente: (t as any).cliente?.razao_social }))
    });

    let enviadas = 0;
    let erros = 0;

    logger.info('WhatsAppBoletoService.processarEnvio - Iniciando processamento de títulos individuais', {
      context: 'WhatsAppBoletoService',
      tipoMensagem,
      quantidadeTitulos: titulos.length
    });

    for (const titulo of titulos) {
      let cliente: Cliente | null;
      let contrato: Contrato | null | undefined;
      
        cliente = titulo.cliente ?? null;
        contrato = titulo.contrato;
      

      logger.info('WhatsAppBoletoService.processarEnvio - Processando título', {
        context: 'WhatsAppBoletoService',
        tituloId: titulo.id,
        tituloNumero: titulo.numero_titulo,
        clienteNome: cliente?.razao_social,
        clienteTelefone: cliente?.telefone,
        contratoId: contrato?.id,
      });

      if (!cliente?.telefone) {
        logger.info('WhatsAppBoletoService.processarEnvio - Pulando título sem telefone', {
          context: 'WhatsAppBoletoService',
          tituloId: titulo.id,
          clienteNome: cliente?.razao_social,
          motivo: 'telefone_ausente'
        });
        continue;
      }

      try {
        logger.info('WhatsAppBoletoService.processarEnvio - Enviando mensagem para título', {
          context: 'WhatsAppBoletoService',
          tituloId: titulo.id,
          clienteTelefone: cliente.telefone
        });

        const tituloParaEnvio = titulo;
        const bancoSrvId = (titulo.banco as { servidor_whatsapp_cobranca_id?: number | null } | null | undefined)?.servidor_whatsapp_cobranca_id ?? null;
        const cacheKey = bancoSrvId ? String(bancoSrvId) : 'padrao';
        if (!cacheServidor.has(cacheKey)) {
          cacheServidor.set(cacheKey, await resolverServidorWhatsAppCobranca(empresaId, bancoSrvId));
        }
        const servidorTitulo = cacheServidor.get(cacheKey) ?? servidor;
        const mensagem = mensagens.find((msg) => msg.tipo === tipoMensagem && msg.servidor_whatsapp_id === servidorTitulo.id)
          ?? (servidorTitulo.id === servidor.id ? mensagemPadrao : undefined);
        if (!mensagem || mensagem.tipo_envio === 'desativado') {
          erros++;
          continue;
        }
        const empresaIdHistorico = (titulo as { empresa_id?: number }).empresa_id ?? (cliente as { empresa_id?: number }).empresa_id ?? empresaId;
        const vinculoCobranca = {
          entidade_tipo: 'titulo' as const,
          entidade_id: titulo.id,
          titulo_historico: 'Boleto de Pagamento',
        };
        const contextoHistorico = empresaIdHistorico != null
          ? { empresa_id: empresaIdHistorico, ...vinculoCobranca }
          : vinculoCobranca;
        const resultado = await this.enviarParaTitulo(mensagem, servidorTitulo, tituloParaEnvio as Titulo, cliente, contrato, contextoHistorico);

        logger.info('WhatsAppBoletoService.processarEnvio - Resultado do envio', {
          context: 'WhatsAppBoletoService',
          tituloId: titulo.id,
          sucesso: resultado
        });

        if (resultado) {
          logger.info('WhatsAppBoletoService.processarEnvio - Envio bem-sucedido', {
            context: 'WhatsAppBoletoService',
            tituloId: titulo.id
          });
          enviadas++;
        } else {
          logger.warn('WhatsAppBoletoService.processarEnvio - Falha no envio (resultado false)', {
            context: 'WhatsAppBoletoService',
            tituloId: titulo.id
          });
          erros++;
        }
      } catch (error) {
        logger.error('WhatsAppBoletoService.processarEnvio - Erro ao enviar boleto', {
          context: 'WhatsAppBoletoService',
          tituloId: titulo.id,
          clienteNome: cliente?.razao_social,
          clienteTelefone: cliente?.telefone,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        erros++;
      }
    }

    logger.info('WhatsAppBoletoService.processarEnvio - Processamento concluído', {
      context: 'WhatsAppBoletoService',
      tipoMensagem,
      enviadas,
      erros,
      totalProcessados: enviadas + erros
    });

    return { enviadas, erros };
  }

  /**
   * Envia mensagem/PDF para um título específico
   */
  private static async enviarParaTitulo(
    mensagem: MensagemWhatsApp,
    servidor: ServidorWhatsApp,
    titulo: Titulo,
    cliente: Cliente,
    contrato: Contrato | null | undefined,
    contextoSaas?: ContextoHistorico
  ): Promise<boolean> {
    const telefone = this.formatarTelefone(cliente.telefone!);
    const baseUrl = undefined;

    if (servidor.tipo_api === 'whatsapp_cloud') {
      return await this.enviarViaCloud(mensagem, servidor, telefone, titulo, cliente, contrato, baseUrl, contextoSaas);
    }

    return await this.enviarViaEvolution(mensagem, servidor, telefone, titulo, cliente, contrato, baseUrl, contextoSaas);
  }

  /**
   * Envia via WhatsApp Cloud API
   */
  private static async enviarViaCloud(
    mensagem: MensagemWhatsApp,
    servidor: ServidorWhatsApp,
    telefone: string,
    titulo: Titulo,
    cliente: Cliente,
    contrato: Contrato | null | undefined,
    baseUrl: undefined,
    contextoSaas?: ContextoHistorico
  ): Promise<boolean> {
    const templateInfo = TemplateWhatsAppService.getTemplateInfoForMensagem(mensagem);
    if (!templateInfo) {
      logger.warn('Template não configurado para WhatsApp Cloud API', { mensagem_id: mensagem.id });
      return false;
    }

    const mensagemTexto = mensagem.mensagem_padrao || '';
    let msg = mensagemTexto;
    if (mensagemTexto) {
      msg = await VariaveisDocumentoService.processarVariaveis(mensagemTexto, {
        cliente,
        contrato: contrato || undefined,
        titulo,
        dataReferencia: new Date(),
      }, baseUrl);
    }

    const components = await WhatsAppTemplateService.prepararComponentesParaTemplateCloud({
      servidor,
      cliente,
      contrato: contrato || undefined,
      titulo,
      mensagemTexto: msg,
      templateInfo,
      tipoEnvio: mensagem.tipo_envio,
    });

    return await WhatsAppCloudService.enviarTemplate(
      servidor,
      telefone,
      templateInfo.name,
      templateInfo.language,
      components,
      { nome_fantasia: cliente.nome_fantasia || undefined, razao_social: cliente.razao_social || undefined },
      titulo,
      contextoSaas
    );
  }

  /**
   * Envia via Evolution API
   */
  private static async enviarViaEvolution(
    mensagem: MensagemWhatsApp,
    servidor: ServidorWhatsApp,
    telefone: string,
    titulo: Titulo,
    cliente: Cliente,
    contrato: Contrato | null | undefined,
    baseUrl: undefined,
    contextoSaas?: ContextoHistorico
  ): Promise<boolean> {
    const mensagemTexto = mensagem.mensagem_padrao || '';
    if (!mensagemTexto) {
      return false;
    }

    const msg = await VariaveisDocumentoService.processarVariaveis(mensagemTexto, {
      cliente,
      contrato: contrato || undefined,
      titulo,
      dataReferencia: new Date(),
    }, baseUrl);

    if (mensagem.tipo_envio === 'pdf') {
      const base64 = await TituloPDFController.gerarPdfBase64(
        titulo as unknown as Parameters<typeof TituloPDFController.gerarPdfBase64>[0]
      );
      if (!base64) {
        return false;
      }
      const enviouPdf = await WhatsAppSenderService.enviarPdfBase64(servidor, telefone, base64, msg, 'titulo', titulo.id, contextoSaas);
      if (!enviouPdf) {
        return false;
      }
      await this.enviarMensagensInteracao(mensagem, servidor, telefone, cliente, contrato, titulo, contextoSaas);
      return true;
    }

    const enviouTexto = await WhatsAppSenderService.enviarTexto(servidor, telefone, msg, contextoSaas);
    if (!enviouTexto) {
      return false;
    }
    await this.enviarMensagensInteracao(mensagem, servidor, telefone, cliente, contrato, titulo, contextoSaas);
    return true;
  }

  /**
   * Envia mensagens de interação
   */
  private static async enviarMensagensInteracao(
    mensagem: MensagemWhatsApp,
    servidor: ServidorWhatsApp,
    telefone: string,
    cliente: Cliente,
    contrato: Contrato | null | undefined,
    titulo: Titulo,
    contextoSaas?: ContextoHistorico
  ): Promise<void> {
    const interacoes = [mensagem.interacao1, mensagem.interacao2, mensagem.interacao3];

    for (const interacao of interacoes) {
      if (!interacao || !interacao.trim()) {
        continue;
      }

      await WhatsAppSenderService.delayInteracao();

      try {
        const baseUrl = undefined;
        const texto = await VariaveisDocumentoService.processarVariaveis(interacao, {
          cliente,
          contrato: contrato || undefined,
          titulo,
          dataReferencia: new Date(),
        }, baseUrl);

        if (!texto || !texto.trim()) {
          continue;
        }

        const enviou = await WhatsAppSenderService.enviarTexto(servidor, telefone, texto, contextoSaas);
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

  /**
   * Registra falha de recibo no histórico (Logs → WhatsApp).
   * Abortos cedo (sem template, mensagem desativada, etc.) antes só iam para o Winston.
   */
  private static async registrarFalhaReciboNoHistorico(params: {
    titulo: Titulo;
    cliente: Cliente;
    motivo: string;
    mensagem?: string;
    telefone?: string;
    servidor?: ServidorWhatsApp | null;
    contextoHistorico?: ContextoHistorico;
  }): Promise<void> {
    const { titulo, cliente, motivo, mensagem, servidor, contextoHistorico } = params;
    const telefoneRaw = params.telefone || cliente.telefone?.trim();
    if (!telefoneRaw) return;
    const telefone = this.formatarTelefone(telefoneRaw);
    const empresaId =
      (titulo as { empresa_id?: number | null }).empresa_id ??
      (cliente as { empresa_id?: number | null }).empresa_id ??
      undefined;
    const contexto: ContextoHistorico = contextoHistorico ?? {
      ...(empresaId != null ? { empresa_id: empresaId } : {}),
      entidade_tipo: 'titulo',
      entidade_id: titulo.id,
      titulo_historico: 'Recibo de Pagamento',
    };
    try {
      await registrarMensagemHistorico(
        {
          tipo: 'whatsapp',
          destinatario: telefone,
          titulo: 'Recibo de Pagamento',
          mensagem: mensagem || 'Recibo de pagamento não enviado',
          status: 'erro',
          erro_mensagem: motivo,
          entidade_tipo: 'titulo',
          entidade_id: titulo.id,
          servidor_id: servidor?.id,
          cliente_nome: cliente.razao_social || cliente.nome_fantasia || undefined,
          cliente_email: cliente.email || undefined,
          cliente_telefone: cliente.telefone || undefined,
        },
        contexto
      );
    } catch (registroError) {
      logger.error('Erro ao registrar falha de recibo no histórico WhatsApp', {
        titulo_id: titulo.id,
        error: registroError instanceof Error ? registroError.message : String(registroError),
      });
    }
  }

  /**
   * Envia mensagem de recibo de pagamento por WhatsApp.
   * Se tipo_envio === 'pdf', envia o PDF do recibo (aba Recibos do modelo de contrato) com a mensagem como descrição.
   */
  static async enviarReciboPagamento(titulo: Titulo, cliente: Cliente): Promise<boolean> {
    try {
      logger.info('[Recibo WhatsApp] Iniciando envio', { titulo_id: titulo.id });

      if (!cliente?.telefone?.trim()) {
        logger.info('[Recibo WhatsApp] Cliente sem telefone', { titulo_id: titulo.id });
        return false;
      }

      const empresaId = (titulo as { empresa_id?: number | null }).empresa_id ?? (cliente as { empresa_id?: number | null }).empresa_id ?? undefined;
      const bancoSrvId = (titulo as { banco?: { servidor_whatsapp_cobranca_id?: number | null } | null }).banco?.servidor_whatsapp_cobranca_id
        ?? (titulo as { cadastros_bancos?: { servidor_whatsapp_cobranca_id?: number | null } | null }).cadastros_bancos?.servidor_whatsapp_cobranca_id;
      if (empresaId == null || empresaId <= 0) {
        const motivo = 'empresa_id ausente — envio de recibo WhatsApp abortado';
        logger.info(`[Recibo WhatsApp] ${motivo}`, { titulo_id: titulo.id });
        await this.registrarFalhaReciboNoHistorico({ titulo, cliente, motivo });
        return false;
      }
      const servidor = await resolverServidorWhatsAppCobranca(empresaId, bancoSrvId);
      if (!servidor) {
        const motivo = 'Servidor WhatsApp inativo ou não configurado';
        logger.info(`[Recibo WhatsApp] ${motivo}`, { titulo_id: titulo.id, empresa_id: empresaId });
        await this.registrarFalhaReciboNoHistorico({ titulo, cliente, motivo });
        return false;
      }

      const whereMsg = whereComunicacaoEmpresaEstrito(empresaId, {
        tipo: 'recibo_pagamento',
        ativo: true,
        servidor_whatsapp_id: servidor.id,
      });
      const mensagem = whereMsg
        ? await prisma.comunicacao_mensagens_whatsapp.findFirst({
            where: whereMsg as Prisma.comunicacao_mensagens_whatsappWhereInput,
            include: mensagemInclude,
          })
        : null;
      if (!mensagem || mensagem.tipo_envio === 'desativado') {
        const motivo = 'Mensagem recibo_pagamento não encontrada ou desativada';
        logger.info(`[Recibo WhatsApp] ${motivo}`, { titulo_id: titulo.id });
        await this.registrarFalhaReciboNoHistorico({ titulo, cliente, servidor, motivo });
        return false;
      }

      const temTemplate = !!mensagem.template_id;
      const temMensagemPadrao = !!(mensagem.mensagem_padrao && mensagem.mensagem_padrao.trim());
      if (!temTemplate && !temMensagemPadrao) {
        const motivo =
          'Mensagem de recibo sem template Meta e sem texto padrão — configure em Integrações → Servidor WhatsApp';
        logger.info('[Recibo WhatsApp] Nem template_mapping nem mensagem_padrao configurados', {
          titulo_id: titulo.id,
        });
        await this.registrarFalhaReciboNoHistorico({ titulo, cliente, servidor, motivo });
        return false;
      }

      const baseUrl = undefined;
      const contrato: Contrato | null | undefined = titulo.contrato_id ? { id: titulo.contrato_id } as Contrato : undefined;
      const telefone = this.formatarTelefone(cliente.telefone);
      const contextoHistorico = {
        ...(empresaId != null ? { empresa_id: empresaId } : {}),
        entidade_tipo: 'titulo',
        entidade_id: titulo.id,
        titulo_historico: 'Recibo de Pagamento',
      };

      if (servidor.tipo_api === 'whatsapp_cloud' && temTemplate) {
        const templateInfo = TemplateWhatsAppService.getTemplateInfoForMensagem(mensagem);
        if (!templateInfo) {
          const motivo = 'template_mapping inválido para recibo_pagamento (Cloud API)';
          logger.info(`[Recibo WhatsApp] ${motivo}`, { titulo_id: titulo.id });
          await this.registrarFalhaReciboNoHistorico({
            titulo,
            cliente,
            servidor,
            telefone,
            contextoHistorico,
            motivo,
          });
          return false;
        }
        const mensagemTexto = mensagem.mensagem_padrao || '';
        const msg = mensagemTexto
          ? await VariaveisDocumentoService.processarVariaveis(mensagemTexto, {
              cliente,
              contrato: contrato || undefined,
              titulo,
              dataReferencia: new Date()
            }, baseUrl)
          : '';
        const components = await WhatsAppTemplateService.prepararComponentesParaTemplateCloud({
          servidor,
          cliente,
          contrato: contrato || undefined,
          titulo,
          mensagemTexto: msg,
          templateInfo,
          tipoEnvio: mensagem.tipo_envio,
          tipoPdfHeader: 'recibo',
          forcarBotao: false,
          headerSomenteSeTipoPdf: true,
        });
        const bodyComp = components.find((c) => c.type === 'body');
        const bodyParamsPreview = bodyComp?.parameters?.map((p) => (p.type === 'text' ? p.text : p.type)) ?? [];
        const temHeaderDocumento = components.some(
          (c) =>
            c.type === 'header' &&
            Array.isArray(c.parameters) &&
            c.parameters.some((p) => p.type === 'document')
        );
        logger.info(`[Recibo WhatsApp] Componentes: total=${components.length}, tem_header=${components.some((c) => c.type === 'header')}, body_params_count=${bodyComp?.parameters?.length ?? 0}, body_params_preview=${JSON.stringify(bodyParamsPreview)}`);
        if (mensagem.tipo_envio === 'pdf' && !temHeaderDocumento) {
          await this.registrarFalhaReciboNoHistorico({
            telefone,
            titulo,
            cliente,
            servidor,
            contextoHistorico,
            motivo: RECIBO_MODELO_NAO_CONFIGURADO,
            mensagem: 'PDF do recibo não gerado',
          });
        }
        const enviou = await WhatsAppCloudService.enviarTemplate(
          servidor,
          telefone,
          templateInfo.name,
          templateInfo.language,
          components,
          { nome_fantasia: cliente.nome_fantasia || undefined, razao_social: cliente.razao_social || undefined },
          titulo,
          contextoHistorico
        );
        logger.info('[Recibo WhatsApp] Envio via Cloud API concluído', {
          titulo_id: titulo.id,
          sucesso: enviou,
          template: templateInfo.name
        });
        return enviou;
      }

      if (servidor.tipo_api === 'whatsapp_cloud') {
        const motivo =
          'Cloud API exige template Meta — configure o template em recibo_pagamento';
        logger.info(`[Recibo WhatsApp] ${motivo}`, { titulo_id: titulo.id });
        await this.registrarFalhaReciboNoHistorico({
          titulo,
          cliente,
          servidor,
          telefone,
          contextoHistorico,
          motivo,
        });
        return false;
      }

      const msg = await VariaveisDocumentoService.processarVariaveis(mensagem.mensagem_padrao || '', {
        cliente,
        contrato: contrato || undefined,
        titulo,
        dataReferencia: new Date()
      }, baseUrl);

      if (mensagem.tipo_envio === 'pdf') {
        const { ReciboPDFService } = await import('../../titulos/ReciboPDFService');
        const base64Pdf = await ReciboPDFService.gerarReciboBase64({ titulo, cliente, baseUrl: undefined });
        if (base64Pdf) {
          const enviou = await WhatsAppSenderService.enviarPdfBase64(servidor, telefone, base64Pdf, msg, undefined, undefined, contextoHistorico);
          logger.info('[Recibo WhatsApp] Envio PDF via Evolution concluído', { titulo_id: titulo.id, sucesso: enviou });
          return enviou;
        }
        await this.registrarFalhaReciboNoHistorico({
          telefone,
          titulo,
          cliente,
          servidor,
          contextoHistorico,
          motivo: RECIBO_MODELO_NAO_CONFIGURADO,
          mensagem: 'PDF do recibo não gerado',
        });
        logger.warn('Falha ao gerar PDF do recibo para WhatsApp, enviando só texto', {
          titulo_id: titulo.id,
          motivo: RECIBO_MODELO_NAO_CONFIGURADO,
        });
      }

      const enviou = await WhatsAppSenderService.enviarTexto(servidor, telefone, msg, contextoHistorico);
      logger.info('[Recibo WhatsApp] Envio via Evolution concluído', { titulo_id: titulo.id, sucesso: enviou });
      return enviou;
    } catch (error) {
      logger.error('Erro ao enviar recibo de pagamento por WhatsApp', {
        titulo_id: titulo.id,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }


  /**
   * Formata telefone para padrão brasileiro
   */
  private static formatarTelefone(telefone: string): string {
    const apenasNumeros = telefone.replace(/\D/g, '');
    return apenasNumeros.startsWith('55') ? apenasNumeros : `55${apenasNumeros}`;
  }
}
