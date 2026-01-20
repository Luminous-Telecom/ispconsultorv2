import { Op } from 'sequelize';
import { ServidorWhatsApp } from '../../../models/comunicacao/ServidorWhatsApp';
import { MensagemWhatsApp } from '../../../models/comunicacao/MensagemWhatsApp';
import { Titulo } from '../../../models/financeiro/Titulo';
import { Cliente } from '../../../models/clientes/Cliente';
import { Contrato } from '../../../models/contratos/Contrato';
import { logger } from '../../../utils/logger';
import { VariaveisDocumentoService } from '../../documentos/VariaveisDocumentoService';
import { TituloPDFController } from '../../../controllers/titulos/TituloPDFController';
import { WhatsAppSenderService } from '../WhatsAppSenderService';
import { WhatsAppTemplateService } from '../WhatsAppTemplateService';
import { WhatsAppCloudService } from '../WhatsAppCloudService';

interface ConfiguracoesEnvios {
  antesVencimento?: number[];
  mesmoDia?: boolean;
  depoisVencimento?: number[];
}

export class WhatsAppBoletoService {
  /**
   * Envia boletos baseado em configurações
   */
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

      const envios = [
        ...(config.antesVencimento?.map(dias => ({ dias, tipo: 'antes' as const, tipoMensagem: `${String(dias).padStart(2, '0')}_dias_antes_vencimento` })) || []),
        ...(config.mesmoDia ? [{ dias: 0, tipo: 'mesmo' as const, tipoMensagem: 'mesmo_dia_vencimento' }] : []),
        ...(config.depoisVencimento?.map(dias => ({ dias, tipo: 'depois' as const, tipoMensagem: `${String(dias).padStart(2, '0')}_dias_depois_vencimento` })) || [])
      ];

      for (const envio of envios) {
        try {
          const resultado = await this.processarEnvio(mensagens, servidor, envio.tipoMensagem, envio.dias, envio.tipo);
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

    const titulos = await Titulo.findAll({
      where: {
        status: { [Op.in]: ['pendente', 'vencido'] },
        pago: false,
        data_vencimento: { [Op.gte]: dataVencimento, [Op.lt]: proximoDia }
      },
      include: [
        { model: Cliente, as: 'cliente', required: true, where: { ativo: true, recebe_whatsapp: true } },
        { association: 'contrato', required: false },
        { association: 'banco', required: false },
        { association: 'plano', required: false }
      ],
      order: [['data_vencimento', 'ASC'], ['id', 'ASC']]
    });

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
      const cliente = (titulo as Titulo & { cliente?: Cliente | null }).cliente;
      const contrato = (titulo as Titulo & { contrato?: Contrato | null }).contrato;

      logger.info('WhatsAppBoletoService.processarEnvio - Processando título', {
        context: 'WhatsAppBoletoService',
        tituloId: titulo.id,
        tituloNumero: titulo.numero_titulo,
        clienteNome: cliente?.razao_social,
        clienteTelefone: cliente?.telefone,
        contratoId: contrato?.id
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

        const resultado = await this.enviarParaTitulo(mensagem, servidor, titulo, cliente, contrato);

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
    contrato: Contrato | null | undefined
  ): Promise<boolean> {
    const telefone = this.formatarTelefone(cliente.telefone!);
    const baseUrl = undefined;

    if (servidor.tipo_api === 'whatsapp_cloud') {
      return await this.enviarViaCloud(mensagem, servidor, telefone, titulo, cliente, contrato, baseUrl);
    }

    return await this.enviarViaEvolution(mensagem, servidor, telefone, titulo, cliente, contrato, baseUrl);
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
    baseUrl: undefined
  ): Promise<boolean> {
    const templateInfo = WhatsAppCloudService.obterTemplateInfo(mensagem.template_mapping);
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

    const components = await WhatsAppTemplateService.prepararComponentesTemplate({
      servidor,
      cliente,
      contrato: contrato || undefined,
      titulo,
      mensagemTexto: msg,
      incluirPdfNoHeader: mensagem.tipo_envio === 'pdf' || templateInfo.name === 'fatura_pdf',
      variables: templateInfo.variables
    });

    return await WhatsAppCloudService.enviarTemplate(
      servidor,
      telefone,
      templateInfo.name,
      templateInfo.language,
      components,
      { nome_fantasia: cliente.nome_fantasia || undefined, razao_social: cliente.razao_social || undefined },
      titulo
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
    baseUrl: undefined
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
      const enviouPdf = await WhatsAppSenderService.enviarPdfBase64(servidor, telefone, base64, msg);
      if (!enviouPdf) {
        return false;
      }
      await this.enviarMensagensInteracao(mensagem, servidor, telefone, cliente, contrato, titulo);
      return true;
    }

    const enviouTexto = await WhatsAppSenderService.enviarTexto(servidor, telefone, msg);
    if (!enviouTexto) {
      return false;
    }
    await this.enviarMensagensInteracao(mensagem, servidor, telefone, cliente, contrato, titulo);
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
    titulo: Titulo
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

        const enviou = await WhatsAppSenderService.enviarTexto(servidor, telefone, texto);
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
   * Formata telefone para padrão brasileiro
   */
  private static formatarTelefone(telefone: string): string {
    const apenasNumeros = telefone.replace(/\D/g, '');
    return apenasNumeros.startsWith('55') ? apenasNumeros : `55${apenasNumeros}`;
  }
}
