import { Request, Response } from 'express';
import { Titulo } from '../models/Titulo';
import { Cliente } from '../models/Cliente';
import { Contrato } from '../models/Contrato';
import { Plano } from '../models/Plano';
import { Banco } from '../models/Banco';
import { BancoApiService } from '../services/BancoApiService';
import { BarcodeService } from '../services/BarcodeService';
import { ajustarDataVencimento, parseDateFromDb } from '../utils/dateUtils';
import { logger } from '../utils/logger';
import puppeteer from 'puppeteer';
import { Op, WhereOptions, QueryTypes, Transaction, Sequelize } from 'sequelize';
import { withTransaction } from '../utils/transaction';
import { tituloCreateSchema, titulosBulkCreateSchema } from '../validators/titulo.validator';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type htmlPdf from 'html-pdf-node';
import type { PdfOptions } from 'html-pdf-node';
import { DadosEmpresa } from '../models/DadosEmpresa'; // Importa direto

// Interface para Titulo com relações carregadas
interface TituloComRelacoes extends Titulo {
  cliente?: Cliente & { nome?: string; cpf?: string; cnpj?: string };
  banco?: Banco;
  contrato?: Contrato;
  plano?: Plano;
}

export class TituloController {
  
  // --- Funções Auxiliares (Simplificadas e com Fuso Horário Corrigido) ---

