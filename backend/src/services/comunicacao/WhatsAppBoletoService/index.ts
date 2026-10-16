import { Op } from 'sequelize';
import { ServidorWhatsApp } from '../../../models/comunicacao/ServidorWhatsApp';
import { MensagemWhatsApp } from '../../../models/comunicacao/MensagemWhatsApp';
import { TemplateWhatsApp } from '../../../models/comunicacao/TemplateWhatsApp';
import { Titulo } from '../../../models/financeiro/Titulo';
import { Cliente } from '../../../models/clientes/Cliente';
import { Contrato } from '../../../models/contratos/Contrato';
import { logger } from '../../../utils/logger';
import { VariaveisDocumentoService } from '../../documentos/VariaveisDocumentoService';
import { TituloPDFController } from '../../../controllers/titulos/TituloPDFController';
import { WhatsAppSenderService } from '../WhatsAppSenderService';
import { WhatsAppTemplateService } from '../WhatsAppTemplateService';
import { WhatsAppCloudService } from '../WhatsAppCloudService';
import { TemplateWhatsAppService } from '../TemplateWhatsAppService';
import type { ContextoHistorico } from '../RegistroMensagemHistoricoService';
import { whereComunicacaoEmpresaEstrito } from '../../../utils/comunicacaoEmpresaWhere';
import { escolherMensagemCobranca } from '../ReenviarNotificacoesCobrancaService/selecao';

interface ConfiguracoesEnvios {
  antesVencimento?: number[];
  mesmoDia?: boolean;
  depoisVencimento?: number[];
}

