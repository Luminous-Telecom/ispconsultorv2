import { Request, Response } from 'express';
import { NotaFiscal } from '../../../models/nfse/NotaFiscal';
import { Cliente } from '../../../models/clientes/Cliente';
import { Titulo } from '../../../models/financeiro/Titulo';
import { NFeService, DadosNFe } from '../../../services/nfse/NFeService';
import { NotaFiscalService } from '../../../services/nfse/NotaFiscalService';
import { NFSeConfigService } from '../../../services/nfse/NFSeConfigService';
import { DadosEmpresaService } from '../../../services/sistema/DadosEmpresaService';
import { TituloService } from '../../../services/financeiro/TituloService';
import { ContratoService } from '../../../services/contratos/ContratoService';
import { ContratoPlanoAdicionalService } from '../../../services/contratos/ContratoPlanoAdicionalService';
import { Op } from 'sequelize';
import { sequelize } from '../../../config/database';
import { logger } from '../../../utils/logger';
import Joi from 'joi';
import { registrarCriacao } from '../../../services/sistema/AuditoriaService/index';
import type { AuthenticatedRequest } from '../../../types/auth';
import * as fs from 'fs';
import * as path from 'path';
import QRCode from 'qrcode';
import { NFSeConfig } from '../../../models/nfse/NFSeConfig';
import { DadosEmpresa } from '../../../models/sistema/DadosEmpresa';
import { Plano } from '../../../models/cadastros/Plano';
import { Contrato } from '../../../models/contratos/Contrato';
import { ContratoPlanoAdicional } from '../../../models/contratos/ContratoPlanoAdicional';
import { formatDate, parseDateFromDb } from '../../../utils/dateUtils';
import { PDFGenerationService } from '../../../services/pdf-generation/PDFGenerationService';
import { FinancialCalculationsService } from '../../../services/FinancialCalculationsService';
import { resolveImagePath, resolveTemplatePath } from '../../../utils/pathUtils';

export class NotaFiscalController {
  // Schema de validação para criação
  private static createSchema = Joi.object({
    cliente_id: Joi.number().integer().positive().required().messages({
      'any.required': 'ID do cliente é obrigatório',
      'number.base': 'ID do cliente deve ser um número',
      'number.positive': 'ID do cliente deve ser positivo'
    }),
    titulo_id: Joi.number().integer().positive().allow(null, ''),
    natureza_operacao: Joi.string().max(100).allow(null, ''),
    // Aceitar string (YYYY-MM-DD) ou Date para evitar conversão de timezone pelo Joi
    data_emissao: Joi.alternatives().try(Joi.string().pattern(/^\d{4}-\d{2}-\d{2}/), Joi.date()).allow(null, ''),
    data_vencimento: Joi.alternatives().try(Joi.string().pattern(/^\d{4}-\d{2}-\d{2}/), Joi.date()).allow(null, ''),
    valor_total: Joi.number().positive().required().messages({
      'any.required': 'Valor total é obrigatório',
      'number.base': 'Valor total deve ser um número',
      'number.positive': 'Valor total deve ser maior que zero'
    }),
    valor_servicos: Joi.number().min(0).allow(null, ''),
    valor_produtos: Joi.number().min(0).allow(null, ''),
    valor_desconto: Joi.number().min(0).allow(null, ''),
    aliquota_iss: Joi.number().min(0).max(100).allow(null, ''),
    descricao: Joi.string().allow(null, ''),
    observacoes: Joi.string().allow(null, ''),
    modelo: Joi.number().integer().valid(55, 65).allow(null, ''),
    cfop: Joi.string().length(4).allow(null, ''),
    cst_icms: Joi.string().length(3).allow(null, '')
  });

  /**
   * Lista todas as notas fiscais
   */
  static async index(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = '1',
        limit = '15',
        search = '',
        searchField,
        status,
        cliente_id,
        data_inicio,
        data_fim
      } = req.query;

      const pageNumber = parseInt(page as string, 10);
      const limitNumber = parseInt(limit as string, 10);
      const offset = (pageNumber - 1) * limitNumber;

