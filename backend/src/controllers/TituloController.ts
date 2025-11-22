import { Request, Response } from 'express';
import { Titulo } from '../models/Titulo';
import { Cliente } from '../models/Cliente';
import { Contrato } from '../models/Contrato';
import { Plano } from '../models/Plano';
import { Banco } from '../models/Banco';
import { DiasVencimento } from '../models/DiasVencimento';
import { BancoApiService } from '../services/BancoApiService';
import { BarcodeService } from '../services/BarcodeService';
import { ajustarDataVencimento } from '../utils/dateUtils';
import { logger } from '../utils/logger';
import puppeteer from 'puppeteer';
import { Op, WhereOptions, QueryTypes, Transaction } from 'sequelize';
import { sequelize } from '../config/database';
import { withTransaction } from '../utils/transaction';
import { tituloCreateSchema, titulosBulkCreateSchema } from '../validators/titulo.validator';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type htmlPdf from 'html-pdf-node';
import type { PdfOptions } from 'html-pdf-node';

// Interface para Titulo com relações carregadas
interface TituloComRelacoes extends Titulo {
  cliente?: Cliente & { nome?: string; cpf?: string; cnpj?: string };
  banco?: Banco; // Banco completo, aceita logo: string | null
  contrato?: Contrato;
  plano?: Plano;
}

/**
 * Controller responsável por gerenciar títulos (boletos) do sistema
 * Inclui operações de CRUD, geração de PDF, processamento HTML e integração com bancos
 * 
 * @class TituloController
 */
export class TituloController {
  
  /**
   * Gera PDF do boleto em formato base64
   * Usa Puppeteer para renderizar HTML em PDF com alta qualidade
   * 
   * @param titulo - Título completo com relações carregadas (cliente, banco, contrato, plano)
   * @returns Promise com PDF em base64 ou null em caso de erro
   * 
   * @remarks
   * - Requer Puppeteer instalado e configurado
   * - HTML é gerado via processarBoletoHtml antes da conversão
   * - PDF é gerado em formato A4 com margens de 0.5cm
   * - Browser é fechado automaticamente após geração
   * 
   * @example
   * ```typescript
   * const titulo = await Titulo.findByPk(1, { include: ['cliente', 'banco'] });
   * const pdfBase64 = await TituloController.gerarPdfBase64(titulo);
   * // Retorna: "JVBERi0xLjQKJdPr6eEKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMi..."
   * ```
   */
  static async gerarPdfBase64(titulo: TituloComRelacoes): Promise<string | null> {
    try {
      const html = await this.processarBoletoHtml(titulo);
      
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'a4',
        printBackground: true,
        margin: {
          top: '0.5cm',
          right: '0.5cm',
          bottom: '0.5cm',
          left: '0.5cm'
        }
      });

      await browser.close();