export class WhatsAppBoletoService {
  /**
   * Envia boletos baseado em configurações
   * @param options.saas - Se true, usa saas_titulos e saas_dados_empresa
   */
  static async enviarBoletos(config: ConfiguracoesEnvios, options?: { saas?: boolean; empresa_id?: number }): Promise<{
    sucesso: boolean;
    mensagensEnviadas: number;
    erros: number;
  }> {
    const saas = options?.saas ?? false;
    const empresaId = options?.empresa_id;
    try {
      let servidor: ServidorWhatsApp;
      if (saas) {
        const SaasSrv = (await import('../../../models/saas/SaasServidorWhatsapp')).default;
        const saasSrv = await SaasSrv.findOne({ where: { status: 'ativo' } });
        if (!saasSrv) {
          return { sucesso: false, mensagensEnviadas: 0, erros: 0 };
        }
        servidor = {
          id: saasSrv.id,
          tipo_api: 'evolution' as const,
          evolution_api_url: (saasSrv as { url_api?: string }).url_api || '',
          evolution_api_key: (saasSrv as { token?: string }).token || '',
          instance_name: (saasSrv as { numero?: string }).numero || saasSrv.nome,
          ativo: true,
          timeout: 30000,
          notificacoes_automaticas: false,
          tentativas: 1,
          intervalo_tentativas: 0,
        } as unknown as ServidorWhatsApp;
      } else {
        const whereSrv = whereComunicacaoEmpresaEstrito(empresaId, { ativo: true });
        if (!whereSrv) {
          logger.info('[WhatsApp Boleto] empresa_id ausente — envio abortado (isolamento multi-tenant)');
          return { sucesso: false, mensagensEnviadas: 0, erros: 0 };
        }
        const srv = await ServidorWhatsApp.findOne({ where: whereSrv });
        if (!srv) {
          return { sucesso: false, mensagensEnviadas: 0, erros: 0 };
        }
        servidor = srv;
      }

      const whereMsg = saas
        ? { ativo: true }
        : whereComunicacaoEmpresaEstrito(empresaId, { ativo: true });
      if (!whereMsg) {
        return { sucesso: false, mensagensEnviadas: 0, erros: 0 };
      }
      const mensagens = await MensagemWhatsApp.findAll({
        where: whereMsg,
        include: [{ model: TemplateWhatsApp, as: 'template', required: false }],
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
          const resultado = await this.processarEnvio(mensagens, servidor, envio.tipoMensagem, envio.dias, envio.tipo, saas, empresaId);
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

    let titulos: Array<Titulo | (InstanceType<typeof import('../../../models/saas/SaasTitulo').SaasTitulo> & { empresa?: { telefone?: string; razao_social?: string; get: (o: { plain: boolean }) => unknown } })>;

    if (saas) {
      const { SaasTitulo } = await import('../../../models/saas/SaasTitulo');
      const { DadosEmpresa } = await import('../../../models/sistema/DadosEmpresa');
      const { SaasPlano } = await import('../../../models/saas/SaasPlano');
      const { SaasBanco } = await import('../../../models/saas/SaasBanco');
      titulos = await SaasTitulo.findAll({
        where: { status: { [Op.in]: ['pendente', 'vencido'] } as never, pago: false, data_vencimento: { [Op.gte]: dataVencimento, [Op.lt]: proximoDia } },
        include: [
          { model: DadosEmpresa, as: 'empresa', required: true, attributes: ['id', 'razao_social', 'nome_fantasia', 'telefone', 'celular'] },
          { model: SaasPlano, as: 'plano', required: false },
          { model: SaasBanco, as: 'banco', required: false },
        ],
        order: [['data_vencimento', 'ASC'], ['id', 'ASC']],
      }) as typeof titulos;
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
          { model: Cliente, as: 'cliente', required: true, where: { ativo: true, recebe_whatsapp: true } },
          { association: 'contrato', required: false },
          { association: 'banco', required: false },
          { association: 'plano', required: false },
        ],
        order: [['data_vencimento', 'ASC'], ['id', 'ASC']],
      }) as typeof titulos;
    }

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
      if (saas) {
        const emp = (titulo as unknown as { empresa?: { get: (o: { plain: boolean }) => Record<string, unknown> } }).empresa;
        const empData = emp?.get?.({ plain: true }) as Record<string, unknown> | undefined;
        const telefone = (empData?.telefone || empData?.celular) as string | undefined;
        cliente = (empData ? { telefone, razao_social: (empData.razao_social || empData.nome_fantasia) as string } : null) as Cliente;
        contrato = null;
      } else {
        cliente = (titulo as Titulo & { cliente?: Cliente | null }).cliente ?? null;
        contrato = (titulo as Titulo & { contrato?: Contrato | null }).contrato;
      }

      logger.info('WhatsAppBoletoService.processarEnvio - Processando título', {
        context: 'WhatsAppBoletoService',
        tituloId: titulo.id,
        tituloNumero: titulo.numero_titulo,
        clienteNome: cliente?.razao_social,
        clienteTelefone: cliente?.telefone,
        contratoId: contrato?.id,
        saas,
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

        const tituloParaEnvio = saas
          ? ({ ...(typeof titulo.get === 'function' ? (titulo as { get: (o: { plain: boolean }) => Record<string, unknown> }).get({ plain: true }) : titulo), cliente, contrato, banco: (titulo as unknown as { banco?: unknown }).banco, plano: (titulo as unknown as { plano?: unknown }).plano } as unknown as Titulo)
          : titulo;
        const empresaIdHistorico = (titulo as { empresa_id?: number }).empresa_id ?? (cliente as { empresa_id?: number }).empresa_id ?? empresaId;
        const vinculoCobranca = {
          entidade_tipo: 'titulo' as const,
          entidade_id: titulo.id,
          titulo_historico: 'Boleto de Pagamento',
        };
        const contextoSaas = saas && (titulo as { empresa_id?: number }).empresa_id
          ? { saas: true as const, empresa_id: (titulo as { empresa_id: number }).empresa_id, ...vinculoCobranca }
          : empresaIdHistorico != null
            ? { empresa_id: empresaIdHistorico, ...vinculoCobranca }
            : vinculoCobranca;
        const resultado = await this.enviarParaTitulo(mensagem, servidor, tituloParaEnvio as Titulo, cliente, contrato, contextoSaas);

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
      const base64 = await TituloPDFController.gerarPdfBase64(titulo);
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
      const whereSrv = whereComunicacaoEmpresaEstrito(empresaId, { ativo: true });
      if (!whereSrv) {
        logger.info('[Recibo WhatsApp] empresa_id ausente — envio abortado', { titulo_id: titulo.id });
        return false;
      }
      const servidor = await ServidorWhatsApp.findOne({ where: whereSrv });
      if (!servidor) {
        logger.info('[Recibo WhatsApp] Servidor WhatsApp inativo ou não configurado', { titulo_id: titulo.id, empresa_id: empresaId });
        return false;
      }

      const whereMsg = whereComunicacaoEmpresaEstrito(empresaId, { tipo: 'recibo_pagamento', ativo: true });
      const mensagem = whereMsg
        ? await MensagemWhatsApp.findOne({
            where: whereMsg,
            include: [{ model: TemplateWhatsApp, as: 'template', required: false }],
          })
        : null;
      if (!mensagem || mensagem.tipo_envio === 'desativado') {
        logger.info('[Recibo WhatsApp] Mensagem recibo_pagamento não encontrada ou desativada', { titulo_id: titulo.id });
        return false;
      }

      const temTemplate = !!mensagem.template_id;
      const temMensagemPadrao = !!(mensagem.mensagem_padrao && mensagem.mensagem_padrao.trim());
      if (!temTemplate && !temMensagemPadrao) {
        logger.info('[Recibo WhatsApp] Nem template_mapping nem mensagem_padrao configurados', { titulo_id: titulo.id });
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
          logger.info('[Recibo WhatsApp] template_mapping inválido (Cloud API)', { titulo_id: titulo.id });
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
        logger.info(`[Recibo WhatsApp] Componentes: total=${components.length}, tem_header=${components.some((c) => c.type === 'header')}, body_params_count=${bodyComp?.parameters?.length ?? 0}, body_params_preview=${JSON.stringify(bodyParamsPreview)}`);
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
        logger.info('[Recibo WhatsApp] Cloud API exige template - recibo_pagamento sem template configurado, não enviando', { titulo_id: titulo.id });
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
        logger.warn('Falha ao gerar PDF do recibo para WhatsApp, enviando só texto', { titulo_id: titulo.id });
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
   * Reenvia a cobrança de um título SaaS que falhou.
   */
  static async reenviarCobrancaSaas(tituloId: number): Promise<{ sucesso: boolean; mensagem?: string }> {
    try {
      const { SaasTitulo } = await import('../../../models/saas/SaasTitulo');
      const { DadosEmpresa } = await import('../../../models/sistema/DadosEmpresa');
      const { SaasPlano } = await import('../../../models/saas/SaasPlano');
      const { SaasBanco } = await import('../../../models/saas/SaasBanco');
      const SaasSrv = (await import('../../../models/saas/SaasServidorWhatsapp')).default;

      const saasSrv = await SaasSrv.findOne({ where: { status: 'ativo' } });
      if (!saasSrv) {
        return { sucesso: false, mensagem: 'Nenhum servidor WhatsApp ativo encontrado' };
      }
      const servidor = {
        id: saasSrv.id,
        tipo_api: 'evolution' as const,
        evolution_api_url: (saasSrv as { url_api?: string }).url_api || '',
        evolution_api_key: (saasSrv as { token?: string }).token || '',
        instance_name: (saasSrv as { numero?: string }).numero || saasSrv.nome,
        ativo: true,
        timeout: 30000,
        notificacoes_automaticas: false,
        tentativas: 1,
        intervalo_tentativas: 0,
      } as unknown as ServidorWhatsApp;

      const doTenant = await MensagemWhatsApp.findAll({
        where: { ativo: true, empresa_id: { [Op.is]: null } },
        include: [{ model: TemplateWhatsApp, as: 'template', required: false }],
      });
      const mensagens = doTenant.length > 0
        ? doTenant
        : await MensagemWhatsApp.findAll({
          where: { ativo: true },
          include: [{ model: TemplateWhatsApp, as: 'template', required: false }],
        });
      const mensagem = escolherMensagemCobranca(mensagens);
      if (!mensagem) {
        return { sucesso: false, mensagem: 'Mensagem de cobrança não configurada' };
      }

      const titulo = await SaasTitulo.findByPk(tituloId, {
        include: [
          { model: DadosEmpresa, as: 'empresa', required: true, attributes: ['id', 'razao_social', 'nome_fantasia', 'telefone', 'celular'] },
          { model: SaasPlano, as: 'plano', required: false },
          { model: SaasBanco, as: 'banco', required: false },
        ],
      });
      if (!titulo) {
        return { sucesso: false, mensagem: 'Título não encontrado' };
      }

      const emp = (titulo as unknown as { empresa?: { get: (o: { plain: boolean }) => Record<string, unknown> } }).empresa;
      const empData = emp?.get?.({ plain: true }) as Record<string, unknown> | undefined;
      const telefone = (empData?.telefone || empData?.celular) as string | undefined;
      if (!telefone) {
        return { sucesso: false, mensagem: 'Empresa sem telefone cadastrado' };
      }
      const cliente = {
        telefone,
        razao_social: (empData?.razao_social || empData?.nome_fantasia) as string,
      } as Cliente;
      const tituloParaEnvio = {
        ...(titulo.get({ plain: true }) as unknown as Record<string, unknown>),
        cliente,
        contrato: null,
        banco: (titulo as unknown as { banco?: unknown }).banco,
        plano: (titulo as unknown as { plano?: unknown }).plano,
      } as unknown as Titulo;

      const enviou = await this.enviarParaTitulo(
        mensagem,
        servidor,
        tituloParaEnvio,
        cliente,
        null,
        {
          saas: true,
          empresa_id: titulo.empresa_id,
          entidade_tipo: 'titulo',
          entidade_id: titulo.id,
          titulo_historico: 'Boleto de Pagamento',
        }
      );
      return enviou
        ? { sucesso: true, mensagem: 'Mensagem enviada com sucesso' }
        : { sucesso: false, mensagem: 'Erro ao enviar mensagem' };
    } catch (error) {
      logger.error('Erro ao reenviar cobrança SaaS por WhatsApp', {
        tituloId,
        error: error instanceof Error ? error.message : String(error),
      });
      return { sucesso: false, mensagem: 'Erro interno ao enviar mensagem' };
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