      const where: any = {};

      if (search) {
        const searchTerm = (search as string).trim();
        const isNumericSearch = !isNaN(Number(searchTerm));
        const termNum = parseInt(searchTerm, 10);
        const likePattern = `%${searchTerm}%`;

        if (searchField && typeof searchField === 'string') {
          switch (searchField) {
            case 'id':
              if (isNumericSearch) {
                where.id = termNum;
              } else {
                where.id = { [Op.eq]: -1 };
              }
              break;
            case 'numero':
              where.numero = { [Op.like]: likePattern };
              break;
            case 'chave_acesso':
              where.chave_acesso = { [Op.like]: likePattern };
              break;
            case 'protocolo':
              where.protocolo = { [Op.like]: likePattern };
              break;
            case 'valor':
              if (isNumericSearch) {
                where.valor_total = {
                  [Op.between]: [termNum * 0.9, termNum * 1.1]
                };
              } else {
                where.id = { [Op.eq]: -1 };
              }
              break;
            case 'status':
              where.status = { [Op.like]: likePattern };
              break;
            case 'nfse_status':
              where.nfse_status = { [Op.like]: likePattern };
              break;
            case 'titulo_id':
              if (isNumericSearch) {
                where.titulo_id = termNum;
              } else {
                where.id = { [Op.eq]: -1 };
              }
              break;
            case 'cliente':
              where[Op.or] = [
                sequelize.literal(`EXISTS (SELECT 1 FROM clientes WHERE clientes.id = notas_fiscais.cliente_id AND (clientes.razao_social LIKE '${searchTerm.replace(/'/g, "''")}' OR clientes.nome_fantasia LIKE '${searchTerm.replace(/'/g, "''")}'))`)
              ];
              break;
            default:
              where[Op.or] = [
                { numero: { [Op.like]: likePattern } },
                { chave_acesso: { [Op.like]: likePattern } },
                { protocolo: { [Op.like]: likePattern } }
              ];
          }
        } else {
          const orConditions: any[] = [
            { numero: { [Op.like]: likePattern } },
            { chave_acesso: { [Op.like]: likePattern } },
            { protocolo: { [Op.like]: likePattern } }
          ];
          
          if (isNumericSearch) {
            orConditions.push({ id: termNum });
            orConditions.push({ titulo_id: termNum });
          }
          
          where[Op.or] = orConditions;
        }
      }

      if (status) {
        where.status = status;
      }

      if (cliente_id) {
        where.cliente_id = cliente_id;
      }

      if (data_inicio || data_fim) {
        where.data_emissao = {};
        if (data_inicio) {
          where.data_emissao[Op.gte] = new Date(data_inicio as string);
        }
        if (data_fim) {
          where.data_emissao[Op.lte] = new Date(data_fim as string);
        }
      }

      const result = await NotaFiscalService.list({
        page: pageNumber,
        limit: limitNumber,
        search: search as string,
        searchField: searchField as string,
        status: status as string,
        cliente_id: cliente_id ? parseInt(String(cliente_id), 10) : undefined,
        data_inicio: data_inicio as string,
        data_fim: data_fim as string
      });