      return Buffer.from(pdfBuffer).toString('base64');
    } catch (error) {
      logger.error('Erro ao gerar PDF do boleto:', error);
      return null;
    }
  }

  /**
   * Processa template HTML do boleto substituindo variáveis pelos dados reais
   * Carrega dados da empresa, formata valores e datas, e substitui placeholders
   * 
   * @param titulo - Título completo com relações carregadas
   * @returns Promise com HTML processado pronto para conversão em PDF
   * 
   * @remarks
   * - Carrega dados da empresa automaticamente
   * - Formata valores monetários para padrão brasileiro (R$ 1.234,56)
   * - Converte datas para formato brasileiro (DD/MM/YYYY)
   * - Processa variáveis do template como {{valor_boleto}}, {{data_vencimento}}, etc.
   * 
   * @throws {Error} Se dados da empresa não estiverem configurados
   * 
   * @example
   * ```typescript
   * const titulo = await Titulo.findByPk(1, { include: ['cliente', 'banco'] });
   * const html = await TituloController['processarBoletoHtml'](titulo);
   * // Retorna HTML completo com todos os dados substituídos
   * ```
   */
  private static async processarBoletoHtml(titulo: TituloComRelacoes): Promise<string> {
    // Carregar dados da empresa
    const { DadosEmpresa } = await import('../models/DadosEmpresa');
    const dadosEmpresa = await DadosEmpresa.findOne();
    
    if (!dadosEmpresa) {
      throw new Error('Dados da empresa não configurados');
    }

    // Preparar variáveis para o template
    const dataVencimento = new Date(titulo.data_vencimento).toLocaleDateString('pt-BR');
    const dataProcessamento = new Date().toLocaleDateString('pt-BR');
    const valorBoleto = Number(titulo.valor).toFixed(2).replace('.', ',');
    
    // Carregar templates
    const fs = await import('fs');
    const path = await import('path');
    
    const templatesPath = path.join(__dirname, '../templates');
    const topoTemplatePath = path.join(templatesPath, 'boleto-topo-inner.html');
    const corpoTemplatePath = path.join(templatesPath, 'boleto-corpo-inner.html');
    
    const topoTemplate = fs.readFileSync(topoTemplatePath, 'utf8');
    const corpoTemplate = fs.readFileSync(corpoTemplatePath, 'utf8');

    // Verificar logo do banco antes de criar templateVars
    let logoBanco = '';
    if (titulo.banco?.logo) {
      logoBanco = titulo.banco.logo;
      logger.info('Logo do banco encontrada no cadastro', {
        titulo_id: titulo.id,
        banco_id: titulo.banco_id,
        banco_nome: titulo.banco?.nome || '',
        logo: logoBanco.substring(0, 50) + '...'
      });
    } else {
      // Tentar carregar logo padrão do banco
      const logoPadrao = TituloController.getLogoBancoPadrao(titulo.banco?.tipo_banco || '');
      
      if (logoPadrao) {
        logoBanco = logoPadrao;
        logger.info('Usando logo padrão do banco', {
          titulo_id: titulo.id,
          banco_id: titulo.banco_id,
          banco_nome: titulo.banco?.nome || '',
          tipo_banco: titulo.banco?.tipo_banco || ''
        });
      } else {
        // Fallback para logo da empresa
        logoBanco = dadosEmpresa.logo || '';
        logger.warn('Logo do banco não encontrada, usando logo da empresa', {
          titulo_id: titulo.id,
          banco_id: titulo.banco_id,
          banco_nome: titulo.banco?.nome || '',
          tipo_banco: titulo.banco?.tipo_banco || ''
        });
      }
    }
    
    // Converter logo do banco para base64 se necessário
    logoBanco = TituloController.converterLogoParaBase64(logoBanco);
    
    // Converter logo da empresa para base64 se necessário
    const logoEmpresa = TituloController.converterLogoParaBase64(dadosEmpresa.logo || '');

    // Variáveis para substituição no template - Padrão FEBRABAN
    const templateVars = {
      // Dados da empresa (Beneficiário)
      LOGOMARCA: logoEmpresa,
      CEDENTE: (dadosEmpresa.razao_social && dadosEmpresa.razao_social.trim()) || (dadosEmpresa.nome_fantasia && dadosEmpresa.nome_fantasia.trim()) || 'Empresa não configurada',
      EMPRESACPF: dadosEmpresa.cnpj || '',
      EMPRESAENDERECO: `${dadosEmpresa.endereco || ''} ${dadosEmpresa.numero || ''}`.trim(),
      EMPRESABAIRRO: dadosEmpresa.bairro || '',
      EMPRESACEP: dadosEmpresa.cep || '',
      EMPRESACIDADE: dadosEmpresa.cidade || '',
      EMPRESAESTADO: dadosEmpresa.estado || '',
      
      // Dados do banco - FEBRABAN
      LOGOBANCO: logoBanco,
      CODIGO_BANCO_COM_DV: titulo.banco?.codigo ? `${titulo.banco.codigo}-${BarcodeService.calcularDVCodigoBanco(titulo.banco.codigo)}` : '364-9',
      LINHA_DIGITAVEL: titulo.linha_digitavel || titulo.codigo_barras || '',
      AGENCIA_CODIGO: titulo.banco?.codigo || 'Não configurado',
      
      // Dados do boleto - FEBRABAN
      LOCAL_PAGAMENTO: 'Pagável em qualquer banco até o vencimento',
      DATA_VENC: dataVencimento,
      DATA_DOCUMENTO: dataProcessamento,
      NUMERO_DOCUMENTO: titulo.nosso_numero || titulo.numero_titulo || titulo.id?.toString() || '',
      ESPECIE_DOC: 'DM',
      DATA_PROC: dataProcessamento,
      NOSSO_NUMERO: titulo.nosso_numero || titulo.charge_id || '',
      CARTEIRA: 'SR',
      VAR_CARTEIRA: '',
      ESPECIE: 'R$',
      VALOR_BOLETO: valorBoleto,
      
      // Dados do cliente (Pagador) - FEBRABAN
      SACADO_NOME: titulo.cliente?.razao_social || titulo.cliente?.nome || '',
      TIPO_PSACADO: titulo.cliente?.cnpj ? 'CNPJ' : 'CPF',
      SACADO_CPF: titulo.cliente?.cnpj || titulo.cliente?.cpf || '',
      SACADO_ENDERECO: `${titulo.cliente?.endereco || ''} ${titulo.cliente?.numero || ''}`.trim(),
      SACADO_BAIRRO: titulo.cliente?.bairro || '',
      SACADO_COMPLEMENTO: titulo.cliente?.complemento || '',
      SACADO_CIDADE: titulo.cliente?.cidade || '',
      SACADO_ESTADO: titulo.cliente?.estado || '',
      SACADO_CEP: titulo.cliente?.cep || '',
      SACADO_IDNOME: titulo.cliente?.razao_social || titulo.cliente?.nome || '',
      
      // Dados do plano
      NOME_PLANO: titulo.plano?.nome_plano || '',
      DESCRICAO_PLANO: titulo.plano?.descricao || '',
      TIPO_SERVICO: titulo.plano?.tipo_servico || 'Internet',
      QUANTIDADE_USUARIOS: titulo.plano?.quantidade_usuarios || '1',
      VALOR_PLANO: valorBoleto,
      PERIODICIDADE: 'Mensal',
      
      // Instruções
      TEXTO_MULTAMORA: titulo.banco?.percentual_multa || titulo.banco?.percentual_juros ? 
        `Multa de ${titulo.banco?.percentual_multa || 2}% + Juros de ${titulo.banco?.percentual_juros || 0.033}% ao dia após o vencimento` : '',
      INSTRUCOES1: TituloController.processarInstrucao(titulo.banco?.instrucao_linha_1 || '', titulo),
      INSTRUCOES2: TituloController.processarInstrucao(titulo.banco?.instrucao_linha_2 || '', titulo),
      INSTRUCOES3: TituloController.processarInstrucao(titulo.banco?.instrucao_linha_3 || '', titulo),
      INSTRUCOES4: TituloController.processarInstrucao(titulo.banco?.instrucao_linha_4 || '', titulo),
      INSTRUCOES5: TituloController.processarInstrucao(titulo.banco?.instrucao_linha_5 || '', titulo),
      
      // QR Code PIX e Código de Barras
      QRCODE: titulo.qrcode_image || '',
      QRCODE_HTML: titulo.qrcode_image 
        ? `<img src="${titulo.qrcode_image}" style="width: 100px; height: 100px; max-width: 100px; max-height: 100px;" /><br><span style="font-size: 8px; font-weight: bold;">PIX - Pagamento Instantâneo</span>`
        : '<div style="color: #666; font-size: 8px;">QR Code PIX<br>Não disponível</div>',
      BOLETO_BARCODE2: titulo.codigo_barras ? BarcodeService.generateFebrabanBarcodeSvg(titulo.codigo_barras) : ''
    };

    // Processar templates
    let topoProcessado = topoTemplate;
    let corpoProcessado = corpoTemplate;
    
    Object.entries(templateVars).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      topoProcessado = topoProcessado.replace(regex, String(value));
      corpoProcessado = corpoProcessado.replace(regex, String(value));
    });

    return `${topoProcessado}${corpoProcessado}`;
  }

  // Converter logo para base64 se for URL HTTP ou caminho local
  private static converterLogoParaBase64(logo: string): string {
    if (!logo || logo.startsWith('data:image/')) {
      return logo || '';
    }
    
    try {
      let cleanPath = logo;
      
      // Se for URL HTTP, extrair o pathname
      if (logo.startsWith('http://') || logo.startsWith('https://')) {
        const url = new URL(logo);
        cleanPath = url.pathname;
      }
      
      const fileName = cleanPath.split('/').pop() || '';
      
      // Verificar se é logo padrão de banco
      if (fileName.includes('efi.png')) return this.getLogoBancoPadrao('efi');
      if (fileName.includes('asaas.png')) return this.getLogoBancoPadrao('asaas');
      if (fileName.includes('boletoproprio.png')) return this.getLogoBancoPadrao('bancario');
      
      // Remover barra inicial se houver
      if (cleanPath.startsWith('/')) {
        cleanPath = cleanPath.substring(1);
      }
      
      // Usar process.cwd() para caminho absoluto do projeto
      const imagePath = path.join(process.cwd(), cleanPath);
      
      if (fs.existsSync(imagePath)) {
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');
        const ext = fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();
        const mimeType = ext === 'png' ? 'image/png' : 
                        ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 
                        ext === 'gif' ? 'image/gif' : 'image/png';
        return `data:${mimeType};base64,${base64Image}`;
      }
      // Logo não encontrado - retornar logo original (pode ser URL ou já estar em base64)
    } catch (error) {
      logger.warn('Erro ao converter logo para base64', { logo, error });
    }
    
    return logo;
  }

  // Obter logo padrão do banco (retorna base64 data URI)
  private static getLogoBancoPadrao(tipoBanco: string): string {
    try {
      
      const logosPadrao: Record<string, string> = {
        'efi': 'efi.png',
        'asaas': 'asaas.png',
        'bancario': 'boletoproprio.png',
        'outros': 'boletoproprio.png'
      };
      
      const fileName = logosPadrao[tipoBanco] || logosPadrao['outros'];
      const imagesPath = path.join(__dirname, '../images/bancos');
      const imagePath = fs.existsSync(imagesPath) 
        ? path.join(imagesPath, fileName)
        : path.join(process.cwd(), 'images/bancos', fileName);
      
      // Ler arquivo e converter para base64
      if (fs.existsSync(imagePath)) {
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');
        const ext = fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();
        const mimeType = ext === 'png' ? 'image/png' : 
                        ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 
                        'image/png';
        return `data:${mimeType};base64,${base64Image}`;
      }
      
      // Se arquivo não existir, retornar string vazia (logo padrão não é obrigatório)
      return '';
    } catch (error) {
      logger.error('Erro ao carregar logo do banco', { error, tipoBanco });
      return '';
    }
  }

  // Processar instruções com substituição de variáveis
  private static processarInstrucao(instrucao: string, titulo: TituloComRelacoes): string {
    if (!instrucao) return '';
    
    return instrucao
      .replace(/%quantidade_usuarios%/g, String(titulo.plano?.quantidade_usuarios || '1'))
      .replace(/%tipo_servico%/g, titulo.plano?.tipo_servico || 'Internet')
      .replace(/%nome_plano%/g, titulo.plano?.nome_plano || 'Plano')
      .replace(/%valor_plano%/g, Number(titulo.plano?.valor_mensal || 0).toFixed(2).replace('.', ','))
      .replace(/%cliente_nome%/g, titulo.cliente?.razao_social || '')
      .replace(/%cliente_cnpj%/g, titulo.cliente?.cnpj || '')
      .replace(/%data_vencimento%/g, new Date(titulo.data_vencimento).toLocaleDateString('pt-BR'))
      .replace(/%valor_boleto%/g, Number(titulo.valor).toFixed(2).replace('.', ','));
  }

  // Listar títulos com filtros
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const { 
        page = 1, 
        limit = 10, 
        status, 
        cliente_id, 
        data_vencimento_inicio,
        data_vencimento_fim,
        search 
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);
      
      // Construir filtros
      const where: WhereOptions = {};
      
      if (status) {
        // Suportar exclusão de status com prefixo !
        if (typeof status === 'string' && status.startsWith('!')) {
          const excludedStatus = status.substring(1);
          // Usar Op.ne diretamente - mais simples e confiável
          where.status = { [Op.ne]: excludedStatus };
        } else {
          where.status = status;
        }
      }
      
      if (cliente_id) {
        where.cliente_id = cliente_id;
      }
      
      if (data_vencimento_inicio || data_vencimento_fim) {
        where.data_vencimento = {};
        
        if (data_vencimento_inicio) {
          // Criar data local sem timezone para evitar problemas de conversão
          // Formato esperado: YYYY-MM-DD
          const [year, month, day] = (data_vencimento_inicio as string).split('-').map(Number);
          const inicioDate = new Date(year, month - 1, day, 0, 0, 0, 0);
          where.data_vencimento[Op.gte] = inicioDate;
        }
        
        if (data_vencimento_fim) {
          // Criar data local sem timezone para evitar problemas de conversão
          // Formato esperado: YYYY-MM-DD
          const [year, month, day] = (data_vencimento_fim as string).split('-').map(Number);
          const fimDate = new Date(year, month - 1, day, 23, 59, 59, 999);
          where.data_vencimento[Op.lte] = fimDate;
        }
      }

      // Filtro de busca
      if (search) {
        (where as Record<symbol, unknown>)[Op.or] = [
          { numero_titulo: { [Op.like]: `%${search}%` } },
          { observacoes: { [Op.like]: `%${search}%` } }
        ];
      }

      // Contar total de registros ANTES de buscar os dados
      // Se houver filtro de exclusão de status (!cancelado), Op.ne pode ter problemas no count
      // Usar findAll para contar quando há exclusão de status
      let count: number;
      
      // Verificar se estamos usando exclusão de status (status começa com !)
      const isStatusExclusion = status && typeof status === 'string' && status.startsWith('!');
      
      if (isStatusExclusion) {
        // Op.ne pode ter problemas no count do Sequelize
        // Usar findAll sem raw para garantir que o where é aplicado corretamente
        // Mas sem includes para ser mais rápido
        const allMatching = await Titulo.findAll({
          where,
          attributes: ['id']
        });
        count = allMatching.length;
      } else {
        // Para outros casos, usar count normal
        count = await Titulo.count({
          where
        });
      }
      

      // Buscar dados com includes
      const rows = await Titulo.findAll({
        where,
        include: [
          {
            model: Cliente,
            as: 'cliente',
            attributes: ['id', 'razao_social', 'nome_fantasia', 'cnpj', 'email']
          },
          {
            model: Plano,
            as: 'plano',
            attributes: ['id', 'nome_plano', 'valor_mensal']
          },
          {
            model: Banco,
            as: 'banco',
            attributes: ['id', 'nome', 'tipo_banco']
          }
        ],
        order: [['id', 'DESC']], // Maior ID para o menor
        limit: Number(limit),
        offset
      });

      // Calcular valores de paginação
      const total = Number(count);
      const perPage = Number(limit);
      const currentPage = Number(page);
      const lastPage = total > 0 ? Math.ceil(total / perPage) : 1;
      const from = total > 0 ? offset + 1 : 0;
      const to = total > 0 ? Math.min(offset + perPage, total) : 0;

      res.json({
        success: true,
        data: rows,
        pagination: {
          current_page: currentPage,
          per_page: perPage,
          total: total,
          last_page: lastPage,
          from: from,
          to: to
        }
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao listar títulos', { error: errorMessage });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Buscar título por ID
  static async show(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const titulo = await Titulo.findByPk(id, {
        include: [
          {
            model: Cliente,
            as: 'cliente',
            attributes: ['id', 'razao_social', 'nome_fantasia', 'cnpj', 'email', 'telefone', 'whatsapp']
          },
          {
            model: Plano,
            as: 'plano',
            attributes: ['id', 'nome_plano', 'valor_mensal', 'descricao']
          },
          {
            model: Banco,
            as: 'banco',
            attributes: ['id', 'nome', 'tipo_banco', 'codigo']
          }
        ]
      });

      if (!titulo) {
        res.status(404).json({
          success: false,
          message: 'Título não encontrado'
        });
        return;
      }

      // Construir base URL para o link de pagamento
      let baseUrl = process.env.BASE_URL;
      if (!baseUrl) {
        const protocol = req.protocol || 'http';
        const host = req.get('host') || '';
        baseUrl = `${protocol}://${host}`;
      }

      // Gerar link de pagamento público
      const linkPagamento = this.gerarLinkPagamentoPublico(titulo.id, baseUrl);

      // Adicionar link de pagamento aos dados do título
      const tituloData = titulo.toJSON();
      const tituloComLink = {
        ...tituloData,
        link_pagamento_publico: linkPagamento
      };

      res.json({
        success: true,
        data: tituloComLink
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao buscar título', { error: errorMessage });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Criar novo título (suporta criação de múltiplos títulos em lote)
  static async create(req: Request, res: Response): Promise<void> {
    try {
      // Verificar se é criação em lote (array de títulos)
      if (Array.isArray(req.body.titulos) || req.body.titulos) {
        return await TituloController.createBulk(req, res);
      }

      // Validação usando validador centralizado
      const { error, value } = tituloCreateSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: error.details.map(detail => detail.message)
        });
        return;
      }

      const { 
        cliente_id, 
        plano_id, 
        contrato_id,
        data_vencimento, 
        observacoes,
        desconto_percentual: descontoPercentualRaw,
        desconto_valor: descontoValorRaw,
        acrescimo_percentual: acrescimoPercentualRaw,
        acrescimo_valor: acrescimoValorRaw,
        descricao,
        banco_id
      } = value;

      // Converter strings para números
      const desconto_percentual = descontoPercentualRaw ? parseFloat(descontoPercentualRaw.toString()) : null;
      const desconto_valor = descontoValorRaw ? parseFloat(descontoValorRaw.toString()) : null;
      const acrescimo_percentual = acrescimoPercentualRaw ? parseFloat(acrescimoPercentualRaw.toString()) : null;
      const acrescimo_valor = acrescimoValorRaw ? parseFloat(acrescimoValorRaw.toString()) : null;

      // Validar dados obrigatórios
      if (!cliente_id) {
        res.status(400).json({
          success: false,
          message: 'Cliente é obrigatório'
        });
        return;
      }

      // Buscar cliente
      const cliente = await Cliente.findByPk(cliente_id);

      if (!cliente) {
        res.status(404).json({
          success: false,
          message: 'Cliente não encontrado'
        });
        return;
      }

      // Verificar se o cliente está ativo
      if (!cliente.ativo) {
        res.status(400).json({
          success: false,
          message: 'Não é possível gerar título para cliente inativo'
        });
        return;
      }

      // Selecionar contrato para referência (se informado ou o mais recente ativo)
      let contratoReferencia: Contrato | null = null;
      if (contrato_id) {
        contratoReferencia = await Contrato.findOne({
          where: {
            id: contrato_id,
            cliente_id: cliente.id
          }
        });

        if (!contratoReferencia) {
          res.status(404).json({
            success: false,
            message: 'Contrato informado não encontrado para este cliente'
          });
          return;
        }
      } else {
        contratoReferencia = await Contrato.findOne({
          where: {
            cliente_id: cliente.id,
            status: 'ativo'
          },
          order: [['id', 'DESC']]
        });
      }

      // Buscar plano - se não foi informado, buscar o plano ativo do cliente
      let plano;
      if (plano_id) {
        plano = await Plano.findByPk(plano_id);
        if (!plano) {
          res.status(404).json({
            success: false,
            message: 'Plano não encontrado'
          });
          return;
        }
      } else if (contratoReferencia) {
        plano = await contratoReferencia.getPlano();
        if (!plano) {
          res.status(400).json({
            success: false,
            message: 'Contrato selecionado não possui plano associado'
          });
          return;
        }
      } else {
        res.status(400).json({
          success: false,
          message: 'Informe o plano ou associe o cliente a um contrato com plano ativo'
        });
        return;
      }

      // Calcular data de vencimento se não foi informada
      let dataVencimentoFinal = data_vencimento;
      if (dataVencimentoFinal) {
        // Se a data veio como string "YYYY-MM-DD", converter para Date local para evitar problemas de fuso horário
        if (typeof dataVencimentoFinal === 'string') {
          const [year, month, day] = dataVencimentoFinal.split('-').map(Number);
          dataVencimentoFinal = new Date(year, month - 1, day);
        }
      }
      
      // Removida geração automática de data de vencimento para evitar títulos sem contrato definido

      // Selecionar banco
      let banco;
      if (contratoReferencia?.conta_boleto) {
        banco = await Banco.findByPk(contratoReferencia.conta_boleto);
        if (!banco || !banco.ativo) {
          res.status(400).json({
            success: false,
            message: 'Banco configurado no contrato não está ativo'
          });
          return;
        }
      } else {
        // Usar banco padrão ativo
        banco = await Banco.findOne({ where: { ativo: true }, order: [['id', 'DESC']] });
        if (!banco) {
          res.status(400).json({
            success: false,
            message: 'Nenhum banco ativo encontrado'
          });
          return;
        }
      }

      // Gerar número único do título
      const gerarNumeroTitulo = () => {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        return `TIT-${timestamp}-${random}`;
      };

      // Calcular valor final com desconto/acréscimo
      let valorFinal = parseFloat(plano.valor_mensal.toString());
      
      // Sempre usar desconto em valor quando disponível (mais preciso)
      // Se não houver desconto em valor, calcular a partir do percentual
      if (desconto_valor && desconto_valor > 0) {
        valorFinal = valorFinal - parseFloat(desconto_valor.toString());
      } else if (desconto_percentual && desconto_percentual > 0) {
        // Calcular valor do desconto a partir do percentual
        const descontoValor = valorFinal * (parseFloat(desconto_percentual.toString()) / 100);
        valorFinal = valorFinal - descontoValor;
      }
      
      // Aplicar acréscimo percentual
      if (acrescimo_percentual && acrescimo_percentual > 0) {
        valorFinal = valorFinal * (1 + (acrescimo_percentual / 100));
      }
      
      // Aplicar acréscimo em valor
      if (acrescimo_valor && acrescimo_valor > 0) {
        valorFinal = valorFinal + parseFloat(acrescimo_valor.toString());
      }
      
      // Validar se o valor final é válido
      if (isNaN(valorFinal) || valorFinal < 0.01) {
        res.status(400).json({
          success: false,
          message: 'Os descontos configurados no contrato resultaram em valor inválido (R$ ' + valorFinal.toFixed(2) + '). O valor do título deve ser no mínimo R$ 0,01. Ajuste os descontos no contrato.'
        });
        return;
      }
      
      // Garantir que o valor final seja pelo menos R$ 0,01 (valor mínimo permitido)
      valorFinal = Math.max(0.01, valorFinal);

      // Criar título dentro de transação para garantir atomicidade
      const titulo = await withTransaction(async (transaction: Transaction) => {
        // Garantir que data_vencimento é um objeto Date para evitar problemas de fuso horário
        let dataVencimentoParaSalvar = dataVencimentoFinal instanceof Date 
          ? dataVencimentoFinal 
          : new Date(dataVencimentoFinal);
        
        // Ajustar data de vencimento baseado nos parâmetros (sábado/domingo)
        dataVencimentoParaSalvar = await ajustarDataVencimento(dataVencimentoParaSalvar);
        
        return await Titulo.create({
          cliente_id,
          plano_id: plano.id,
          banco_id: banco_id || banco.id,
          contrato_id: contratoReferencia?.id || contrato_id || null,
          numero_titulo: gerarNumeroTitulo(),
          valor: valorFinal, // Usar valorFinal (com descontos) ao invés do plano.valor_mensal
          valor_final: valorFinal,
          data_vencimento: dataVencimentoParaSalvar,
          observacoes: observacoes || '',
          desconto_percentual: desconto_percentual || null,
          desconto_valor: desconto_valor || null,
          acrescimo_percentual: acrescimo_percentual || null,
          acrescimo_valor: acrescimo_valor || null,
          descricao: descricao || null,
          status: 'pendente',
          pago: false
        }, { transaction });
      });

      res.status(201).json({
        success: true,
        message: 'Título criado com sucesso',
        data: titulo
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao criar título', { error: errorMessage });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Criar múltiplos títulos em lote dentro de uma transação
   * Garante que todos os títulos sejam criados ou nenhum
   */
  private static async createBulk(req: Request, res: Response): Promise<void> {
    try {
      // Validação usando validador centralizado
      const { error, value } = titulosBulkCreateSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: error.details.map(detail => detail.message)
        });
        return;
      }

      const { titulos } = value;

      // Criar todos os títulos dentro de uma transação
      const titulosCriados = await withTransaction(async (transaction: Transaction) => {
        const resultados: Titulo[] = [];

        for (const dadosTitulo of titulos) {
          // Validar e buscar entidades relacionadas
          const cliente = await Cliente.findByPk(dadosTitulo.cliente_id, { transaction });
          if (!cliente || !cliente.ativo) {
            throw new Error(`Cliente ${dadosTitulo.cliente_id} não encontrado ou inativo`);
          }

          const plano = await Plano.findByPk(dadosTitulo.plano_id, { transaction });
          if (!plano) {
            throw new Error(`Plano ${dadosTitulo.plano_id} não encontrado`);
          }

          const banco = await Banco.findByPk(dadosTitulo.banco_id, { transaction });
          if (!banco || !banco.ativo) {
            throw new Error(`Banco ${dadosTitulo.banco_id} não encontrado ou inativo`);
          }

          // Processar data de vencimento
          let dataVencimento: Date;
          if (typeof dadosTitulo.data_vencimento === 'string') {
            const [year, month, day] = dadosTitulo.data_vencimento.split('-').map(Number);
            dataVencimento = new Date(year, month - 1, day);
          } else {
            dataVencimento = dadosTitulo.data_vencimento;
          }

          // Ajustar data de vencimento baseado nos parâmetros
          dataVencimento = await ajustarDataVencimento(dataVencimento);

          // Calcular valor final
          let valorFinal = Number(dadosTitulo.valor);
          if (dadosTitulo.desconto_valor) {
            valorFinal -= Number(dadosTitulo.desconto_valor);
          } else if (dadosTitulo.desconto_percentual) {
            valorFinal -= valorFinal * (Number(dadosTitulo.desconto_percentual) / 100);
          }

          if (dadosTitulo.acrescimo_valor) {
            valorFinal += Number(dadosTitulo.acrescimo_valor);
          } else if (dadosTitulo.acrescimo_percentual) {
            valorFinal += valorFinal * (Number(dadosTitulo.acrescimo_percentual) / 100);
          }

          valorFinal = Math.max(0.01, valorFinal);

          // Gerar número único do título
          const timestamp = Date.now();
          const random = Math.floor(Math.random() * 1000);
          const numeroTitulo = dadosTitulo.numero_titulo || `TIT-${timestamp}-${random}`;

          // Criar título dentro da transação
          const titulo = await Titulo.create({
            cliente_id: dadosTitulo.cliente_id,
            plano_id: dadosTitulo.plano_id,
            banco_id: dadosTitulo.banco_id,
            contrato_id: dadosTitulo.contrato_id || null,
            numero_titulo: numeroTitulo,
            valor: valorFinal,
            valor_final: valorFinal,
            data_vencimento: dataVencimento,
            observacoes: dadosTitulo.observacoes || null,
            desconto_percentual: dadosTitulo.desconto_percentual || null,
            desconto_valor: dadosTitulo.desconto_valor || null,
            acrescimo_percentual: dadosTitulo.acrescimo_percentual || null,
            acrescimo_valor: dadosTitulo.acrescimo_valor || null,
            descricao: dadosTitulo.descricao || null,
            status: dadosTitulo.status || 'pendente',
            pago: dadosTitulo.pago || false
          }, { transaction });

          resultados.push(titulo);
        }

        return resultados;
      });

      // Incrementar métricas se habilitadas
      const { metrics, isMetricsEnabled } = await import('../utils/metrics');
      if (isMetricsEnabled() && metrics && titulosCriados.length > 0) {
        metrics.businessTitulosGerados.inc(titulosCriados.length);
      }

      res.status(201).json({
        success: true,
        message: `${titulosCriados.length} título(s) criado(s) com sucesso`,
        data: titulosCriados
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao criar títulos em lote', { 
        context: 'TituloController',
        action: 'createBulk',
        error: errorMessage 
      });
      res.status(500).json({
        success: false,
        message: errorMessage
      });
    }
  }

  // Atualizar título
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, data_vencimento, observacoes } = req.body;

      const titulo = await Titulo.findByPk(id, {
        include: [
          { model: Cliente, as: 'cliente' },
          { model: Banco, as: 'banco' }
        ]
      }) as TituloComRelacoes | null;

      if (!titulo) {
        res.status(404).json({
          success: false,
          message: 'Título não encontrado'
        });
        return;
      }

      // Validações de status
      if (status === 'cancelado' && titulo.status === 'pago') {
        res.status(400).json({
          success: false,
          message: 'Não é possível cancelar um título que já foi pago'
        });
        return;
      }

      if (status === 'cancelado' && titulo.status === 'cancelado') {
        res.status(400).json({
          success: false,
          message: 'Este título já está cancelado'
        });
        return;
      }

      if (status === 'pago' && titulo.status === 'cancelado') {
        res.status(400).json({
          success: false,
          message: 'Não é possível marcar como pago um título cancelado'
        });
        return;
      }

      // Verificar se está cancelando
      if (status === 'cancelado' && titulo.status !== 'cancelado') {
        // Cancelar na API do banco se tiver charge_id
        if (titulo.charge_id && titulo.banco && ['efi', 'asaas'].includes(titulo.banco?.tipo_banco ?? '')) {
          const resultadoCancelamento = await BancoApiService.cancelarTitulo(titulo as TituloComRelacoes);

          if (!resultadoCancelamento.success) {
            logger.warn('Falha ao cancelar título no gateway bancário', {
              titulo_id: titulo.id,
              charge_id: titulo.charge_id,
              message: resultadoCancelamento.message
            });

            res.status(400).json({
              success: false,
              message: resultadoCancelamento.message ?? 'Não foi possível cancelar o título no banco emissor'
            });
            return;
          }

          logger.info('Título cancelado no gateway bancário', { 
            titulo_id: titulo.id, 
            charge_id: titulo.charge_id 
          });
        }
      }

      // Verificar alteração de vencimento
      if (data_vencimento && new Date(data_vencimento).getTime() !== new Date(titulo.data_vencimento).getTime()) {
        // Não permitir alterar vencimento de títulos cancelados
        if (titulo.status === 'cancelado') {
          res.status(400).json({
            success: false,
            message: 'Não é possível alterar o vencimento de um título cancelado'
          });
          return;
        }

        logger.info('Verificando alteração de vencimento', {
          titulo_id: titulo.id,
          data_original: titulo.data_vencimento,
          data_nova: data_vencimento,
          mudou: true,
          banco: titulo.banco?.tipo_banco || ''
        });
      }

      // Atualizar título
      // Converter data_vencimento para Date local se vier como string
      let dataVencimentoAtualizada = data_vencimento;
      if (dataVencimentoAtualizada && typeof dataVencimentoAtualizada === 'string') {
        const [year, month, day] = dataVencimentoAtualizada.split('-').map(Number);
        dataVencimentoAtualizada = new Date(year, month - 1, day);
      }
      
      await titulo.update({
        status: status || titulo.status,
        data_vencimento: dataVencimentoAtualizada || titulo.data_vencimento,
        observacoes: observacoes !== undefined ? observacoes : titulo.observacoes
      });

      res.json({
        success: true,
        message: 'Título atualizado com sucesso',
        data: titulo
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao atualizar título', { error: errorMessage });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Deletar título
  static async destroy(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const titulo = await Titulo.findByPk(id, {
        include: [{ model: Banco, as: 'banco' }]
      }) as TituloComRelacoes | null;

      if (!titulo) {
        res.status(404).json({
          success: false,
          message: 'Título não encontrado'
        });
        return;
      }

      // Cancelar na API do banco se tiver charge_id
      if (titulo.charge_id && titulo.banco && ['efi', 'asaas'].includes(titulo.banco.tipo_banco ?? '')) {
        try {
          const resultado = await BancoApiService.cancelarTitulo(titulo as TituloComRelacoes);

          if (resultado.success) {
            logger.info('Título cancelado no gateway bancário antes da exclusão', { 
              titulo_id: titulo.id, 
              charge_id: titulo.charge_id 
            });
          } else {
            logger.warn('Falha ao cancelar título no gateway bancário antes da exclusão', {
              titulo_id: titulo.id,
              charge_id: titulo.charge_id,
              message: resultado.message
            });
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
          logger.warn('Erro ao cancelar título no gateway bancário', { 
            titulo_id: titulo.id, 
            error: errorMessage 
          });
        }
      }

      // Deletar título
      await titulo.destroy();

      res.json({
        success: true,
        message: 'Título deletado com sucesso'
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao deletar título', { error: errorMessage });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Imprimir boleto
  static async imprimirBoleto(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const titulo = await Titulo.findByPk(id, {
        include: [
          { model: Cliente, as: 'cliente' },
          { model: Plano, as: 'plano' },
          { 
            model: Banco, 
            as: 'banco', 
            attributes: [
              'id', 'nome', 'codigo', 'tipo_banco', 'client_id_producao', 'client_secret_producao', 'sandbox',
              'api_key',
              'url_retorno', 'percentual_multa', 'percentual_juros', 'instrucao_linha_1', 'instrucao_linha_2', 'instrucao_linha_3', 
              'instrucao_linha_4', 'instrucao_linha_5', 'logo'
            ] 
          }
        ]
      }) as TituloComRelacoes | null;

      if (!titulo) {
        res.status(404).json({
          success: false,
          message: 'Título não encontrado'
        });
        return;
      }

      logger.info('Verificando status do título para impressão', {
        titulo_id: titulo.id,
        tem_charge_id: !!titulo.charge_id,
        charge_id: titulo.charge_id,
        banco_id: titulo.banco_id,
        banco_tipo: titulo.banco?.tipo_banco,
        banco_nome: titulo.banco?.nome,
        tem_banco: !!titulo.banco,
        contrato_id: titulo.contrato_id
      });

      // Verificar se já está registrado no banco
      if (!titulo.charge_id) {
        logger.info('Título não registrado no banco, registrando agora antes de imprimir...', {
          titulo_id: titulo.id,
          banco_id: titulo.banco_id,
          cliente_id: titulo.cliente_id,
          banco_disponivel: !!titulo?.banco,
          banco_nome: titulo?.banco?.nome || '',
          banco_tipo: titulo.banco?.tipo_banco
        });

        try {
          // Registrar no banco e AGUARDAR resposta
          const resultado = await BancoApiService.gerarTitulo(titulo as TituloComRelacoes);
          
          logger.info('Resultado do envio ao banco:', {
            titulo_id: titulo.id,
            success: resultado.success,
            message: resultado.message,
            tem_data: !!resultado.data
          });
          
          if (!resultado.success || !resultado.data) {
            // Falha ao registrar - retornar erro
            logger.error('Falha ao registrar título no banco', {
              titulo_id: titulo.id,
              message: resultado.message,
              resultado_completo: JSON.stringify(resultado)
            });
            
            res.status(500).json({
              success: false,
              message: 'Não foi possível registrar o título no banco: ' + (resultado.message || 'Erro desconhecido'),
              error: 'ERRO_REGISTRO_BANCO'
            });
            return;
          }

          // Sucesso - atualizar título com dados do banco
          let codigoBarrasFinal = typeof resultado.data.codigo_barras === 'string' ? resultado.data.codigo_barras : null;
          if (codigoBarrasFinal && !BarcodeService.validarCodigoBarrasFebraban(codigoBarrasFinal)) {
            logger.warn('Código de barras da API inválido, usando mesmo assim', {
              titulo_id: titulo.id,
              codigo_original: codigoBarrasFinal
            });
          }

          // IMPORTANTE: Não usar valor anterior se codigoBarrasFinal for null
          // Isso evita que um código de barras seja copiado para outro título
          const codigoBarrasParaSalvar = codigoBarrasFinal !== null ? codigoBarrasFinal : null;

          // Atualizar título com dados do banco
          await titulo.update({
            charge_id: resultado.data.charge_id,
            url_boleto: resultado.data.url_boleto as string | null,
            qrcode: resultado.data.qrcode as string | null,
            qrcode_image: resultado.data.qrcode_image as string | null,
            codigo_barras: codigoBarrasParaSalvar,
            linha_digitavel: resultado.data.linha_digitavel as string | null,
            nosso_numero: resultado.data.nosso_numero as string | null
          });

          logger.info('Título registrado no banco com sucesso, prosseguindo com impressão', {
            titulo_id: titulo.id,
            charge_id: resultado.data.charge_id
          });
          
          // Recarregar título com dados atualizados
          await titulo.reload();
          
        } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
          logger.error('Erro ao registrar título no banco', { 
            titulo_id: titulo.id, 
            error: errorMessage,
            stack: errorStack
          });
          
          res.status(500).json({
            success: false,
            message: 'Erro ao registrar título no banco: ' + errorMessage,
            error: 'ERRO_REGISTRO_BANCO'
          });
          return;
        }
      }

      // Carregar dados da empresa
      const { DadosEmpresa } = await import('../models/DadosEmpresa');
      const dadosEmpresa = await DadosEmpresa.findOne();
      
      if (!dadosEmpresa) {
        res.status(500).json({
          success: false,
          message: 'Dados da empresa não configurados'
        });
        return;
      }

      // Preparar variáveis para o template
      const dataVencimento = new Date(titulo.data_vencimento).toLocaleDateString('pt-BR');
      const dataProcessamento = new Date().toLocaleDateString('pt-BR');
      const valorBoleto = Number(titulo.valor).toFixed(2).replace('.', ',');
      
      // Carregar templates
      const fs = await import('fs');
      const path = await import('path');
      
      const templatesPath = path.join(__dirname, '../templates');
      const topoTemplatePath = path.join(templatesPath, 'boleto-topo-inner.html');
      const corpoTemplatePath = path.join(templatesPath, 'boleto-corpo-inner.html');
      
      let topoTemplate = '';
      let corpoTemplate = '';
      
      try {
        topoTemplate = fs.readFileSync(topoTemplatePath, 'utf8');
        corpoTemplate = fs.readFileSync(corpoTemplatePath, 'utf8');
      } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        logger.error('Erro ao carregar templates do boleto', { error: errorMessage });
        res.status(500).json({
          success: false,
          message: 'Erro ao carregar template do boleto'
        });
        return;
      }

      // Variáveis para substituição no template - Padrão FEBRABAN
      const templateVars = {
        // Dados da empresa (Beneficiário)
        LOGOMARCA: dadosEmpresa.logo || '',
        CEDENTE: (dadosEmpresa.razao_social && dadosEmpresa.razao_social.trim()) || (dadosEmpresa.nome_fantasia && dadosEmpresa.nome_fantasia.trim()) || 'Empresa não configurada',
        EMPRESACPF: dadosEmpresa.cnpj || '',
        EMPRESAENDERECO: `${dadosEmpresa.endereco || ''} ${dadosEmpresa.numero || ''}`.trim(),
        EMPRESABAIRRO: dadosEmpresa.bairro || '',
        EMPRESACEP: dadosEmpresa.cep || '',
        EMPRESACIDADE: dadosEmpresa.cidade || '',
        EMPRESAESTADO: dadosEmpresa.estado || '',
        
        // Dados do banco - FEBRABAN
        LOGOBANCO: titulo.banco?.logo || TituloController.getLogoBancoPadrao(titulo.banco?.tipo_banco || '') || dadosEmpresa.logo || '',
        CODIGO_BANCO_COM_DV: titulo.banco?.codigo ? `${titulo.banco?.codigo}-${BarcodeService.calcularDVCodigoBanco(titulo.banco.codigo)}` : '364-9',
        LINHA_DIGITAVEL: titulo.linha_digitavel || titulo.codigo_barras || '',
        AGENCIA_CODIGO: titulo.banco?.codigo || 'Não configurado',
        NOSSO_NUMERO: titulo.nosso_numero || titulo.charge_id || '',
        
        // Dados do boleto - FEBRABAN
        LOCAL_PAGAMENTO: 'Pagável em qualquer banco até o vencimento',
        DATA_VENC: dataVencimento,
        DATA_DOCUMENTO: dataProcessamento,
      NUMERO_DOCUMENTO: titulo.nosso_numero || titulo.numero_titulo || titulo.id?.toString() || '',
        ESPECIE_DOC: 'DM', // Duplicata de Venda Mercantil
        DATA_PROC: dataProcessamento,
        CARTEIRA: 'SR', // Sem Registro
        VAR_CARTEIRA: '',
        ESPECIE: 'R$',
        VALOR_BOLETO: valorBoleto,
        
        // Dados do cliente (Pagador) - FEBRABAN
        SACADO_NOME: titulo.cliente?.razao_social || titulo.cliente?.nome || '',
        TIPO_PSACADO: titulo.cliente?.cnpj ? 'CNPJ' : 'CPF',
        SACADO_CPF: titulo.cliente?.cnpj || titulo.cliente?.cpf || '',
        SACADO_ENDERECO: `${titulo.cliente?.endereco || ''} ${titulo.cliente?.numero || ''}`.trim(),
        SACADO_BAIRRO: titulo.cliente?.bairro || '',
        SACADO_COMPLEMENTO: titulo.cliente?.complemento || '',
        SACADO_CIDADE: titulo.cliente?.cidade || '',
        SACADO_ESTADO: titulo.cliente?.estado || '',
        SACADO_CEP: titulo.cliente?.cep || '',
        SACADO_IDNOME: titulo.cliente?.razao_social || titulo.cliente?.nome || '',
        
        // Dados do plano
        NOME_PLANO: titulo.plano?.nome_plano || '',
        DESCRICAO_PLANO: titulo.plano?.descricao || '',
        TIPO_SERVICO: titulo.plano?.tipo_servico || 'Internet',
        QUANTIDADE_USUARIOS: titulo.plano?.quantidade_usuarios || '1',
        VALOR_PLANO: valorBoleto,
        PERIODICIDADE: 'Mensal',
        
        // Instruções do banco - Padrão FEBRABAN
        TEXTO_MULTAMORA: `Após o vencimento, cobrar multa de ${titulo.banco?.percentual_multa || 2}% e juros de ${titulo.banco?.percentual_juros || 1}% ao mês.`,
        INSTRUCOES1: TituloController.processarInstrucao(titulo.banco?.instrucao_linha_1 || 'Não receber após o vencimento.', titulo),
        INSTRUCOES2: TituloController.processarInstrucao(titulo.banco?.instrucao_linha_2 || 'Em caso de dúvidas, entre em contato conosco.', titulo),
        INSTRUCOES3: TituloController.processarInstrucao(titulo.banco?.instrucao_linha_3 || 'Pagável em qualquer banco até o vencimento.', titulo),
        INSTRUCOES4: TituloController.processarInstrucao(titulo.banco?.instrucao_linha_4 || 'Ficha de Compensação do Boleto Bancário.', titulo),
        INSTRUCOES5: TituloController.processarInstrucao(titulo.banco?.instrucao_linha_5 || '', titulo),
        
        // QR Code e código de barras - FEBRABAN
        QRCODE: titulo.qrcode_image || '',
        QRCODE_HTML: titulo.qrcode_image 
          ? `<img src="${titulo.qrcode_image}" style="width: 100px; height: 100px; max-width: 100px; max-height: 100px;" /><br><span style="font-size: 8px; font-weight: bold;">PIX - Pagamento Instantâneo</span>`
          : '<div style="color: #666; font-size: 8px;">QR Code PIX<br>Não disponível</div>',
        BOLETO_BARCODE2: titulo.codigo_barras ? BarcodeService.generateFebrabanBarcodeSvg(titulo.codigo_barras) : ''
      };

      // Processar templates
      let topoProcessado = topoTemplate;
      let corpoProcessado = corpoTemplate;
      
      Object.entries(templateVars).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        topoProcessado = topoProcessado.replace(regex, String(value));
        corpoProcessado = corpoProcessado.replace(regex, String(value));
      });

      // Template final
      const template = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Boleto - ${titulo.numero_titulo}</title>
        </head>
        <body>
          ${topoProcessado}
          ${corpoProcessado}
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      // Não definir X-Frame-Options para permitir iframe em desenvolvimento
      res.send(template);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao imprimir boleto', { error: errorMessage });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Imprimir múltiplos boletos
  static async imprimirBoletosMultiplos(req: Request, res: Response): Promise<void> {
    try {
      // Aceitar ids de POST (body) ou GET (query)
      let ids = req.body.ids || req.query.ids;
      
      // Se vier como string (form data ou query string), fazer parse
      if (typeof ids === 'string') {
        try {
          ids = JSON.parse(ids);
        } catch {
          // Se não for JSON válido, tentar split por vírgula
          ids = ids.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id));
        }
      }

      // Se for número único, transformar em array
      if (typeof ids === 'number') {
        ids = [ids];
      }

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({
          success: false,
          message: 'IDs dos títulos não fornecidos'
        });
        return;
      }

      const titulos = await Titulo.findAll({
        where: { id: ids },
        include: [
          { model: Cliente, as: 'cliente' },
          { model: Plano, as: 'plano' },
          { model: Banco, as: 'banco' }
        ]
      });

      if (titulos.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Nenhum título encontrado'
        });
        return;
      }

      // Gerar HTML para cada boleto usando função auxiliar
      const boletosHtml: string[] = [];

      // Registrar títulos que ainda não foram registrados no banco
      for (const titulo of titulos) {
        if (!titulo.charge_id) {
          logger.info('Registrando título no banco antes de imprimir', {
            titulo_id: titulo.id
          });

          try {
            const resultado = await BancoApiService.gerarTitulo(titulo as TituloComRelacoes);
            
            if (resultado.success && resultado.data) {
              let codigoBarrasFinal = typeof resultado.data.codigo_barras === 'string' ? resultado.data.codigo_barras : null;
              if (codigoBarrasFinal && !BarcodeService.validarCodigoBarrasFebraban(codigoBarrasFinal)) {
                logger.warn('Código de barras da API fora do padrão FEBRABAN', {
                  titulo_id: titulo.id,
                  codigo_original: codigoBarrasFinal
                });
              }

              // IMPORTANTE: Não usar valor anterior se codigoBarrasFinal for null
              // Isso evita que um código de barras seja copiado para outro título
              const codigoBarrasParaSalvar = codigoBarrasFinal !== null ? codigoBarrasFinal : null;

              await titulo.update({
                charge_id: resultado.data.charge_id,
                url_boleto: resultado.data.url_boleto as string | null,
                qrcode: resultado.data.qrcode as string | null,
                qrcode_image: resultado.data.qrcode_image as string | null,
                codigo_barras: codigoBarrasParaSalvar,
                linha_digitavel: resultado.data.linha_digitavel as string | null,
                nosso_numero: resultado.data.nosso_numero as string | null
              });

              logger.info('Título registrado com sucesso', {
                titulo_id: titulo.id,
                charge_id: resultado.data.charge_id
              });

              // Recarregar título com dados atualizados
              await titulo.reload();
            } else {
              logger.error('Falha ao registrar título', {
                titulo_id: titulo.id,
                message: resultado.message
              });
              // Continua processando os outros mesmo se um falhar
            }
          } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            logger.error('Erro ao registrar título', { 
              error: errorMessage, 
              titulo_id: titulo.id 
            });
            // Continua processando os outros mesmo se um falhar
          }
        }

        // Processar HTML do boleto usando função auxiliar
        const boletoHtml = await TituloController.processarBoletoHtml(titulo);
        
        // Adicionar quebra de página
        boletosHtml.push(`
          <div style="page-break-after: always;">
            ${boletoHtml}
          </div>
        `);
      }

      // Verificar se deve auto-imprimir
      const autoPrint = req.query.print === 'true';
      
      // Template final com todos os boletos
      const template = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Boletos - ${titulos.length} título(s)</title>
          <style>
            @media print {
              .page-break { page-break-after: always; }
            }
          </style>
          ${autoPrint ? '<script>window.onload = function() { setTimeout(function() { window.print(); }, 500); };</script>' : ''}
        </head>
        <body>
          ${boletosHtml.join('\n')}
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      // Não definir X-Frame-Options para permitir iframe em desenvolvimento
      res.send(template);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao imprimir boletos múltiplos', { error: errorMessage });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Gerar PDF de múltiplos boletos
  static async gerarPdfBoletosMultiplos(req: Request, res: Response): Promise<void> {
    try {
      // Aceitar ids de query
      let ids: number[] = [];
      const idsParam = req.query.ids as string;
      
      if (idsParam) {
        try {
          // Tentar parse como JSON primeiro
          const parsed = JSON.parse(idsParam);
          // Garantir que seja sempre um array
          ids = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          // Se não for JSON válido, tentar split por vírgula
          ids = idsParam.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id));
        }
      }

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({
          success: false,
          message: 'IDs dos títulos não fornecidos'
        });
        return;
      }

      const titulos = await Titulo.findAll({
        where: { id: { [Op.in]: ids } },
        include: [
          { model: Cliente, as: 'cliente' },
          { model: Plano, as: 'plano' },
          { 
            model: Banco, 
            as: 'banco', 
            attributes: [
              'id', 'nome', 'codigo', 'tipo_banco', 'client_id_producao', 'client_secret_producao', 'sandbox',
              'url_retorno', 'percentual_multa', 'percentual_juros', 'instrucao_linha_1', 'instrucao_linha_2', 'instrucao_linha_3', 
              'instrucao_linha_4', 'instrucao_linha_5', 'logo'
            ] 
          }
        ]
      });

      if (titulos.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Nenhum título encontrado'
        });
        return;
      }

      // Gerar HTML para cada boleto usando função auxiliar
      const boletosHtml: string[] = [];

      // Registrar títulos que ainda não foram registrados no banco
      for (const titulo of titulos) {
        if (!titulo.charge_id) {
          try {
            logger.info('Registrando título no banco antes de gerar PDF', {
              titulo_id: titulo.id,
              banco_id: (titulo as TituloComRelacoes).banco_id,
              banco_disponivel: !!(titulo as TituloComRelacoes).banco
            });

            const resultado = await BancoApiService.gerarTitulo(titulo as TituloComRelacoes);
            
            if (resultado.success && resultado.data) {
          let codigoBarrasFinal = typeof resultado.data.codigo_barras === 'string' ? resultado.data.codigo_barras : null;
          if (codigoBarrasFinal && !BarcodeService.validarCodigoBarrasFebraban(codigoBarrasFinal)) {
            logger.warn('Código de barras da API fora do padrão FEBRABAN (mantendo valor retornado)', {
              titulo_id: titulo.id,
              codigo_original: codigoBarrasFinal
            });
          }

          // IMPORTANTE: Não usar valor anterior se codigoBarrasFinal for null
          // Isso evita que um código de barras seja copiado para outro título
          const codigoBarrasParaSalvar = codigoBarrasFinal !== null ? codigoBarrasFinal : null;

          await titulo.update({
            charge_id: resultado.data.charge_id,
            url_boleto: resultado.data.url_boleto as string | null,
            qrcode: resultado.data.qrcode as string | null,
            qrcode_image: resultado.data.qrcode_image as string | null,
            codigo_barras: codigoBarrasParaSalvar,
            linha_digitavel: resultado.data.linha_digitavel as string | null,
            nosso_numero: resultado.data.nosso_numero as string | null
          });

              logger.info('Título registrado com sucesso no banco', {
                titulo_id: titulo.id,
                charge_id: resultado.data.charge_id
              });

              await titulo.reload();
            } else {
              logger.error('Falha ao registrar título no banco', {
                titulo_id: titulo.id,
                message: resultado.message
              });
            }
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            logger.error('Erro ao registrar título no banco', { 
              titulo_id: titulo.id,
              error: errorMessage 
            });
            // Continua processando os outros mesmo se um falhar
          }
        }

        // Processar HTML do boleto usando função auxiliar
        const boletoHtml = await TituloController.processarBoletoHtml(titulo);
        
        // Adicionar quebra de página
        boletosHtml.push(`
          <div style="page-break-after: always;">
            ${boletoHtml}
          </div>
        `);
      }

      // Template final com todos os boletos
      const template = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Boletos - ${titulos.length} título(s)</title>
          <style>
            @media print {
              .page-break { page-break-after: always; }
            }
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
            .boleto { margin-bottom: 0; }
          </style>
        </head>
        <body>
          ${boletosHtml.join('')}
        </body>
        </html>
      `;

      // Limpar variáveis não processadas para evitar erro do html-pdf-node
      const templateLimpo = template
        .replace(/\{\{QUANTIDADE\}\}/g, '1')
        .replace(/\{\{VALOR_UNITARIO\}\}/g, '1')
        .replace(/\{\{[^}]+\}\}/g, ''); // Remove qualquer variável {{}} restante

      // Converter HTML para PDF usando html-pdf-node
      const htmlPdfModule = await import('html-pdf-node') as typeof htmlPdf;
      const file = { content: templateLimpo };
      const options: PdfOptions = {
        format: 'A4',
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm'
        },
        printBackground: true,
        displayHeaderFooter: false
      };
      
      const pdfBuffer = await htmlPdfModule.generatePdf(file, options);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="boletos-${titulos.length}-titulos.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao gerar PDF de múltiplos boletos', { error: errorMessage });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Marcar como pago
  static async marcarComoPago(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { valor_pago, data_pagamento } = req.body;

      const titulo = await Titulo.findByPk(id);
      if (!titulo) {
        res.status(404).json({
          success: false,
          message: 'Título não encontrado'
        });
        return;
      }

      // Validação: não pode marcar como pago se já estiver cancelado
      if (titulo.status === 'cancelado') {
        res.status(400).json({
          success: false,
          message: 'Não é possível marcar como pago um título cancelado'
        });
        return;
      }

      // Validação: não pode marcar como pago se já estiver pago
      if (titulo.status === 'pago') {
        res.status(400).json({
          success: false,
          message: 'Este título já foi marcado como pago'
        });
        return;
      }

      // Normalizar data de pagamento (o método marcarComoPago já faz toda a lógica)
      const dataPagamentoNormalizada = data_pagamento 
        ? (typeof data_pagamento === 'string' ? new Date(data_pagamento) : data_pagamento)
        : undefined;
      
      await titulo.marcarComoPago(valor_pago, dataPagamentoNormalizada);

      res.json({
        success: true,
        message: 'Título marcado como pago',
        data: titulo
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao marcar título como pago', { error: errorMessage });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Desmarcar como pago
  static async desmarcarPago(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const titulo = await Titulo.findByPk(id);
      if (!titulo) {
        res.status(404).json({
          success: false,
          message: 'Título não encontrado'
        });
        return;
      }

      await titulo.desmarcarPago();

      res.json({
        success: true,
        message: 'Título desmarcado como pago',
        data: titulo
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao desmarcar título como pago', { error: errorMessage });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Estornar título (volta para pendente)
  // Consultar recebimento na API do banco
  static async consultarRecebimento(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const titulo = await Titulo.findByPk(id, {
        include: [
          { model: Cliente, as: 'cliente' },
          { model: Plano, as: 'plano' },
          { model: Banco, as: 'banco' }
        ]
      });

      if (!titulo) {
        res.status(404).json({
          success: false,
          message: 'Título não encontrado'
        });
        return;
      }

      if (!titulo.charge_id) {
        res.status(400).json({
          success: false,
          message: 'Título não possui charge_id (não foi registrado no banco)'
        });
        return;
      }

      // Consultar status na API do banco
      const resultado = await BancoApiService.consultarStatus(titulo);

      if (resultado.success && resultado.data) {
        // Verificar se foi pago
        const statusPago = resultado.data.status === 'paid' || resultado.data.status === 'settled';
        
        if (statusPago) {
          const valorPago = resultado.data.valor_pago || titulo.valor;
          const dataPagamento = resultado.data.data_pagamento 
            ? new Date(resultado.data.data_pagamento as string | number) 
            : new Date();

          // Marcar como pago (lógica automática de parcial/atraso)
          await titulo.marcarComoPago(Number(valorPago), dataPagamento);

          res.json({
            success: true,
            message: 'Título atualizado com sucesso',
            data: {
              titulo_id: titulo.id,
              status_anterior: titulo.status,
              status_novo: titulo.status,
              valor_pago: valorPago,
              data_pagamento: dataPagamento
            }
          });
        } else {
          res.json({
            success: true,
            message: 'Título consultado - sem alterações (ainda não foi pago)',
            data: {
              titulo_id: titulo.id,
              status: titulo.status,
              status_banco: resultado.data.status
            }
          });
        }
      } else {
        res.status(400).json({
          success: false,
          message: resultado.message || 'Erro ao consultar status no banco'
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao consultar recebimento', { error: errorMessage });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  static async estornar(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const titulo = await Titulo.findByPk(id);
      if (!titulo) {
        res.status(404).json({
          success: false,
          message: 'Título não encontrado'
        });
        return;
      }

      // Validação: só pode estornar se estiver pago
      if (titulo.status !== 'pago') {
        res.status(400).json({
          success: false,
          message: 'Só é possível estornar títulos que estão pagos'
        });
        return;
      }

      // Estornar = desmarcar como pago (volta para pendente)
      await titulo.desmarcarPago();

      res.json({
        success: true,
        message: 'Título estornado com sucesso',
        data: titulo
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao estornar título', { error: errorMessage });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }


  // Buscar títulos por contrato
  static async getByContrato(req: Request, res: Response): Promise<void> {
    try {
      const { contratoId } = req.params;

      // Validar se o contrato existe
      const contrato = await Contrato.findByPk(contratoId);
      if (!contrato) {
        res.status(404).json({
          success: false,
          message: 'Contrato não encontrado'
        });
        return;
      }

      // Buscar títulos do contrato
      const titulos = await Titulo.findAll({
        where: {
          contrato_id: contratoId
        },
        include: [
          {
            model: Cliente,
            as: 'cliente',
            where: { id: contrato.cliente_id },
            attributes: ['id', 'razao_social', 'nome_fantasia', 'cnpj']
          },
          {
            model: Plano,
            as: 'plano',
            attributes: ['id', 'nome_plano', 'valor_mensal']
          },
          {
            model: Banco,
            as: 'banco',
            attributes: ['id', 'nome', 'tipo_banco']
          }
        ],
        order: [['data_vencimento', 'DESC']]
      });

      res.json({
        success: true,
        data: titulos
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao buscar títulos por contrato', { error: errorMessage });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Estatísticas dos títulos
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const { cliente_id } = req.query;

      const where: WhereOptions = {};
      if (cliente_id) {
        where.cliente_id = cliente_id;
      }

      const [
        totalTitulos,
        titulosPendentes,
        titulosPagos,
        titulosVencidos,
        titulosCancelados
      ] = await Promise.all([
        Titulo.count({ where }),
        Titulo.count({ where: { ...where, status: 'pendente' } }),
        Titulo.count({ where: { ...where, status: 'pago' } }),
        Titulo.count({ where: { ...where, status: 'vencido' } }),
        Titulo.count({ where: { ...where, status: 'cancelado' } })
      ]);

      // Calcular valores
      const [
        valorTotal,
        valorPendente,
        valorPago,
        valorVencido,
        valorCancelado
      ] = await Promise.all([
        Titulo.sum('valor', { where }),
        Titulo.sum('valor', { where: { ...where, status: 'pendente' } }),
        Titulo.sum('valor', { where: { ...where, status: 'pago' } }),
        Titulo.sum('valor', { where: { ...where, status: 'vencido' } }),
        Titulo.sum('valor', { where: { ...where, status: 'cancelado' } })
      ]);

      res.json({
        success: true,
        data: {
          quantidade: {
            total: totalTitulos,
            pendentes: titulosPendentes,
            pagos: titulosPagos,
            vencidos: titulosVencidos,
            cancelados: titulosCancelados
          },
          valores: {
            total: valorTotal || 0,
            pendente: valorPendente || 0,
            pago: valorPago || 0,
            vencido: valorVencido || 0,
            cancelado: valorCancelado || 0
          }
        }
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao buscar estatísticas dos títulos', { error: errorMessage });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Gerar link público de pagamento para um título
   */
  static gerarLinkPagamentoPublico(tituloId: number, baseUrl?: string): string {
    const secret = process.env.JWT_SECRET || 'default-secret';
    const token = crypto.createHmac('sha256', secret).update(String(tituloId)).digest('hex').substring(0, 16);
    
    // URL do frontend (não da API)
    const frontendUrl = process.env.FRONTEND_URL || process.env.REACT_APP_URL || 'http://localhost:3000';
    return `${frontendUrl}/pagamento/${tituloId}/${token}`;
  }

  /**
   * Endpoint para gerar link público de pagamento
   */
  static async gerarLinkPagamento(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tituloId = parseInt(id, 10);

      if (isNaN(tituloId)) {
        res.status(400).json({
          success: false,
          message: 'ID do título inválido'
        });
        return;
      }

      // Verificar se o título existe
      const titulo = await Titulo.findByPk(tituloId);
      if (!titulo) {
        res.status(404).json({
          success: false,
          message: 'Título não encontrado'
        });
        return;
      }

      // Construir base URL
      let baseUrl = process.env.BASE_URL;
      if (!baseUrl) {
        const protocol = req.protocol || 'http';
        const host = req.get('host') || '';
        baseUrl = `${protocol}://${host}`;
      }

      // Gerar link
      const link = this.gerarLinkPagamentoPublico(tituloId, baseUrl);

      res.json({
        success: true,
        data: {
          titulo_id: tituloId,
          link: link,
          numero_titulo: titulo.numero_titulo
        },
        message: 'Link de pagamento gerado com sucesso'
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao gerar link de pagamento:', { error: errorMessage });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Enviar título manualmente via WhatsApp
   */
  static async enviarWhatsApp(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tituloId = parseInt(id, 10);

      if (isNaN(tituloId)) {
        res.status(400).json({
          success: false,
          message: 'ID do título inválido'
        });
        return;
      }

      const { WhatsAppService } = await import('../services/WhatsAppService');
      const resultado = await WhatsAppService.enviarTituloManual(tituloId);

      if (resultado.sucesso) {
        res.json({
          success: true,
          message: resultado.mensagem || 'Mensagem enviada com sucesso'
        });
      } else {
        res.status(400).json({
          success: false,
          message: resultado.mensagem || 'Erro ao enviar mensagem'
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao enviar título via WhatsApp:', { error: errorMessage });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Enviar título manualmente via Email
   */
  static async enviarEmail(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tituloId = parseInt(id, 10);

      if (isNaN(tituloId)) {
        res.status(400).json({
          success: false,
          message: 'ID do título inválido'
        });
        return;
      }

      const { EmailService } = await import('../services/EmailService');
      const resultado = await EmailService.enviarTituloManual(tituloId);

      if (resultado.sucesso) {
        res.json({
          success: true,
          message: resultado.mensagem || 'Email enviado com sucesso'
        });
      } else {
        res.status(400).json({
          success: false,
          message: resultado.mensagem || 'Erro ao enviar email'
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao enviar título via Email:', { error: errorMessage });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}