  public static async gerarPdfBase64(titulo: TituloComRelacoes): Promise<string | null> {
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
        margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' }
      });

      await browser.close();
      
      // Converter Buffer para base64
      if (Buffer.isBuffer(pdfBuffer)) {
        return pdfBuffer.toString('base64');
      }
      // Se for Uint8Array, converter para Buffer primeiro
      return Buffer.from(pdfBuffer).toString('base64');
      
    } catch (error: unknown) {
      const errorMessage = (error as any)?.response?.data?.message || (error instanceof Error ? error.message : 'Erro desconhecido');
      logger.error('Erro ao gerar PDF do boleto:', errorMessage);
      return null;
    }
  }

  private static async processarBoletoHtml(titulo: TituloComRelacoes): Promise<string> {
    // Carregar dados da empresa
    const dadosEmpresa = await DadosEmpresa.findOne();
    if (!dadosEmpresa) {
      throw new Error('Dados da empresa não configurados');
    }

    // Preparar variáveis para o template
    // Usa toLocaleDateString para exibição, o que está correto (deve ser local)
    const dataVencimento = parseDateFromDb(titulo.data_vencimento)?.toLocaleDateString('pt-BR') || '';
    const dataProcessamento = new Date().toLocaleDateString('pt-BR');
    const valorBoleto = Number(titulo.valor).toFixed(2).replace('.', ',');
    
    // Carregar templates
    const templatesPath = path.join(__dirname, '../templates');
    const topoTemplatePath = path.join(templatesPath, 'boleto-topo-inner.html');
    const corpoTemplatePath = path.join(templatesPath, 'boleto-corpo-inner.html');
    
    const topoTemplate = fs.readFileSync(topoTemplatePath, 'utf8');
    const corpoTemplate = fs.readFileSync(corpoTemplatePath, 'utf8');

    // Lógica simplificada de logo (mantida a original para não quebrar referências)
    let logoBanco = titulo.banco?.logo || TituloController.getLogoBancoPadrao(titulo.banco?.tipo_banco || '') || dadosEmpresa.logo || '';
    logoBanco = TituloController.converterLogoParaBase64(logoBanco);
    const logoEmpresa = TituloController.converterLogoParaBase64(dadosEmpresa.logo || '');

    // Variáveis para substituição no template
    const templateVars = {
      // Dados da empresa (Beneficiário)
      LOGOMARCA: logoEmpresa,
      CEDENTE: dadosEmpresa.razao_social || dadosEmpresa.nome_fantasia || 'Empresa não configurada',
      EMPRESACPF: dadosEmpresa.cnpj || '',
      EMPRESAENDERECO: `${dadosEmpresa.endereco || ''} ${dadosEmpresa.numero || ''}`.trim(),
      EMPRESABAIRRO: dadosEmpresa.bairro || '',
      EMPRESACEP: dadosEmpresa.cep || '',
      EMPRESACIDADE: dadosEmpresa.cidade || '',
      EMPRESAESTADO: dadosEmpresa.estado || '',
      
      // Dados do banco
      LOGOBANCO: logoBanco,
      CODIGO_BANCO_COM_DV: titulo.banco?.codigo ? `${titulo.banco.codigo}-${BarcodeService.calcularDVCodigoBanco(titulo.banco.codigo)}` : '364-9',
      LINHA_DIGITAVEL: titulo.linha_digitavel || titulo.codigo_barras || '',
      AGENCIA_CODIGO: titulo.banco?.codigo || 'Não configurado',
      
      // Dados do boleto
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
      
      // Dados do cliente (Pagador)
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

  private static converterLogoParaBase64(logo: string): string {
    if (!logo || logo.startsWith('data:image/')) {
      return logo || '';
    }
    
    try {
      // Lógica de conversão para base64 (mantida a original)
      let cleanPath = logo.startsWith('http') ? new URL(logo).pathname : logo;
      const fileName = cleanPath.split('/').pop() || '';
      
      if (fileName.includes('efi.png')) return this.getLogoBancoPadrao('efi');
      if (fileName.includes('asaas.png')) return this.getLogoBancoPadrao('asaas');
      if (fileName.includes('boletoproprio.png')) return this.getLogoBancoPadrao('bancario');
      
      if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);
      
      const imagePath = path.join(process.cwd(), cleanPath);
      
      if (fs.existsSync(imagePath)) {
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');
        const ext = fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();
        const mimeType = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'gif' ? 'image/gif' : 'image/png';
        return `data:${mimeType};base64,${base64Image}`;
      }
    } catch (error) {
      logger.warn('Erro ao converter logo para base64', { logo, error });
    }
    
    return logo;
  }

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
      const imagePath = fs.existsSync(imagesPath) ? path.join(imagesPath, fileName) : path.join(process.cwd(), 'images/bancos', fileName);
      
      if (fs.existsSync(imagePath)) {
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');
        const ext = fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();
        const mimeType = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
        return `data:${mimeType};base64,${base64Image}`;
      }
      return '';
    } catch (error) {
      logger.error('Erro ao carregar logo do banco', { error, tipoBanco });
      return '';
    }
  }

  private static processarInstrucao(instrucao: string, titulo: TituloComRelacoes): string {
    if (!instrucao) return '';
    
    return instrucao
      .replace(/%quantidade_usuarios%/g, String(titulo.plano?.quantidade_usuarios || '1'))
      .replace(/%tipo_servico%/g, titulo.plano?.tipo_servico || 'Internet')
      .replace(/%nome_plano%/g, titulo.plano?.nome_plano || 'Plano')
      .replace(/%valor_plano%/g, Number(titulo.plano?.valor_mensal || 0).toFixed(2).replace('.', ','))
      .replace(/%cliente_nome%/g, titulo.cliente?.razao_social || '')
      .replace(/%cliente_cnpj%/g, titulo.cliente?.cnpj || '')
      .replace(/%data_vencimento%/g, parseDateFromDb(titulo.data_vencimento)?.toLocaleDateString('pt-BR') || '')
      .replace(/%valor_boleto%/g, Number(titulo.valor).toFixed(2).replace('.', ','));
  }

  // --- Endpoints CRUD ---

  public static async list(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10, status, cliente_id, data_vencimento_inicio, data_vencimento_fim, search } = req.query;

      const offset = (Number(page) - 1) * Number(limit);
      
      const where: WhereOptions = {};
      
      if (status) {
        where.status = typeof status === 'string' && status.startsWith('!')
          ? { [Op.ne]: status.substring(1) }
          : status;
      }
      
      if (cliente_id) {
        where.cliente_id = cliente_id;
      }
      
      if (data_vencimento_inicio || data_vencimento_fim) {
        where.data_vencimento = {};
        
        // CORREÇÃO: Cria datas no local 00:00 e 23:59 para evitar problemas com fuso horário na query
        if (data_vencimento_inicio) {
          const [year, month, day] = (data_vencimento_inicio as string).split('-').map(Number);
          where.data_vencimento[Op.gte] = new Date(year, month - 1, day, 0, 0, 0, 0); // Local 00:00:00
        }
        
        if (data_vencimento_fim) {
          const [year, month, day] = (data_vencimento_fim as string).split('-').map(Number);
          where.data_vencimento[Op.lte] = new Date(year, month - 1, day, 23, 59, 59, 999); // Local 23:59:59
        }
      }

      if (search) {
        (where as Record<symbol, unknown>)[Op.or] = [
          { numero_titulo: { [Op.like]: `%${search}%` } },
          { observacoes: { [Op.like]: `%${search}%` } }
        ];
      }

      // Lógica de count mantida devido ao problema potencial com Op.ne no count
      const isStatusExclusion = status && typeof status === 'string' && status.startsWith('!');
      let count: number;
      
      if (isStatusExclusion) {
        const allMatching = await Titulo.findAll({ where, attributes: ['id'] });
        count = allMatching.length;
      } else {
        count = await Titulo.count({ where });
      }
      
      const rows = await Titulo.findAll({
        where,
        include: [
          { model: Cliente, as: 'cliente', attributes: ['id', 'razao_social', 'nome_fantasia', 'cnpj', 'email'] },
          { model: Plano, as: 'plano', attributes: ['id', 'nome_plano', 'valor_mensal'] },
          { model: Banco, as: 'banco', attributes: ['id', 'nome', 'tipo_banco'] }
        ],
        order: [['id', 'DESC']],
        limit: Number(limit),
        offset
      });

      const total = Number(count);
      const perPage = Number(limit);
      const currentPage = Number(page);
      const lastPage = total > 0 ? Math.ceil(total / perPage) : 1;
      const from = total > 0 ? offset + 1 : 0;
      const to = total > 0 ? Math.min(offset + perPage, total) : 0;


      res.json({
        success: true,
        data: rows,
        pagination: { current_page: currentPage, per_page: perPage, total, last_page: lastPage, from, to }
      });
    } catch (error: unknown) {
      logger.error('Erro ao listar títulos', { error });
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  public static async show(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const titulo = await Titulo.findByPk(id, {
        include: [
          { model: Cliente, as: 'cliente', attributes: ['id', 'razao_social', 'nome_fantasia', 'cnpj', 'email', 'telefone', 'whatsapp'] },
          { model: Plano, as: 'plano', attributes: ['id', 'nome_plano', 'valor_mensal', 'descricao'] },
          { model: Banco, as: 'banco', attributes: ['id', 'nome', 'tipo_banco', 'codigo'] }
        ]
      });

      if (!titulo) {
        res.status(404).json({ success: false, message: 'Título não encontrado' });
        return;
      }

      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
      const linkPagamento = this.gerarLinkPagamentoPublico(titulo.id, baseUrl);

      const tituloComLink = {
        ...titulo.toJSON(),
        link_pagamento_publico: linkPagamento
      };

      res.json({ success: true, data: tituloComLink });
    } catch (error: unknown) {
      logger.error('Erro ao buscar título', { error });
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  public static async create(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Iniciando criação de título', { body: req.body });

      if (Array.isArray(req.body.titulos) || req.body.titulos) {
        return await TituloController.createBulk(req, res);
      }

      const { error, value } = tituloCreateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });

      if (error) {
        const errorDetails = error.details.map(detail => ({ 
          message: detail.message, 
          path: detail.path, 
          type: detail.type,
          context: detail.context
        }));
        
        console.log('!!! ERRO DE VALIDAÇÃO DETALHADO !!!');
        console.log(JSON.stringify(errorDetails, null, 2));
        console.log('BODY RECEBIDO:', JSON.stringify(req.body, null, 2));

        logger.warn('Erro de validação na criação de título', { 
          errors: errorDetails,
          body: JSON.stringify(req.body) 
        });
        res.status(400).json({ success: false, message: 'Dados inválidos', errors: error.details.map(detail => detail.message) });
        return;
      }

      const { cliente_id, plano_id, contrato_id, data_vencimento, observacoes, desconto_percentual: dp, desconto_valor: dv, acrescimo_percentual: ap, acrescimo_valor: av, descricao, banco_id } = value;

      const desconto_percentual = dp ? parseFloat(dp.toString()) : null;
      const desconto_valor = dv ? parseFloat(dv.toString()) : null;
      const acrescimo_percentual = ap ? parseFloat(ap.toString()) : null;
      const acrescimo_valor = av ? parseFloat(av.toString()) : null;

      const cliente = await Cliente.findByPk(cliente_id);
      if (!cliente || !cliente.ativo) {
        res.status(404).json({ success: false, message: 'Cliente não encontrado ou inativo' });
        return;
      }

      let contratoReferencia: Contrato | null = null;
      if (contrato_id) {
        contratoReferencia = await Contrato.findOne({ where: { id: contrato_id, cliente_id: cliente.id } });
        if (!contratoReferencia) {
          res.status(404).json({ success: false, message: 'Contrato informado não encontrado para este cliente' });
          return;
        }
      } else {
        contratoReferencia = await Contrato.findOne({ where: { cliente_id: cliente.id, status: 'ativo' }, order: [['id', 'DESC']] });
      }

      let plano;
      if (plano_id) {
        plano = await Plano.findByPk(plano_id);
        if (!plano) {
          res.status(404).json({ success: false, message: 'Plano não encontrado' });
          return;
        }
      } else if (contratoReferencia) {
        plano = await contratoReferencia.getPlano();
        if (!plano) {
          res.status(400).json({ success: false, message: 'Contrato selecionado não possui plano associado' });
          return;
        }
      } else {
        res.status(400).json({ success: false, message: 'Informe o plano ou associe o cliente a um contrato com plano ativo' });
        return;
      }

      if (!data_vencimento) {
         res.status(400).json({ success: false, message: 'Data de vencimento é obrigatória' });
         return;
      }
      
      let banco;
      const bancoIdToFind = banco_id || contratoReferencia?.conta_boleto;
      
      if (bancoIdToFind) {
        banco = await Banco.findByPk(bancoIdToFind);
        if (!banco || !banco.ativo) {
          res.status(400).json({ success: false, message: 'Banco configurado não está ativo' });
          return;
        }
      } else {
        banco = await Banco.findOne({ where: { ativo: true }, order: [['id', 'DESC']] });
        if (!banco) {
          res.status(400).json({ success: false, message: 'Nenhum banco ativo encontrado' });
          return;
        }
      }

      const gerarNumeroTitulo = () => `TIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      let valorFinal = parseFloat(plano.valor_mensal.toString());
      
      if (desconto_valor && desconto_valor > 0) {
        valorFinal = valorFinal - desconto_valor;
      } else if (desconto_percentual && desconto_percentual > 0) {
        valorFinal = valorFinal * (1 - (desconto_percentual / 100));
      }
      
      if (acrescimo_percentual && acrescimo_percentual > 0) {
        valorFinal = valorFinal * (1 + (acrescimo_percentual / 100));
      }
      
      if (acrescimo_valor && acrescimo_valor > 0) {
        valorFinal = valorFinal + acrescimo_valor;
      }
      
      if (isNaN(valorFinal) || valorFinal < 0.01) {
        res.status(400).json({ success: false, message: 'Valor inválido (R$ ' + valorFinal.toFixed(2) + '). Valor mínimo R$ 0,01.' });
        return;
      }
      valorFinal = Math.max(0.01, valorFinal);

      const titulo = await withTransaction(async (transaction: Transaction) => {
        
        return await Titulo.create({
          cliente_id,
          plano_id: plano.id,
          banco_id: banco.id,
          contrato_id: contratoReferencia?.id || contrato_id || null,
          numero_titulo: gerarNumeroTitulo(),
          valor: valorFinal,
          valor_final: valorFinal,
          // Usar data normal do JS, Sequelize configurado com timezone cuidará disso
          data_vencimento: new Date(data_vencimento),
          observacoes: observacoes || '',
          desconto_percentual,
          desconto_valor,
          acrescimo_percentual,
          acrescimo_valor,
          descricao: descricao || null,
          status: 'pendente',
          pago: false
        }, { transaction });
      });

      res.status(201).json({ success: true, message: 'Título criado com sucesso', data: titulo });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      logger.error('Erro ao criar título', { 
        error: errorMessage,
        stack: errorStack,
        body: req.body
      });
      res.status(500).json({ success: false, message: 'Erro interno do servidor: ' + errorMessage });
    }
  }

  private static async createBulk(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = titulosBulkCreateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });

      if (error) {
        res.status(400).json({ success: false, message: 'Dados inválidos', errors: error.details.map(detail => detail.message) });
        return;
      }

      const { titulos } = value;

      const titulosCriados = await withTransaction(async (transaction: Transaction) => {
        const resultados: Titulo[] = [];

        for (const dadosTitulo of titulos) {
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

          const numeroTitulo = `TIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

          let valorFinal = parseFloat(plano.valor_mensal.toString());
          const desconto_percentual = dadosTitulo.desconto_percentual ? parseFloat(dadosTitulo.desconto_percentual.toString()) : null;
          const desconto_valor = dadosTitulo.desconto_valor ? parseFloat(dadosTitulo.desconto_valor.toString()) : null;
          const acrescimo_percentual = dadosTitulo.acrescimo_percentual ? parseFloat(dadosTitulo.acrescimo_percentual.toString()) : null;
          const acrescimo_valor = dadosTitulo.acrescimo_valor ? parseFloat(dadosTitulo.acrescimo_valor.toString()) : null;

          if (desconto_valor && desconto_valor > 0) {
            valorFinal = valorFinal - desconto_valor;
          } else if (desconto_percentual && desconto_percentual > 0) {
            valorFinal = valorFinal * (1 - (desconto_percentual / 100));
          }

          if (acrescimo_percentual && acrescimo_percentual > 0) {
            valorFinal = valorFinal * (1 + (acrescimo_percentual / 100));
          }

          if (acrescimo_valor && acrescimo_valor > 0) {
            valorFinal = valorFinal + acrescimo_valor;
          }

          valorFinal = Math.max(0.01, valorFinal);

          const titulo = await Titulo.create({
            cliente_id: dadosTitulo.cliente_id,
            plano_id: dadosTitulo.plano_id,
            banco_id: dadosTitulo.banco_id,
            contrato_id: dadosTitulo.contrato_id || null,
            numero_titulo: numeroTitulo,
            valor: valorFinal,
            valor_final: valorFinal,
            data_vencimento: new Date(dadosTitulo.data_vencimento),
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

      const { metrics, isMetricsEnabled } = await import('../utils/metrics');
      if (isMetricsEnabled() && metrics && titulosCriados.length > 0) {
        metrics.businessTitulosGerados.inc(titulosCriados.length);
      }

      res.status(201).json({ success: true, message: `${titulosCriados.length} título(s) criado(s) com sucesso`, data: titulosCriados });
    } catch (error: unknown) {
      logger.error('Erro ao criar títulos em lote', { context: 'TituloController', action: 'createBulk', error });
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      res.status(500).json({ success: false, message: errorMessage });
    }
  }

  public static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, data_vencimento, observacoes } = req.body;

      const titulo = await Titulo.findByPk(id, { include: [{ model: Cliente, as: 'cliente' }, { model: Banco, as: 'banco' }] }) as TituloComRelacoes | null;

      if (!titulo) {
        res.status(404).json({ success: false, message: 'Título não encontrado' });
        return;
      }

      // Validações de status
      if (status === 'cancelado' && titulo.status === 'pago') {
        res.status(400).json({ success: false, message: 'Não é possível cancelar um título que já foi pago' });
        return;
      }
      if (status === 'cancelado' && titulo.status === 'cancelado') {
        res.status(400).json({ success: false, message: 'Este título já está cancelado' });
        return;
      }
      if (status === 'pago' && titulo.status === 'cancelado') {
        res.status(400).json({ success: false, message: 'Não é possível marcar como pago um título cancelado' });
        return;
      }

      // Lógica de cancelamento no gateway
      if (status === 'cancelado' && titulo.status !== 'cancelado') {
        if (titulo.charge_id && titulo.banco && ['efi', 'asaas'].includes(titulo.banco?.tipo_banco ?? '')) {
          const resultadoCancelamento = await BancoApiService.cancelarTitulo(titulo as TituloComRelacoes);

          if (!resultadoCancelamento.success) {
            logger.warn('Falha ao cancelar título no gateway bancário', { titulo_id: titulo.id, charge_id: titulo.charge_id, message: resultadoCancelamento.message });
            res.status(400).json({ success: false, message: resultadoCancelamento.message ?? 'Não foi possível cancelar o título no banco emissor' });
            return;
          }
          logger.info('Título cancelado no gateway bancário', { titulo_id: titulo.id, charge_id: titulo.charge_id });
        }
      }

      // Lógica de alteração de vencimento
      let dataVencimentoParaUpdate: Date | undefined;
      if (data_vencimento) {
        const dataVencimentoOriginal = new Date(titulo.data_vencimento).toISOString().split('T')[0];
        const dataVencimentoNova = new Date(data_vencimento).toISOString().split('T')[0];
        
        if (dataVencimentoNova !== dataVencimentoOriginal) {
          if (titulo.status === 'cancelado') {
            res.status(400).json({ success: false, message: 'Não é possível alterar o vencimento de um título cancelado' });
            return;
          }
          
          // Lógica de alteração de vencimento
          dataVencimentoParaUpdate = new Date(data_vencimento);
          
          logger.info('Alteração de vencimento detectada', { titulo_id: titulo.id, data_original: titulo.data_vencimento, data_nova: data_vencimento });
          
          // TODO: Implementar remarcação na API do banco (BancoApiService.remarcarVencimento)
          // ...
        }
      }

      // Atualizar título
      await titulo.update({
        status: status || titulo.status,
        data_vencimento: dataVencimentoParaUpdate ?? titulo.data_vencimento,
        observacoes: observacoes !== undefined ? observacoes : titulo.observacoes
      });

      res.json({ success: true, message: 'Título atualizado com sucesso', data: titulo });
    } catch (error: unknown) {
      logger.error('Erro ao atualizar título', { error });
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  public static async destroy(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const titulo = await Titulo.findByPk(id, { include: [{ model: Banco, as: 'banco' }] }) as TituloComRelacoes | null;

      if (!titulo) {
        res.status(404).json({ success: false, message: 'Título não encontrado' });
        return;
      }

      // Cancelar na API do banco
      if (titulo.charge_id && titulo.banco && ['efi', 'asaas'].includes(titulo.banco.tipo_banco ?? '')) {
        try {
          const resultado = await BancoApiService.cancelarTitulo(titulo as TituloComRelacoes);
          logger.info(`Cancelamento no gateway ${resultado.success ? 'bem-sucedido' : 'falhou'}`, { titulo_id: titulo.id, charge_id: titulo.charge_id, message: resultado.message });
        } catch (error: unknown) {
          logger.warn('Erro ao cancelar título no gateway bancário', { titulo_id: titulo.id, error });
        }
      }

      // Deletar título
      await titulo.destroy();

      res.json({ success: true, message: 'Título deletado com sucesso' });
    } catch (error: unknown) {
      logger.error('Erro ao deletar título', { error });
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }
  
  // --- Endpoints de Impressão e Envio ---

  public static async imprimirBoleto(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const titulo = await Titulo.findByPk(id, {
        include: [
          { model: Cliente, as: 'cliente' },
          { model: Plano, as: 'plano' },
          { model: Banco, as: 'banco', attributes: ['id', 'nome', 'codigo', 'tipo_banco', 'client_id_producao', 'client_secret_producao', 'sandbox', 'api_key', 'url_retorno', 'percentual_multa', 'percentual_juros', 'instrucao_linha_1', 'instrucao_linha_2', 'instrucao_linha_3', 'instrucao_linha_4', 'instrucao_linha_5', 'logo'] }
        ]
      }) as TituloComRelacoes | null;

      if (!titulo) {
        res.status(404).json({ success: false, message: 'Título não encontrado' });
        return;
      }

      // Registrar no banco se não tiver charge_id
      if (!titulo.charge_id) {
        logger.info('Registrando título no banco antes de imprimir...', { titulo_id: titulo.id });

        const resultado = await BancoApiService.gerarTitulo(titulo as TituloComRelacoes);
        
        if (!resultado.success || !resultado.data) {
          logger.error('Falha ao registrar título no banco', { titulo_id: titulo.id, message: resultado.message });
          res.status(500).json({ success: false, message: 'Não foi possível registrar o título no banco: ' + (resultado.message || 'Erro desconhecido'), error: 'ERRO_REGISTRO_BANCO' });
          return;
        }

        const codigoBarrasFinal = typeof resultado.data.codigo_barras === 'string' ? resultado.data.codigo_barras : null;
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
        await titulo.reload();
      }

      // Processar HTML
      const template = await TituloController.processarBoletoHtml(titulo);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Boleto - ${titulo.numero_titulo}</title>
          <style> body { margin: 0; padding: 0; } </style>
        </head>
        <body>
          ${template}
        </body>
        </html>
      `);
    } catch (error: unknown) {
      logger.error('Erro ao imprimir boleto', { error });
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  public static async imprimirBoletosMultiplos(req: Request, res: Response): Promise<void> {
    try {
      let ids = req.body.ids || req.query.ids;
      
      if (typeof ids === 'string') {
        try {
          ids = JSON.parse(ids);
        } catch {
          ids = ids.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id));
        }
      }
      if (typeof ids === 'number') ids = [ids];

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({ success: false, message: 'IDs dos títulos não fornecidos' });
        return;
      }

      const titulos = await Titulo.findAll({ where: { id: ids }, include: [{ model: Cliente, as: 'cliente' }, { model: Plano, as: 'plano' }, { model: Banco, as: 'banco' }] });
      if (titulos.length === 0) {
        res.status(404).json({ success: false, message: 'Nenhum título encontrado' });
        return;
      }

      const boletosHtml: string[] = [];

      for (const titulo of titulos) {
        if (!titulo.charge_id) {
          try {
            const resultado = await BancoApiService.gerarTitulo(titulo as TituloComRelacoes);
            
            if (resultado.success && resultado.data) {
              const codigoBarrasParaSalvar = typeof resultado.data.codigo_barras === 'string' ? resultado.data.codigo_barras : null;
              await titulo.update({ charge_id: resultado.data.charge_id, codigo_barras: codigoBarrasParaSalvar, linha_digitavel: resultado.data.linha_digitavel as string | null });
              await titulo.reload();
              logger.info('Título registrado com sucesso', { titulo_id: titulo.id });
            } else {
              logger.error('Falha ao registrar título', { titulo_id: titulo.id, message: resultado.message });
            }
          } catch (error: unknown) {
            logger.error('Erro ao registrar título', { error, titulo_id: titulo.id });
          }
        }

        const boletoHtml = await TituloController.processarBoletoHtml(titulo);
        boletosHtml.push(`<div style="page-break-after: always;">${boletoHtml}</div>`);
      }

      const autoPrint = req.query.print === 'true';
      const template = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Boletos - ${titulos.length} título(s)</title>
          <style>
            @media print { .page-break { page-break-after: always; } }
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
            .boleto { margin-bottom: 0; }
          </style>
          ${autoPrint ? '<script>window.onload = function() { setTimeout(function() { window.print(); }, 500); };</script>' : ''}
        </head>
        <body>
          ${boletosHtml.join('\n')}
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(template);
    } catch (error: unknown) {
      logger.error('Erro ao imprimir boletos múltiplos', { error });
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  public static async gerarPdfBoletosMultiplos(req: Request, res: Response): Promise<void> {
    try {
      let ids: number[] = [];
      const idsParam = req.query.ids as string;
      
      if (idsParam) {
        try {
          const parsed = JSON.parse(idsParam);
          ids = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          ids = idsParam.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id));
        }
      }

      if (!ids || ids.length === 0) {
        res.status(400).json({ success: false, message: 'IDs dos títulos não fornecidos' });
        return;
      }

      const titulos = await Titulo.findAll({ where: { id: { [Op.in]: ids } }, include: [{ model: Cliente, as: 'cliente' }, { model: Plano, as: 'plano' }, { model: Banco, as: 'banco' }] });
      if (titulos.length === 0) {
        res.status(404).json({ success: false, message: 'Nenhum título encontrado' });
        return;
      }

      const boletosHtml: string[] = [];

      for (const titulo of titulos) {
        if (!titulo.charge_id) {
          try {
            const resultado = await BancoApiService.gerarTitulo(titulo as TituloComRelacoes);
            
            if (resultado.success && resultado.data) {
              const codigoBarrasParaSalvar = typeof resultado.data.codigo_barras === 'string' ? resultado.data.codigo_barras : null;
              await titulo.update({ charge_id: resultado.data.charge_id, codigo_barras: codigoBarrasParaSalvar, linha_digitavel: resultado.data.linha_digitavel as string | null });
              await titulo.reload();
            }
          } catch (error: unknown) {
            logger.error('Erro ao registrar título no banco', { titulo_id: titulo.id, error });
          }
        }
        
        const boletoHtml = await TituloController.processarBoletoHtml(titulo);
        boletosHtml.push(`<div style="page-break-after: always;">${boletoHtml}</div>`);
      }

      const template = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Boletos - ${titulos.length} título(s)</title>
          <style>
            @media print { .page-break { page-break-after: always; } }
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
            .boleto { margin-bottom: 0; }
          </style>
        </head>
        <body>
          ${boletosHtml.join('')}
        </body>
        </html>
      `;

      // Limpar variáveis não processadas
      const templateLimpo = template.replace(/\{\{[^}]+\}\}/g, '');

      // Converter HTML para PDF usando html-pdf-node
      const htmlPdfModule = await import('html-pdf-node') as typeof htmlPdf;
      const file = { content: templateLimpo };
      const options: PdfOptions = { format: 'A4', margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }, printBackground: true, displayHeaderFooter: false };
      
      const pdfBuffer = await htmlPdfModule.generatePdf(file, options);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="boletos-${titulos.length}-titulos.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error: unknown) {
      logger.error('Erro ao gerar PDF de múltiplos boletos', { error });
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  // --- Endpoints de Pagamento e Status ---

  public static async marcarComoPago(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { valor_pago, data_pagamento } = req.body;

      const titulo = await Titulo.findByPk(id);
      if (!titulo) {
        res.status(404).json({ success: false, message: 'Título não encontrado' });
        return;
      }

      if (titulo.status === 'cancelado') {
        res.status(400).json({ success: false, message: 'Não é possível marcar como pago um título cancelado' });
        return;
      }
      if (titulo.status === 'pago') {
        res.status(400).json({ success: false, message: 'Este título já foi marcado como pago' });
        return;
      }

      const dataPagamentoNormalizada = data_pagamento ? (typeof data_pagamento === 'string' ? new Date(data_pagamento) : data_pagamento) : undefined;
      
      await titulo.marcarComoPago(valor_pago, dataPagamentoNormalizada);

      res.json({ success: true, message: 'Título marcado como pago', data: titulo });
    } catch (error: unknown) {
      logger.error('Erro ao marcar título como pago', { error });
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  public static async desmarcarPago(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const titulo = await Titulo.findByPk(id);
      if (!titulo) {
        res.status(404).json({ success: false, message: 'Título não encontrado' });
        return;
      }

      await titulo.desmarcarPago();

      res.json({ success: true, message: 'Título desmarcado como pago', data: titulo });
    } catch (error: unknown) {
      logger.error('Erro ao desmarcar título como pago', { error });
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  public static async consultarRecebimento(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const titulo = await Titulo.findByPk(id, { include: [{ model: Cliente, as: 'cliente' }, { model: Plano, as: 'plano' }, { model: Banco, as: 'banco' }] });

      if (!titulo) {
        res.status(404).json({ success: false, message: 'Título não encontrado' });
        return;
      }
      if (!titulo.charge_id) {
        res.status(400).json({ success: false, message: 'Título não possui charge_id (não foi registrado no banco)' });
        return;
      }

      const resultado = await BancoApiService.consultarStatus(titulo);

      if (resultado.success && resultado.data) {
        const statusPago = resultado.data.status === 'paid' || resultado.data.status === 'settled';
        
        if (statusPago) {
          const valorPago = resultado.data.valor_pago || titulo.valor;
          const dataPagamento = resultado.data.data_pagamento ? new Date(resultado.data.data_pagamento as string | number) : new Date();

          await titulo.marcarComoPago(Number(valorPago), dataPagamento);

          res.json({
            success: true,
            message: 'Título atualizado com sucesso',
            data: { titulo_id: titulo.id, status_novo: titulo.status, valor_pago: valorPago, data_pagamento: dataPagamento }
          });
        } else {
          res.json({
            success: true,
            message: 'Título consultado - sem alterações (ainda não foi pago)',
            data: { titulo_id: titulo.id, status: titulo.status, status_banco: resultado.data.status }
          });
        }
      } else {
        res.status(400).json({ success: false, message: resultado.message || 'Erro ao consultar status no banco' });
      }
    } catch (error: unknown) {
      logger.error('Erro ao consultar recebimento', { error });
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  public static async estornar(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const titulo = await Titulo.findByPk(id);
      if (!titulo) {
        res.status(404).json({ success: false, message: 'Título não encontrado' });
        return;
      }

      if (titulo.status !== 'pago') {
        res.status(400).json({ success: false, message: 'Só é possível estornar títulos que estão pagos' });
        return;
      }

      await titulo.desmarcarPago();

      res.json({ success: true, message: 'Título estornado com sucesso', data: titulo });
    } catch (error: unknown) {
      logger.error('Erro ao estornar título', { error });
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  // --- Endpoints de Busca e Estatísticas ---

  public static async getByContrato(req: Request, res: Response): Promise<void> {
    try {
      const { contratoId } = req.params;

      const contrato = await Contrato.findByPk(contratoId);
      if (!contrato) {
        res.status(404).json({ success: false, message: 'Contrato não encontrado' });
        return;
      }

      const titulos = await Titulo.findAll({
        where: { contrato_id: contratoId },
        include: [
          { model: Cliente, as: 'cliente', where: { id: contrato.cliente_id }, attributes: ['id', 'razao_social', 'nome_fantasia', 'cnpj'] },
          { model: Plano, as: 'plano', attributes: ['id', 'nome_plano', 'valor_mensal'] },
          { model: Banco, as: 'banco', attributes: ['id', 'nome', 'tipo_banco'] }
        ],
        order: [['data_vencimento', 'DESC']]
      });

      res.json({ success: true, data: titulos });
    } catch (error: unknown) {
      logger.error('Erro ao buscar títulos por contrato', { error });
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  public static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const { cliente_id } = req.query;

      const where: WhereOptions = {};
      if (cliente_id) where.cliente_id = cliente_id;

      const [totalTitulos, titulosPendentes, titulosPagos, titulosVencidos, titulosCancelados] = await Promise.all([
        Titulo.count({ where }),
        Titulo.count({ where: { ...where, status: 'pendente' } }),
        Titulo.count({ where: { ...where, status: 'pago' } }),
        Titulo.count({ where: { ...where, status: 'vencido' } }),
        Titulo.count({ where: { ...where, status: 'cancelado' } })
      ]);

      const [valorTotal, valorPendente, valorPago, valorVencido, valorCancelado] = await Promise.all([
        Titulo.sum('valor', { where }),
        Titulo.sum('valor', { where: { ...where, status: 'pendente' } }),
        Titulo.sum('valor', { where: { ...where, status: 'pago' } }),
        Titulo.sum('valor', { where: { ...where, status: 'vencido' } }),
        Titulo.sum('valor', { where: { ...where, status: 'cancelado' } })
      ]);

      res.json({
        success: true,
        data: {
          quantidade: { total: totalTitulos, pendentes: titulosPendentes, pagos: titulosPagos, vencidos: titulosVencidos, cancelados: titulosCancelados },
          valores: { total: valorTotal || 0, pendente: valorPendente || 0, pago: valorPago || 0, vencido: valorVencido || 0, cancelado: valorCancelado || 0 }
        }
      });
    } catch (error: unknown) {
      logger.error('Erro ao buscar estatísticas dos títulos', { error });
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  // --- Outros Endpoints ---

  public static gerarLinkPagamentoPublico(tituloId: number, baseUrl?: string): string {
    const secret = process.env.JWT_SECRET || 'default-secret';
    const token = crypto.createHmac('sha256', secret).update(String(tituloId)).digest('hex').substring(0, 16);
    
    const frontendUrl = process.env.FRONTEND_URL || process.env.REACT_APP_URL || 'http://localhost:3000';
    return `${frontendUrl}/pagamento/${tituloId}/${token}`;
  }

  public static async gerarLinkPagamento(req: Request, res: Response): Promise<void> {
    try {
      const tituloId = parseInt(req.params.id, 10);
      if (isNaN(tituloId)) {
        res.status(400).json({ success: false, message: 'ID do título inválido' });
        return;
      }

      const titulo = await Titulo.findByPk(tituloId);
      if (!titulo) {
        res.status(404).json({ success: false, message: 'Título não encontrado' });
        return;
      }

      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
      const link = this.gerarLinkPagamentoPublico(tituloId, baseUrl);

      res.json({ success: true, data: { titulo_id: tituloId, link: link, numero_titulo: titulo.numero_titulo }, message: 'Link de pagamento gerado com sucesso' });
    } catch (error: unknown) {
      logger.error('Erro ao gerar link de pagamento:', { error });
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  public static async enviarWhatsApp(req: Request, res: Response): Promise<void> {
    try {
      const tituloId = parseInt(req.params.id, 10);
      if (isNaN(tituloId)) {
        res.status(400).json({ success: false, message: 'ID do título inválido' });
        return;
      }

      const { WhatsAppService } = await import('../services/WhatsAppService');
      const resultado = await WhatsAppService.enviarTituloManual(tituloId);

      if (resultado.sucesso) {
        res.json({ success: true, message: resultado.mensagem || 'Mensagem enviada com sucesso' });
      } else {
        res.status(400).json({ success: false, message: resultado.mensagem || 'Erro ao enviar mensagem' });
      }
    } catch (error: unknown) {
      logger.error('Erro ao enviar título via WhatsApp:', { error });
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  public static async enviarEmail(req: Request, res: Response): Promise<void> {
    try {
      const tituloId = parseInt(req.params.id, 10);
      if (isNaN(tituloId)) {
        res.status(400).json({ success: false, message: 'ID do título inválido' });
        return;
      }

      const { EmailService } = await import('../services/EmailService');
      const resultado = await EmailService.enviarTituloManual(tituloId);

      if (resultado.sucesso) {
        res.json({ success: true, message: resultado.mensagem || 'Email enviado com sucesso' });
      } else {
        res.status(400).json({ success: false, message: resultado.mensagem || 'Erro ao enviar email' });
      }
    } catch (error: unknown) {
      logger.error('Erro ao enviar título via Email:', { error });
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }
}