      res.json(result);
    } catch (error) {
      logger.error('Erro ao listar notas fiscais:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao listar notas fiscais',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Busca uma nota fiscal por ID
   */
  static async show(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const notaFiscal = await NotaFiscalService.getById(id);

      if (!notaFiscal) {
        res.status(404).json({
          success: false,
          message: 'Nota fiscal não encontrada'
        });
        return;
      }

      res.json({
        success: true,
        data: notaFiscal
      });
    } catch (error) {
      logger.error('Erro ao buscar nota fiscal:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar nota fiscal',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Gera uma nota fiscal individual
   */
  static async gerar(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = NotaFiscalController.createSchema.validate(req.body);

      if (error) {
        res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: error.details.map(detail => detail.message)
        });
        return;
      }

      const dados: DadosNFe = value;
      
      
      const resultado = await NFeService.gerarNFe(dados);

      if (resultado.success && resultado.notaFiscal) {
        try {
          const notaData = resultado.notaFiscal.toJSON() as Record<string, unknown>;
          await registrarCriacao(
            req,
            'NotaFiscal',
            resultado.notaFiscal.id,
            notaData
          );
        } catch (auditError) {
          logger.error('Erro ao registrar auditoria de criação da NFS-e', {
            nota_id: resultado.notaFiscal.id,
            cliente_id: resultado.notaFiscal.cliente_id,
            titulo_id: resultado.notaFiscal.titulo_id,
            error: auditError instanceof Error ? auditError.message : 'Erro desconhecido',
            stack: auditError instanceof Error ? auditError.stack : undefined
          });
        }

        res.status(201).json({
          success: true,
          message: resultado.mensagem || 'NFS-e gerada com sucesso',
          data: resultado.notaFiscal
        });
      } else {
        res.status(400).json({
          success: false,
          message: resultado.mensagem || 'Erro ao gerar NFS-e',
          erro: resultado.erro,
          data: resultado.notaFiscal || null
        });
      }
    } catch (error) {
      logger.error('Erro ao gerar NFS-e:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno ao gerar NFS-e',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Consulta status de uma nota fiscal
   */
  static async consultarStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const resultado = await NFeService.consultarStatus(parseInt(id, 10));

      if (resultado.success) {
        res.json({
          success: true,
          status: resultado.status
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Erro ao consultar status',
          erro: resultado.erro
        });
      }
    } catch (error) {
      logger.error('Erro ao consultar status da NFS-e:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno ao consultar status',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Cancela uma nota fiscal
   */
  static async cancelar(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { justificativa } = req.body;

      if (!justificativa || justificativa.length < 15) {
        res.status(400).json({
          success: false,
          message: 'Justificativa é obrigatória e deve ter pelo menos 15 caracteres'
        });
        return;
      }

      const resultado = await NFeService.cancelarNFe(parseInt(id, 10), justificativa);

      if (resultado.success) {
        res.json({
          success: true,
          message: resultado.mensagem || 'NFS-e cancelada com sucesso'
        });
      } else {
        res.status(400).json({
          success: false,
          message: resultado.mensagem || 'Erro ao cancelar NFS-e',
          erro: resultado.erro
        });
      }
    } catch (error) {
      logger.error('Erro ao cancelar NFS-e:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno ao cancelar NFS-e',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Lista notas fiscais de um cliente específico
   */
  static async listarPorCliente(req: Request, res: Response): Promise<void> {
    try {
      const { cliente_id } = req.params;
      const {
        page = '1',
        limit = '15'
      } = req.query;

      const pageNumber = parseInt(page as string, 10);
      const limitNumber = parseInt(limit as string, 10);

      const result = await NotaFiscalService.findByCliente(
        parseInt(cliente_id, 10),
        pageNumber,
        limitNumber
      );

      res.json(result);
    } catch (error) {
      logger.error('Erro ao listar notas fiscais do cliente:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao listar notas fiscais do cliente',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Busca PDF de uma nota fiscal (gera usando modelo próprio)
   */
  private static async getPdfBuffer(notaFiscal: NotaFiscal): Promise<Buffer | null> {
    try {
      const notaCompleta = await NotaFiscalService.getById(notaFiscal.id) as (NotaFiscal & { cliente?: Cliente | null }) | null;

      if (!notaCompleta || !notaCompleta.cliente) {
        return null;
      }


      return await NotaFiscalController.gerarPdfNfse(notaCompleta);
    } catch (error) {
      logger.error('Erro ao gerar PDF da NFS-e', {
        nota_id: notaFiscal.id,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      });
      return null;
    }
  }

  /**
   * Imprime uma NFS-e por ID
   */
  static async imprimir(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const notaFiscalId = parseInt(id, 10);

      if (isNaN(notaFiscalId)) {
        res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
        return;
      }

      const notaFiscal = await NotaFiscalService.getById(notaFiscalId);

      if (!notaFiscal) {
        res.status(404).json({
          success: false,
          message: 'NFS-e não encontrada'
        });
        return;
      }

      const pdfBuffer = await NotaFiscalController.getPdfBuffer(notaFiscal);

      if (!pdfBuffer) {
        res.status(404).json({
          success: false,
          message: 'PDF da NFS-e não encontrado. A nota pode ainda estar sendo processada.'
        });
        return;
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="nfse-${notaFiscal.numero || notaFiscalId}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      logger.error('Erro ao imprimir NFS-e:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno ao imprimir NFS-e',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Imprime múltiplas NFS-e
   */
  static async imprimirMultiplas(req: Request, res: Response): Promise<void> {
    try {
      const { ids } = req.query;

      if (!ids || typeof ids !== 'string') {
        res.status(400).json({
          success: false,
          message: 'IDs das NFS-e não fornecidos'
        });
        return;
      }

      const idsArray = ids.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));

      if (idsArray.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Nenhum ID válido fornecido'
        });
        return;
      }

      // Para cada título, buscar sua NF específica
      const pdfBuffers: Buffer[] = [];

      for (const tituloId of idsArray) {
        const titulo = await TituloService.getById(tituloId);
        if (!titulo?.nota_fiscal_id) continue;

        const notaFiscal = await NotaFiscalService.getById(titulo.nota_fiscal_id);
        if (notaFiscal?.nfse_status === 'emitida' && notaFiscal.numero) {
          const pdfBuffer = await NotaFiscalController.getPdfBuffer(notaFiscal);
          if (pdfBuffer) pdfBuffers.push(pdfBuffer);
        }
      }

      if (pdfBuffers.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Nenhum título com NFS-e emitida encontrado'
        });
        return;
      }

      // Retornar o primeiro PDF válido encontrado
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="nfse-${idsArray[0]}.pdf"`);
      res.send(pdfBuffers[0]);
    } catch (error) {
      logger.error('Erro ao imprimir múltiplas NFS-e:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno ao imprimir NFS-e',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Gera PDF da NFS-e a partir dos dados do banco
   */
  private static async gerarPdfNfse(notaFiscal: NotaFiscal & { cliente?: Cliente | null }): Promise<Buffer> {
    try {
      logger.info('Iniciando geração de PDF da NFS-e', {
        nota_id: notaFiscal.id
      });

      const html = await NotaFiscalController.processarNfseHtml(notaFiscal);

      logger.debug('HTML processado para PDF', {
        nota_id: notaFiscal.id,
        htmlLength: html.length,
        hasLogoInHtml: html.includes('data:image/svg+xml;base64,'),
        hasImgTag: html.includes('<img'),
        logoImgTags: (html.match(/<img[^>]*src="[^"]*data:image\/svg\+xml;base64,[^"]*"[^>]*>/g) || []).length
      });

      const pdfBuffer = await PDFGenerationService.generateFromHtml(html, 'html-pdf-node', {
        format: 'A4',
        margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' },
        printBackground: true
      });

      logger.info('PDF gerado com sucesso', {
        nota_id: notaFiscal.id,
        pdfSize: pdfBuffer.length
      });

      return pdfBuffer;
    } catch (error) {
      logger.error('Erro ao gerar PDF da NFS-e no NotaFiscalController', {
        nota_id: notaFiscal.id,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  /**
   * Processa HTML da NFS-e substituindo variáveis do template
   */
  private static async processarNfseHtml(notaFiscal: NotaFiscal & { cliente?: Cliente | null }): Promise<string> {

    if (!notaFiscal.cliente) {
      throw new Error('Cliente não encontrado para a nota fiscal');
    }

    const dadosEmpresa = await DadosEmpresaService.findOne();
    if (!dadosEmpresa) {
      throw new Error('Dados da empresa não configurados');
    }

    const nfseConfig = await NFSeConfigService.get();
    const descricaoServico = nfseConfig?.descricao_servico || '';

    // Buscar serviços (plano principal e adicionais)
    const servicos: Array<{
      nome: string;
      valor: number;
      desconto: number;
      valorFinal: number;
    }> = [];

    if (notaFiscal.titulo_id) {

      const titulo = await TituloService.getById(notaFiscal.titulo_id) as (Titulo & { plano?: Plano }) | null;

      if (titulo && titulo.plano) {
        const valorPlano = Number(titulo.plano.valor_mensal);
        let valorFinal = valorPlano;

        // Usar valor final do título
        if (titulo.valor_final) {
          valorFinal = Number(titulo.valor_final);
        }

        const descontoTotal = Math.max(0, valorPlano - valorFinal);
        servicos.push({
          nome: titulo.plano.nome_plano,
          valor: valorPlano,
          desconto: descontoTotal,
          valorFinal: valorFinal
        });

        // Buscar planos adicionais do contrato se existir
        if (titulo.contrato_id) {
          const contrato = await ContratoService.getById(titulo.contrato_id);

          if (contrato) {

            // Buscar planos adicionais
            const planosAdicionais = await ContratoPlanoAdicionalService.getByContrato(contrato.id);
            
            // Filtrar apenas os ativos
            const planosAtivos = planosAdicionais.filter(p => p.status === 'ativo') as Array<ContratoPlanoAdicional & { plano?: Plano }>;

            for (const planoAdicional of planosAtivos) {
              if (planoAdicional.plano) {
                const valorPlanoAdicional = Number(planoAdicional.plano.valor_mensal);
                let valorFinalAdicional = valorPlanoAdicional;

                // Usar valor_final do contrato_plano_adicional se disponível, senão calcular
                if (planoAdicional.valor_final) {
                  valorFinalAdicional = Number(planoAdicional.valor_final);
                } else {
                  valorFinalAdicional = FinancialCalculationsService.calcularValorFinal(
                    valorPlanoAdicional,
                    {
                      desconto_valor: planoAdicional.desconto_valor,
                      desconto_percentual: planoAdicional.desconto_percentual
                    }
                  );
                }

                const descontoTotalAdicional = Math.max(0, valorPlanoAdicional - valorFinalAdicional);
                servicos.push({
                  nome: planoAdicional.plano.nome_plano,
                  valor: valorPlanoAdicional,
                  desconto: descontoTotalAdicional,
                  valorFinal: valorFinalAdicional
                });
              }
            }
          }
        }
      }
    }

    // Se não encontrou serviços, usar valor padrão
    if (servicos.length === 0) {
      const valorServicos = Number(notaFiscal.valor_servicos || notaFiscal.valor_total);
      const valorDesconto = Number(notaFiscal.valor_desconto || 0);
      const valorFinal = Number(notaFiscal.valor_total);
      servicos.push({
        nome: 'Serviço',
        valor: valorServicos,
        desconto: valorDesconto,
        valorFinal: valorFinal
      });
    }

    const formatarData = (data: Date | string | null | undefined): string => {
      if (!data) return '';
      try {
        return formatDate(data instanceof Date ? data : parseDateFromDb(data)) || '';
      } catch {
        return '';
      }
    };

    const formatarDataHora = (data: Date | string | null | undefined): string => {
      if (!data) return '';
      try {
        const dateToFormat = data instanceof Date ? data : (parseDateFromDb(data) || new Date());
        if (!dateToFormat || isNaN(dateToFormat.getTime())) return '';

        // Log antes de formatar
        logger.info(`[NotaFiscalController] Formatando data_emissao - Local: ${dateToFormat.getFullYear()}-${String(dateToFormat.getMonth() + 1).padStart(2, '0')}-${String(dateToFormat.getDate()).padStart(2, '0')} ${String(dateToFormat.getHours()).padStart(2, '0')}:${String(dateToFormat.getMinutes()).padStart(2, '0')}:${String(dateToFormat.getSeconds()).padStart(2, '0')}, UTC: ${dateToFormat.getUTCFullYear()}-${String(dateToFormat.getUTCMonth() + 1).padStart(2, '0')}-${String(dateToFormat.getUTCDate()).padStart(2, '0')} ${String(dateToFormat.getUTCHours()).padStart(2, '0')}:${String(dateToFormat.getUTCMinutes()).padStart(2, '0')}:${String(dateToFormat.getUTCSeconds()).padStart(2, '0')}, ISO: ${dateToFormat.toISOString()}`);

        // Usar componentes locais diretamente
        const day = String(dateToFormat.getDate()).padStart(2, '0');
        const month = String(dateToFormat.getMonth() + 1).padStart(2, '0');
        const year = dateToFormat.getFullYear();
        const hour = String(dateToFormat.getHours()).padStart(2, '0');
        const minute = String(dateToFormat.getMinutes()).padStart(2, '0');
        const second = String(dateToFormat.getSeconds()).padStart(2, '0');

        const formatted = `${day}/${month}/${year} ${hour}:${minute}:${second}`;
        logger.info(`[NotaFiscalController] Data formatada: ${formatted}`);
        
        return formatted;
      } catch {
        return '';
      }
    };

    const formatarStatus = (status: string | null | undefined): string => {
      const statusMap: Record<string, string> = {
        'PENDENTE': 'Pendente',
        'PROCESSANDO': 'Processando',
        'AUTORIZADA': 'Autorizada',
        'CANCELADA': 'Cancelada',
        'REJEITADA': 'Rejeitada',
        'ERRO': 'Erro'
      };
      return statusMap[status || ''] || status || 'Pendente';
    };

    let qrCodeImage = '';
    if (notaFiscal.chave_acesso) {
      try {
        const urlConsulta = `https://www.nfse.gov.br/ConsultaPublica/?tpc=1&chave=${notaFiscal.chave_acesso}`;
        const qrCodeDataUrl = await QRCode.toDataURL(urlConsulta, { width: 100, margin: 1, errorCorrectionLevel: 'M' });
        qrCodeImage = `<img src="${qrCodeDataUrl}" style="max-width: 100px; max-height: 100px; display: block; margin: 0 auto;" />`;
      } catch {
        // QR Code opcional, continua sem ele
      }
    }

    let logoNfseBase64 = '';
    // Usar resolveImagePath para funcionar tanto em dev quanto em produção
    const logoPath = resolveImagePath('sistema', 'logo-nfse-assinatura-horizontal.svg');

    if (fs.existsSync(logoPath)) {
      try {
        const logoSvg = fs.readFileSync(logoPath, 'utf-8');
        logoNfseBase64 = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString('base64')}`;
      } catch (error) {
        logger.error('Erro ao ler logo NFS-e', {
          nota_id: notaFiscal.id,
          logoPath,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }

    // Usar resolveTemplatePath para funcionar tanto em dev quanto em produção
    const templatePath = resolveTemplatePath('nfse.html');
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template não encontrado: ${templatePath}`);
    }

    let template = fs.readFileSync(templatePath, 'utf-8');

    const codigoServicoMunicipal = nfseConfig?.codigo_servico_municipal || '';

    const criarSecaoRow = (label: string, value: string): string =>
      `<div class="row"><span class="row-label">${label}:</span><span class="row-value">${value}</span></div>`;

    const formatarValor = (valor: number | null | undefined): string => {
      if (!valor && valor !== 0) return 'R$ 0,00';
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor));
    };

    const cliente = notaFiscal.cliente;
    const templateVars: Record<string, string> = {
      LOGO_NFSE: logoNfseBase64 ? `<img src="${logoNfseBase64}" style="max-width: 200px; height: auto; display: block; margin: 0 auto 10px;" />` : '',
      EMPRESA_RAZAO_SOCIAL: dadosEmpresa.razao_social || '',
      EMPRESA_CNPJ: dadosEmpresa.cnpj || '',
      EMPRESA_INSCRICAO_MUNICIPAL: dadosEmpresa.inscricao_municipal || '',
      EMPRESA_ENDERECO: dadosEmpresa.endereco || '',
      EMPRESA_NUMERO: dadosEmpresa.numero || '',
      EMPRESA_COMPLEMENTO: dadosEmpresa.complemento || '',
      EMPRESA_BAIRRO: dadosEmpresa.bairro || '',
      EMPRESA_CEP: dadosEmpresa.cep || '',
      EMPRESA_CIDADE: dadosEmpresa.cidade || '',
      EMPRESA_ESTADO: dadosEmpresa.estado || '',
      EMPRESA_TELEFONE: dadosEmpresa.telefone || dadosEmpresa.celular || '',
      EMPRESA_EMAIL: dadosEmpresa.email || '',
      NUMERO: notaFiscal.numero || notaFiscal.id.toString(),
      SERIE: notaFiscal.serie || '1',
      DATA_EMISSAO: formatarDataHora(notaFiscal.data_emissao),
      STATUS: formatarStatus(notaFiscal.status),
      CLIENTE_RAZAO_SOCIAL: cliente.razao_social || '',
      CLIENTE_NOME_FANTASIA: cliente.nome_fantasia || '',
      CLIENTE_CNPJ: cliente.cnpj || '',
      CLIENTE_INSCRICAO_ESTADUAL: '',
      CLIENTE_ENDERECO: cliente.endereco || '',
      CLIENTE_NUMERO: cliente.numero || '',
      CLIENTE_COMPLEMENTO: cliente.complemento || '',
      CLIENTE_BAIRRO: cliente.bairro || '',
      CLIENTE_CEP: cliente.cep || '',
      CLIENTE_CIDADE: cliente.cidade || '',
      CLIENTE_ESTADO: cliente.estado || '',
      CLIENTE_TELEFONE: cliente.telefone || '',
      CLIENTE_EMAIL: cliente.email || '',
      DESCRICAO: descricaoServico,
      OBSERVACOES: notaFiscal.observacoes || '',
      NATUREZA_OPERACAO: notaFiscal.natureza_operacao || '',
      CODIGO_SERVICO_MUNICIPAL: codigoServicoMunicipal,
      VALOR_TOTAL_FORMATADO: formatarValor(notaFiscal.valor_total),
      VALOR_SERVICOS_FORMATADO: formatarValor(notaFiscal.valor_servicos),
      VALOR_PRODUTOS_FORMATADO: formatarValor(notaFiscal.valor_produtos),
      VALOR_DESCONTO_FORMATADO: formatarValor(notaFiscal.valor_desconto),
      ALIQUOTA_ISS: notaFiscal.aliquota_iss ? Number(notaFiscal.aliquota_iss).toFixed(2) : '0,00',
      VALOR_ISS_FORMATADO: formatarValor(notaFiscal.valor_iss),
      CHAVE_ACESSO: notaFiscal.chave_acesso || '',
      PROTOCOLO: notaFiscal.protocolo || '',
      DATA_AUTORIZACAO: formatarDataHora(notaFiscal.data_autorizacao),
      QR_CODE: qrCodeImage,
      EMPRESA_INSCRICAO_MUNICIPAL_SECTION: dadosEmpresa.inscricao_municipal
        ? criarSecaoRow('Inscrição Municipal', dadosEmpresa.inscricao_municipal)
        : '',
      CLIENTE_INSCRICAO_ESTADUAL_SECTION: '',
      OBSERVACOES_SECTION: notaFiscal.observacoes ? criarSecaoRow('Observações', notaFiscal.observacoes) : '',
      PROTOCOLO_SECTION: notaFiscal.protocolo
        ? `<div class="protocolo"><strong>Protocolo de Autorização:</strong> ${notaFiscal.protocolo}</div>`
        : '',
      DATA_AUTORIZACAO_SECTION: notaFiscal.data_autorizacao
        ? criarSecaoRow('Data e Hora de Autorização', formatarDataHora(notaFiscal.data_autorizacao))
        : ''
    };

    Object.entries(templateVars).forEach(([key, value]) => {
      template = template.replace(new RegExp(`{{${key}}}`, 'g'), String(value || ''));
    });

    return template;
  }
}
