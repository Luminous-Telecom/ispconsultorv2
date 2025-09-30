import { Request, Response } from 'express';
import { CarneParcela } from '../models/CarneParcela';
import { DadosEmpresa } from '../models/DadosEmpresa';
import { BancoApiService } from '../services/BancoApiService';
import { logger } from '../utils/logger';
import { Op } from 'sequelize';
import fs from 'fs';
import path from 'path';
import JsBarcode from 'jsbarcode';
import { createCanvas } from 'canvas';

export class CarneParcelaController {
  
  // Método para processar template do topo
  private static processarTemplateTopo(template: string, variables: any): string {
    const topoVariables = {
      LOGOMARCA: variables.LOGOMARCA,
      CEDENTE: variables.CEDENTE,
      EMPRESACPF: variables.EMPRESACPF,
      EMPRESAENDERECO: variables.EMPRESAENDERECO,
      EMPRESABAIRRO: variables.EMPRESABAIRRO,
      EMPRESACEP: variables.EMPRESACEP,
      EMPRESACIDADE: variables.EMPRESACIDADE,
      EMPRESAESTADO: variables.EMPRESAESTADO,
      LOGOSVA: variables.LOGOSVA,
      NUMERO_DOCUMENTO: variables.NUMERO_DOCUMENTO,
      SACADO_IDNOME: variables.SACADO_IDNOME,
      SACADO_ENDERECO: variables.SACADO_ENDERECO,
      SACADO_COMPLEMENTO: variables.SACADO_COMPLEMENTO,
      SACADO_BAIRRO: variables.SACADO_BAIRRO,
      SACADO_CEP: variables.SACADO_CEP,
      SACADO_CIDADE: variables.SACADO_CIDADE,
      SACADO_ESTADO: variables.SACADO_ESTADO,
      SACADO_CPF: variables.SACADO_CPF,
      DATA_PROC: variables.DATA_PROC,
      MOVIMENTO: variables.MOVIMENTO,
      VALOR_COBRADO: variables.VALOR_COBRADO,
      TAXA_BOLETO: variables.TAXA_BOLETO,
      MULTA_MORA: variables.MULTA_MORA,
      DEMONSTRATIVO1: variables.DEMONSTRATIVO1,
      DEMONSTRATIVO2: variables.DEMONSTRATIVO2,
      DEMONSTRATIVO3: variables.DEMONSTRATIVO3,
      DEMONSTRATIVO4: variables.DEMONSTRATIVO4,
      VALOR_BOLETO: variables.VALOR_BOLETO
    };

    let processedTemplate = template;
    Object.entries(topoVariables).forEach(([key, value]) => {
      processedTemplate = processedTemplate.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    return processedTemplate;
  }

  // Método para processar template do corpo
  private static processarTemplateCorpo(template: string, variables: any): string {
    const corpoVariables = {
      LOGOBANCO: variables.LOGOBANCO,
      CODIGO_BANCO_COM_DV: variables.CODIGO_BANCO_COM_DV,
      LINHA_DIGITAVEL: variables.LINHA_DIGITAVEL,
      LOCAL_PAGAMENTO: variables.LOCAL_PAGAMENTO,
      DATA_VENC: variables.DATA_VENC,
      CEDENTE: variables.CEDENTE,
      AGENCIA_CODIGO: variables.AGENCIA_CODIGO,
      DATA_DOCUMENTO: variables.DATA_DOCUMENTO,
      NUMERO_DOCUMENTO: variables.NUMERO_DOCUMENTO,
      ESPECIE_DOC: variables.ESPECIE_DOC,
      DATA_PROC: variables.DATA_PROC,
      NOSSO_NUMERO: variables.NOSSO_NUMERO,
      CARTEIRA: variables.CARTEIRA,
      VAR_CARTEIRA: variables.VAR_CARTEIRA,
      ESPECIE: variables.ESPECIE,
      QUANTIDADE: variables.QUANTIDADE,
      VALOR_UNITARIO: variables.VALOR_UNITARIO,
      VALOR_BOLETO: variables.VALOR_BOLETO,
      TEXTO_MULTAMORA: variables.TEXTO_MULTAMORA,
      INSTRUCOES1: variables.INSTRUCOES1,
      INSTRUCOES2: variables.INSTRUCOES2,
      INSTRUCOES3: variables.INSTRUCOES3,
      INSTRUCOES4: variables.INSTRUCOES4,
      INSTRUCOES5: variables.INSTRUCOES5,
      QRCODE: variables.QRCODE,
      SACADO_NOME: variables.SACADO_NOME,
      TIPO_PSACADO: variables.TIPO_PSACADO,
      SACADO_ENDERECO: variables.SACADO_ENDERECO,
      SACADO_BAIRRO: variables.SACADO_BAIRRO,
      SACADO_COMPLEMENTO: variables.SACADO_COMPLEMENTO,
      SACADO_CIDADE: variables.SACADO_CIDADE,
      SACADO_ESTADO: variables.SACADO_ESTADO,
      SACADO_CEP: variables.SACADO_CEP,
      BOLETO_BARCODE2: variables.BOLETO_BARCODE2
    };

    let processedTemplate = template;
    Object.entries(corpoVariables).forEach(([key, value]) => {
      processedTemplate = processedTemplate.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    return processedTemplate;
  }



  // Método auxiliar para gerar variáveis do boleto
  private static async gerarVariaveisBoleto(parcela: any, dadosEmpresa: any): Promise<any> {
    const formatMoney = (value: number) => {
      return value.toFixed(2).replace('.', ',');
    };

    const safe = (value: any, fallback = '') => {
      return value !== null && value !== '' ? value : fallback;
    };

    const generateCodigoBarras = (parcela: any) => {
      // Implementar lógica de geração do código de barras
      return '12345678901234567890123456789012345678901234';
    };

    const generateLinhaDigitavel = (parcela: any) => {
      // Implementar lógica de geração da linha digitável
      return '12345.67890.12345.678901.23456.789012.3.45678901234567';
    };


    const generateBarcodeBase64 = (data: string) => {
      try {
        const canvas = createCanvas(400, 70);
        JsBarcode(canvas, data, {
          format: "CODE128",
          width: 3,
          height: 55,
          displayValue: false,
          background: "#ffffff",
          lineColor: "#000000"
        });
        return canvas.toDataURL('image/png');
      } catch (error) {
        console.error('Erro ao gerar código de barras:', error);
        return '';
      }
    };

    // Gerar QR Code primeiro
    const qrCodeData = parcela.qrcode_image || '';

    return {
      // Dados da empresa
      LOGOMARCA: (() => {
        if (dadosEmpresa?.logo) {
          if (dadosEmpresa.logo.startsWith('http')) {
            return dadosEmpresa.logo;
          }
          return `/uploads/empresa/${dadosEmpresa.logo}`;
        }
        return `${process.env.BASE_URL}/images/bancos/boletoproprio.png`;
      })(),
      
      LOGOBANCO: (() => {
        const banco = (parcela as any).carne?.banco;
        if (banco?.tipo_banco) {
          return `${process.env.BASE_URL}/images/bancos/${banco.tipo_banco}.png`;
        }
        return `${process.env.BASE_URL}/images/bancos/boletoproprio.png`;
      })(),

      CEDENTE: safe(dadosEmpresa?.razao_social),
      EMPRESACPF: safe(dadosEmpresa?.cnpj),
      EMPRESAENDERECO: safe(dadosEmpresa?.endereco),
      EMPRESABAIRRO: safe(dadosEmpresa?.bairro),
      EMPRESACEP: safe(dadosEmpresa?.cep),
      EMPRESACIDADE: safe(dadosEmpresa?.cidade),
      EMPRESAESTADO: safe(dadosEmpresa?.estado),
      LOGOSVA: '',
      QUANTIDADE: '1',
      VALOR_UNITARIO: `R$ ${parseFloat(parcela.valor_parcela.toString()).toFixed(2).replace('.', ',')}`,

      // Dados do boleto
      NUMERO_DOCUMENTO: safe(parcela.numero_parcela),
      CODIGO_BANCO_COM_DV: safe((parcela as any).carne?.banco?.codigo_banco),
      LINHA_DIGITAVEL: parcela.linha_digitavel || generateLinhaDigitavel(parcela),
      LOCAL_PAGAMENTO: safe((parcela as any).carne?.banco?.local_pagamento),
      DATA_VENC: parcela.data_vencimento ? (() => {
        const dateStr = parcela.data_vencimento instanceof Date 
          ? parcela.data_vencimento.toISOString()
          : (parcela.data_vencimento as any).toString();
        return dateStr.split('T')[0].split('-').reverse().join('/');
      })() : '',
      AGENCIA_CODIGO: safe((parcela as any).carne?.banco?.agencia_codigo),
      DATA_DOCUMENTO: (() => {
        if (!parcela.created_at) return '';
        const dateStr = parcela.created_at instanceof Date 
          ? parcela.created_at.toISOString()
          : (parcela.created_at as any).toString();
        return dateStr.split('T')[0].split('-').reverse().join('/');
      })(),
      ESPECIE_DOC: safe((parcela as any).carne?.banco?.especie_doc),
      DATA_PROC: (() => {
        if (!parcela.created_at) return '';
        const dateStr = parcela.created_at instanceof Date 
          ? parcela.created_at.toISOString()
          : (parcela.created_at as any).toString();
        return dateStr.split('T')[0].split('-').reverse().join('/');
      })(),
      NOSSO_NUMERO: safe(parcela.nosso_numero),
      CARTEIRA: safe((parcela as any).carne?.banco?.carteira),
      VAR_CARTEIRA: '',
      ESPECIE: safe((parcela as any).carne?.banco?.especie),
      VALOR_BOLETO: formatMoney(parcela.valor_parcela),
      TEXTO_MULTAMORA: safe((parcela as any).carne?.banco?.texto_multamora),
      INSTRUCOES1: safe((parcela as any).carne?.banco?.instrucoes1),
      INSTRUCOES2: safe((parcela as any).carne?.banco?.instrucoes2),
      INSTRUCOES3: safe((parcela as any).carne?.banco?.instrucoes3),
      INSTRUCOES4: safe((parcela as any).carne?.banco?.instrucoes4),
      INSTRUCOES5: safe((parcela as any).carne?.banco?.instrucoes5),
      QRCODE: qrCodeData,
      BOLETO_BARCODE2: `<div class="barcode-container" style="text-align: center; margin: 10px 0; padding: 5px;">
        <img src="${generateBarcodeBase64(parcela.codigo_barras || generateCodigoBarras(parcela))}" 
             alt="Código de Barras" style="width: auto; height: 60px; max-width: 400px;" />
      </div>`,

      // Dados do cliente
      SACADO_IDNOME: safe((parcela as any).carne?.cliente?.razao_social),
      SACADO_ENDERECO: safe((parcela as any).carne?.cliente?.endereco),
      SACADO_COMPLEMENTO: safe((parcela as any).carne?.cliente?.complemento),
      SACADO_BAIRRO: safe((parcela as any).carne?.cliente?.bairro),
      SACADO_CEP: safe((parcela as any).carne?.cliente?.cep),
      SACADO_CIDADE: safe((parcela as any).carne?.cliente?.cidade),
      SACADO_ESTADO: safe((parcela as any).carne?.cliente?.estado),
      SACADO_CPF: safe((parcela as any).carne?.cliente?.cnpj || (parcela as any).carne?.cliente?.cpf),
      MOVIMENTO: 'Valor do título',
      VALOR_COBRADO: formatMoney(parcela.valor_parcela),
      TAXA_BOLETO: '0,00',
      MULTA_MORA: '0,00',
      DEMONSTRATIVO1: safe((parcela as any).carne?.banco?.demonstrativo1),
      DEMONSTRATIVO2: safe((parcela as any).carne?.banco?.demonstrativo2),
      DEMONSTRATIVO3: safe((parcela as any).carne?.banco?.demonstrativo3),
      DEMONSTRATIVO4: safe((parcela as any).carne?.banco?.demonstrativo4),
      SACADO_NOME: safe((parcela as any).carne?.cliente?.razao_social),
      TIPO_PSACADO: (parcela as any).carne?.cliente?.cnpj ? 'CNPJ' : 'CPF'
    };
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { plano_id, data_vencimento, observacoes, cliente_id } = req.body;

      console.log('Dados recebidos no backend:', { plano_id, data_vencimento, observacoes, cliente_id });

      // Validações básicas
      if (!plano_id || !data_vencimento || !cliente_id) {
        console.log('Validação falhou:', { plano_id, data_vencimento, cliente_id });
        res.status(400).json({
          success: false,
          message: 'Plano, data de vencimento e cliente são obrigatórios'
        });
        return;
      }

      // Buscar o plano para obter o valor
      const { Plano } = await import('../models/Plano');
      const plano = await Plano.findByPk(plano_id);
      
      if (!plano) {
        res.status(400).json({
          success: false,
          message: 'Plano não encontrado'
        });
        return;
      }

      // Buscar banco padrão para o cliente
      const { Cliente } = await import('../models/Cliente');
      const cliente = await Cliente.findByPk(cliente_id);
      
      if (!cliente) {
        res.status(400).json({
          success: false,
          message: 'Cliente não encontrado'
        });
        return;
      }

      // Buscar banco do cliente ou banco padrão
      const { Banco } = await import('../models/Banco');
      let banco;
      
      if (cliente.conta_boleto) {
        // Usar banco configurado no cliente
        banco = await Banco.findByPk(cliente.conta_boleto);
        if (!banco || !banco.ativo) {
          res.status(400).json({
            success: false,
            message: 'Banco configurado no cliente não está ativo'
          });
          return;
        }
      } else {
        // Usar banco padrão ativo
        banco = await Banco.findOne({ where: { ativo: true } });
        if (!banco) {
          res.status(400).json({
            success: false,
            message: 'Nenhum banco ativo encontrado'
          });
          return;
        }
      }

      // Gerar número único do carnê
      const gerarNumeroCarne = () => {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        return `TIT-${timestamp}-${random}`;
      };

      // Criar carnê individual (1 parcela apenas)
      const { Carne } = await import('../models/Carne');
      const carne = await Carne.create({
        numero_carne: gerarNumeroCarne(),
        cliente_id: cliente_id,
        plano_id: plano_id,
        banco_id: banco.id,
        valor_total: plano.valor_mensal,
        quantidade_parcelas: 1,
        data_vencimento_primeira: data_vencimento,
        observacoes: observacoes || '',
        status: 'pendente'
      });

      // Criar nova parcela/título
      const parcela = await CarneParcela.create({
        carne_id: carne.id,
        plano_id,
        numero_parcela: 1,
        valor_parcela: plano.valor_mensal,
        data_vencimento,
        observacoes: observacoes || '',
        status: 'pendente',
        pago: false
      });

      res.status(201).json({
        success: true,
        message: 'Título criado com sucesso',
        data: parcela
      });
    } catch (error: any) {
      logger.error('Erro ao criar título', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  static async list(req: Request, res: Response): Promise<void> {
    try {
      const { carne_id, cliente_id, search, status, page = 1, limit = 15 } = req.query;

      const where: any = {};
      
      if (carne_id) {
        where.carne_id = carne_id;
      }
      
      if (cliente_id) {
        where['$carne.cliente_id$'] = cliente_id;
      }
      
      if (search) {
        where[Op.or] = [
          { numero_parcela: { [Op.like]: `%${search}%` } },
          { '$carne.cliente.razao_social$': { [Op.like]: `%${search}%` } },
          { '$carne.numero_carne$': { [Op.like]: `%${search}%` } }
        ];
      }
      
      if (status) {
        if (status === 'pago') {
          where.data_pagamento = { [Op.ne]: null };
        } else if (status === 'pendente') {
          where.data_pagamento = null;
        } else if (status === 'vencido') {
          where.data_vencimento = { [Op.lt]: new Date() };
          where.data_pagamento = null;
        }
      }

      const offset = (Number(page) - 1) * Number(limit);
      
      const { count, rows } = await CarneParcela.findAndCountAll({
        where,
        include: [
          {
            association: 'carne',
            include: [
              { association: 'cliente' },
              { association: 'plano' },
              { 
                association: 'banco',
                attributes: ['id', 'nome', 'codigo', 'tipo_banco', 'client_id_producao', 'client_secret_producao']
              }
            ]
          }
        ],
        limit: Number(limit),
        offset,
        order: [['data_vencimento', 'ASC']]
      });

      res.json({
        success: true,
        data: rows,
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(count / Number(limit))
        }
      });
    } catch (error) {
      console.error('Erro ao listar parcelas:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const parcela = await CarneParcela.findByPk(id, {
        include: [
          {
            association: 'carne',
            include: [
              { association: 'cliente' },
              { association: 'plano' },
              { 
                association: 'banco',
                attributes: ['id', 'nome', 'codigo', 'tipo_banco', 'client_id_producao', 'client_secret_producao']
              }
            ]
          }
        ]
      });

      if (!parcela) {
        res.status(404).json({ error: 'Parcela não encontrada' });
        return;
      }

      res.json({ success: true, data: parcela });
    } catch (error) {
      console.error('Erro ao buscar parcela:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async marcarPago(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { data_pagamento, valor_pago, observacoes } = req.body;

      const parcela = await CarneParcela.findByPk(id, {
        include: [{ 
          association: 'carne', 
          include: [{ 
            association: 'banco',
            attributes: ['id', 'nome', 'codigo', 'client_id_producao', 'client_secret_producao']
          }] 
        }]
      });
      
      if (!parcela) {
        res.status(404).json({ error: 'Parcela não encontrada' });
        return;
      }

      const carne = await parcela.getCarne();
      const banco = await carne.getBanco();

      // Se for EFI e houver carnet_id + numero_parcela, tentar baixa manual (settle)
      let settleOk = false;
      if (banco && banco.tipo_banco === 'efi' && carne.carnet_id && parcela.numero_parcela) {
        logger.info('Tentando liquidar parcela na EFI', {
          parcela_id: parcela.id,
          carnet_id: carne.carnet_id,
          numero_parcela: parcela.numero_parcela
        });

        const resultado = await BancoApiService.liquidarParcelaCarne(parcela);
        if (resultado.success) {
          settleOk = true;
          logger.info('Parcela liquidada com sucesso na EFI', {
            parcela_id: parcela.id
          });
        } else {
          logger.error('Falha ao liquidar parcela na EFI', {
            parcela_id: parcela.id,
            error: resultado.message
          });
          res.status(400).json({ 
            error: 'Falha ao marcar como paga na Efí: ' + (resultado.message || 'Erro')
          });
          return;
        }
      }

      // Atualização local
      await parcela.update({
        pago: true,
        data_pagamento: data_pagamento || new Date(),
        valor_pago: valor_pago || parcela.valor_parcela,
        observacoes: observacoes || '',
        status: 'pago'
      });

      // Verificar e atualizar status do carnê
      await carne.verificarEAtualizarStatus();

      // Verificar se deve gerar carnê automático
      try {
        const { CarneAutoService } = await import('../services/CarneAutoService');
        const carnêGerado = await CarneAutoService.verificarEGerarCarneAutomatico(carne.id);
        
        if (carnêGerado) {
          logger.info('Carnê automático gerado após pagamento de parcela', {
            parcela_id: parcela.id,
            carne_id: carne.id
          });
        }
      } catch (error) {
        logger.error('Erro ao verificar geração automática de carnê', {
          parcela_id: parcela.id,
          carne_id: carne.id,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }

      const msg = settleOk 
        ? 'Parcela marcada como paga na Efí e no sistema.' 
        : 'Parcela marcada como paga no sistema.';

      const response: any = { success: true, message: msg };

      res.json(response);
    } catch (error: any) {
      logger.error('Erro ao marcar parcela como paga', {
        parcela_id: req.params.id,
        error: error.message
      });
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async desmarcarPago(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const parcela = await CarneParcela.findByPk(id);
      if (!parcela) {
        res.status(404).json({ error: 'Parcela não encontrada' });
        return;
      }

      await parcela.update({
        pago: false,
        data_pagamento: null,
        valor_pago: null,
        observacoes: '',
        status: 'pendente'
      });

      // Verificar e atualizar status do carnê
      const carne = await parcela.getCarne();
      await carne.verificarEAtualizarStatus();

      res.json({ success: true, message: 'Parcela desmarcada como paga' });
    } catch (error: any) {
      logger.error('Erro ao desmarcar parcela como paga', {
        parcela_id: req.params.id,
        error: error.message
      });
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * Deletar parcela
   */
  static async destroy(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const parcela = await CarneParcela.findByPk(id, {
        include: [{ 
          association: 'carne', 
          include: [{ 
            association: 'banco',
            attributes: ['id', 'nome', 'codigo', 'client_id_producao', 'client_secret_producao']
          }] 
        }]
      });

      if (!parcela) {
        res.status(404).json({ error: 'Parcela não encontrada' });
        return;
      }

      // Verificar se a parcela já foi paga
      if (parcela.status === 'pago') {
        res.status(400).json({ error: 'Não é possível excluir parcela que já foi paga.' });
        return;
      }

      const carne = await parcela.getCarne();
      const banco = await carne.getBanco();

      // Cancelar título no banco se existir
      if (parcela.charge_id) {
        logger.info('Cancelando título no banco antes de deletar', {
          parcela_id: parcela.id,
          charge_id: parcela.charge_id,
          banco_tipo: banco.tipo_banco
        });

        const resultado = await BancoApiService.cancelarTitulo(parcela);
        if (!resultado.success) {
          logger.warning('Erro ao cancelar título no banco', {
            parcela_id: parcela.id,
            erro: resultado.message
          });
        }
      }

      await parcela.destroy();

      res.json({ success: true, message: 'Parcela excluída com sucesso!' });
    } catch (error: any) {
      logger.error('Erro ao deletar parcela', {
        parcela_id: req.params.id,
        error: error.message
      });
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * Atualizar parcela
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { data_vencimento, valor_parcela, observacoes } = req.body;

      logger.info('=== INÍCIO UPDATE PARCELA ===', {
        parcela_id: id,
        request_data: req.body,
        method: req.method,
        url: req.url
      });

      const parcela = await CarneParcela.findByPk(id, {
        include: [{ 
          association: 'carne', 
          include: [{ 
            association: 'banco',
            attributes: ['id', 'nome', 'codigo', 'client_id_producao', 'client_secret_producao']
          }] 
        }]
      });

      if (!parcela) {
        res.status(404).json({ error: 'Parcela não encontrada' });
        return;
      }

      const carne = await parcela.getCarne();
      const banco = await carne.getBanco();

      // Se o campo valor_parcela não foi enviado (carnê EFI), usar o valor atual
      const novoValorParcela = valor_parcela || parcela.valor_parcela;

      // Verificar se mudou a data de vencimento e se for Efí com carnê, alterar via API
      const novaDataVencimento = data_vencimento ? new Date(data_vencimento).toISOString().split('T')[0] : null;
      const dataVencimentoOriginal = new Date(parcela.data_vencimento).toISOString().split('T')[0];
      
      logger.info('Verificando alteração de vencimento', {
        parcela_id: parcela.id,
        data_original: dataVencimentoOriginal,
        data_nova: novaDataVencimento,
        mudou: novaDataVencimento !== dataVencimentoOriginal,
        banco: banco?.tipo_banco,
        carnet_id: carne.carnet_id
      });
      
      if (
        novaDataVencimento && 
        novaDataVencimento !== dataVencimentoOriginal &&
        banco && banco.tipo_banco === 'efi' &&
        carne.carnet_id && parcela.numero_parcela
      ) {
        logger.info('Alterando vencimento via API da EFI', {
          parcela_id: parcela.id,
          nova_data: novaDataVencimento
        });
        
        const resultado = await BancoApiService.alterarVencimentoParcelaCarne(parcela, novaDataVencimento);
        if (!resultado.success) {
          logger.error('Falha ao alterar vencimento na EFI', {
            parcela_id: parcela.id,
            erro: resultado.message || 'Erro desconhecido'
          });
          res.status(400).json({ 
            error: 'Falha ao alterar vencimento na Efí: ' + (resultado.message || 'Erro desconhecido')
          });
          return;
        }
      }

      // Atualizar dados locais
      const updateData: any = {
        data_vencimento: novaDataVencimento ? new Date(novaDataVencimento) : parcela.data_vencimento,
        valor_parcela: novoValorParcela,
        observacoes: observacoes || parcela.observacoes
      };

      // Se status foi enviado, atualizar
      if (req.body.status) {
        updateData.status = req.body.status;
        
        // Se for cancelado, cancelar na EFI também
        if (req.body.status === 'cancelado' && parcela.charge_id) {
          logger.info('Cancelando título na EFI', {
            parcela_id: parcela.id,
            charge_id: parcela.charge_id
          });
          
          const resultado = await BancoApiService.cancelarTitulo(parcela);
          if (!resultado.success) {
            logger.warn('Erro ao cancelar título na EFI', {
              parcela_id: parcela.id,
              erro: resultado.message
            });
          }
        }
      }

      await parcela.update(updateData);

      logger.info('Parcela atualizada com sucesso', {
        parcela_id: parcela.id,
        nova_data_vencimento: novaDataVencimento,
        novo_valor: novoValorParcela,
        novo_status: req.body.status
      });

      res.json({ success: true, message: 'Parcela atualizada com sucesso!' });
    } catch (error: any) {
      logger.error('Erro ao atualizar parcela', {
        parcela_id: req.params.id,
        error: error.message
      });
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async imprimirBoleto(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Importar o modelo Titulo
      const { Titulo } = await import('../models/Titulo');
      const { Cliente } = await import('../models/Cliente');
      const { Plano } = await import('../models/Plano');
      const { Banco } = await import('../models/Banco');
      
      const titulo = await Titulo.findByPk(id, {
        include: [
          { model: Cliente, as: 'cliente' },
          { model: Plano, as: 'plano' },
          { 
            model: Banco, 
            as: 'banco',
            attributes: ['id', 'nome', 'codigo', 'tipo_banco', 'client_id_producao', 'client_secret_producao', 'sandbox']
          }
        ],
      });

      if (!titulo) {
        res.status(404).json({ error: 'Título não encontrado' });
        return;
      }

      // Verificar se o boleto já foi registrado no banco
      if (!(titulo as any).charge_id) {
        console.log('Boleto não registrado no banco, registrando agora...');
        
        // Registrar boleto no banco via API
        const { BancoApiService } = await import('../services/BancoApiService');
        const resultado = await BancoApiService.gerarTitulo(titulo as any);
        
        if (resultado.success && resultado.data) {
          console.log('Boleto registrado no banco com sucesso:', resultado.data);
          
          // Atualizar título com dados do banco
          await titulo.update({
            charge_id: resultado.data.charge_id || null,
            codigo_barras: resultado.data.codigo_barras || null,
            linha_digitavel: resultado.data.linha_digitavel || null,
            url_boleto: resultado.data.url_boleto || null,
            qrcode: resultado.data.qrcode || null,
            qrcode_image: resultado.data.qrcode_image || null
          });
          
          // Recarregar título com dados atualizados
          await titulo.reload();
        } else {
          console.error('Erro ao registrar boleto no banco:', resultado.message);
          // Continuar mesmo se falhar no banco
        }
      }

      const dadosEmpresa = await DadosEmpresa.findOne();
      
      // Carregar templates HTML separados
      const templateTopoPath = path.join(__dirname, '../templates/boleto-topo-inner.html');
      const templateCorpoPath = path.join(__dirname, '../templates/boleto-corpo-inner.html');
      
      let templateTopo = fs.readFileSync(templateTopoPath, { encoding: 'utf8' });
      let templateCorpo = fs.readFileSync(templateCorpoPath, { encoding: 'utf8' });


      const generateBarcodeBase64 = (data: string) => {
        try {
          const canvas = createCanvas(400, 70);
          JsBarcode(canvas, data, {
            format: "CODE128",
            width: 3,
            height: 55,
            displayValue: false,
            background: "#ffffff",
            lineColor: "#000000"
          });
          return canvas.toDataURL('image/png');
        } catch (error) {
          console.error('Erro ao gerar código de barras:', error);
          return '';
        }
      };

      const qrCodeData = (titulo as any).qrcode_image || '';
      const barcodeData = generateBarcodeBase64((titulo as any).codigo_barras || titulo.id.toString());

      // Função para processar variáveis nas instruções
      const processarInstrucoes = (instrucao: string): string => {
        if (!instrucao) return '';
        
        let instrucaoProcessada = instrucao;
        
        // Substituir variáveis específicas do plano e cliente
        instrucaoProcessada = instrucaoProcessada.replace(/%nome_plano%/g, (titulo as any).plano?.nome_plano || '');
        instrucaoProcessada = instrucaoProcessada.replace(/%tipo_servico%/g, (titulo as any).plano?.tipo_servico || '');
        instrucaoProcessada = instrucaoProcessada.replace(/%quantidade_usuarios%/g, (titulo as any).plano?.quantidade_usuarios?.toString() || '');
        instrucaoProcessada = instrucaoProcessada.replace(/%valor_mensal%/g, (titulo as any).plano?.valor_mensal?.toString() || '');
        instrucaoProcessada = instrucaoProcessada.replace(/%periodicidade%/g, (titulo as any).plano?.periodicidade || '');
        instrucaoProcessada = instrucaoProcessada.replace(/%descricao%/g, (titulo as any).plano?.descricao || '');
        instrucaoProcessada = instrucaoProcessada.replace(/%razao_social%/g, (titulo as any).cliente?.razao_social || '');
        instrucaoProcessada = instrucaoProcessada.replace(/%nome_fantasia%/g, (titulo as any).cliente?.nome_fantasia || '');
        instrucaoProcessada = instrucaoProcessada.replace(/%cnpj%/g, (titulo as any).cliente?.cnpj || '');
        instrucaoProcessada = instrucaoProcessada.replace(/%email%/g, (titulo as any).cliente?.email || '');
        instrucaoProcessada = instrucaoProcessada.replace(/%telefone%/g, (titulo as any).cliente?.telefone || '');
        instrucaoProcessada = instrucaoProcessada.replace(/%whatsapp%/g, (titulo as any).cliente?.whatsapp || '');
        instrucaoProcessada = instrucaoProcessada.replace(/%endereco%/g, (titulo as any).cliente?.endereco || '');
        instrucaoProcessada = instrucaoProcessada.replace(/%numero%/g, (titulo as any).cliente?.numero || '');
        instrucaoProcessada = instrucaoProcessada.replace(/%complemento%/g, (titulo as any).cliente?.complemento || '');
        instrucaoProcessada = instrucaoProcessada.replace(/%bairro%/g, (titulo as any).cliente?.bairro || '');
        instrucaoProcessada = instrucaoProcessada.replace(/%cidade%/g, (titulo as any).cliente?.cidade || '');
        instrucaoProcessada = instrucaoProcessada.replace(/%estado%/g, (titulo as any).cliente?.estado || '');
        instrucaoProcessada = instrucaoProcessada.replace(/%cep%/g, (titulo as any).cliente?.cep || '');
        instrucaoProcessada = instrucaoProcessada.replace(/%observacoes%/g, (titulo as any).observacoes || '');
        
        return instrucaoProcessada;
      };

      // Gerar variáveis básicas
      const variables = {
        LOGOMARCA: dadosEmpresa?.logo ? dadosEmpresa.logo : `${process.env.BASE_URL}/images/bancos/boletoproprio.png`,
        LOGOBANCO: (titulo as any).banco?.tipo_banco ? `${process.env.BASE_URL}/images/bancos/${(titulo as any).banco.tipo_banco}.png` : `${process.env.BASE_URL}/images/bancos/boletoproprio.png`,
        CEDENTE: dadosEmpresa?.razao_social || '',
        EMPRESACPF: dadosEmpresa?.cnpj || '',
        EMPRESAENDERECO: dadosEmpresa?.endereco || '',
        EMPRESABAIRRO: dadosEmpresa?.bairro || '',
        EMPRESACEP: dadosEmpresa?.cep || '',
        EMPRESACIDADE: dadosEmpresa?.cidade || '',
        EMPRESAESTADO: dadosEmpresa?.estado || '',
        LOGOSVA: '',
        QUANTIDADE: '1',
        VALOR_UNITARIO: `R$ ${parseFloat((titulo as any).valor.toString()).toFixed(2).replace('.', ',')}`,
        NUMERO_DOCUMENTO: (titulo as any).numero_titulo || '',
        CODIGO_BANCO_COM_DV: (titulo as any).banco?.codigo_banco || (titulo as any).banco?.codigo || '237',
        LINHA_DIGITAVEL: (titulo as any).linha_digitavel || '12345.67890.12345.678901.23456.789012.3.45678901234567',
        LOCAL_PAGAMENTO: (titulo as any).banco?.local_pagamento || '',
        DATA_VENC: (() => {
          if (!(titulo as any).data_vencimento) return '';
          const dateStr = (titulo as any).data_vencimento instanceof Date 
            ? (titulo as any).data_vencimento.toISOString()
            : ((titulo as any).data_vencimento as any).toString();
          return dateStr.split('T')[0].split('-').reverse().join('/');
        })(),
        AGENCIA_CODIGO: (titulo as any).banco?.agencia_codigo || '',
        DATA_DOCUMENTO: (() => {
          if (!(titulo as any).created_at) return '';
          const dateStr = (titulo as any).created_at instanceof Date 
            ? (titulo as any).created_at.toISOString()
            : ((titulo as any).created_at as any).toString();
          return dateStr.split('T')[0].split('-').reverse().join('/');
        })(),
        ESPECIE_DOC: (titulo as any).banco?.especie_doc || '',
        DATA_PROC: (() => {
          if (!(titulo as any).created_at) return '';
          const dateStr = (titulo as any).created_at instanceof Date 
            ? (titulo as any).created_at.toISOString()
            : ((titulo as any).created_at as any).toString();
          return dateStr.split('T')[0].split('-').reverse().join('/');
        })(),
        NOSSO_NUMERO: titulo.id.toString(),
        CARTEIRA: (titulo as any).banco?.carteira || '',
        VAR_CARTEIRA: '',
        ESPECIE: (titulo as any).banco?.especie || '',
        VALOR_BOLETO: parseFloat((titulo as any).valor.toString()).toFixed(2).replace('.', ','),
        TEXTO_MULTAMORA: (titulo as any).banco?.texto_multamora || '',
        INSTRUCOES1: processarInstrucoes((titulo as any).banco?.instrucao_linha_1 || ''),
        INSTRUCOES2: processarInstrucoes((titulo as any).banco?.instrucao_linha_2 || ''),
        INSTRUCOES3: processarInstrucoes((titulo as any).banco?.instrucao_linha_3 || ''),
        INSTRUCOES4: processarInstrucoes((titulo as any).banco?.instrucao_linha_4 || ''),
        INSTRUCOES5: processarInstrucoes((titulo as any).banco?.instrucao_linha_5 || ''),
        QRCODE: qrCodeData,
        BOLETO_BARCODE2: `<div class="barcode-container" style="text-align: center; margin: 10px 0; padding: 5px;">
          <img src="${barcodeData}" 
               alt="Código de Barras" style="width: auto; height: 60px; max-width: 400px;" />
        </div>`,
        SACADO_IDNOME: (titulo as any).cliente?.razao_social || '',
        SACADO_ENDERECO: (titulo as any).cliente?.endereco || '',
        SACADO_COMPLEMENTO: (titulo as any).cliente?.complemento || '',
        SACADO_BAIRRO: (titulo as any).cliente?.bairro || '',
        SACADO_CEP: (titulo as any).cliente?.cep || '',
        SACADO_CIDADE: (titulo as any).cliente?.cidade || '',
        SACADO_ESTADO: (titulo as any).cliente?.estado || '',
        SACADO_CPF: (titulo as any).cliente?.cnpj || (titulo as any).cliente?.cpf || '',
        NOME_PLANO: (titulo as any).plano?.nome_plano || '',
        DESCRICAO_PLANO: (titulo as any).plano?.descricao || '',
        TIPO_SERVICO: (titulo as any).plano?.tipo_servico || '',
        QUANTIDADE_USUARIOS: (titulo as any).plano?.quantidade_usuarios?.toString() || '0',
        VALOR_PLANO: (titulo as any).plano?.valor_mensal ? parseFloat((titulo as any).plano.valor_mensal.toString()).toFixed(2).replace('.', ',') : '0,00',
        PERIODICIDADE: (titulo as any).plano?.periodicidade || '',
        MOVIMENTO: 'Valor do título',
        VALOR_COBRADO: parseFloat((titulo as any).valor.toString()).toFixed(2).replace('.', ','),
        TAXA_BOLETO: '0,00',
        MULTA_MORA: '0,00',
        DEMONSTRATIVO1: (titulo as any).banco?.demonstrativo1 || '',
        DEMONSTRATIVO2: (titulo as any).banco?.demonstrativo2 || '',
        DEMONSTRATIVO3: (titulo as any).banco?.demonstrativo3 || '',
        DEMONSTRATIVO4: (titulo as any).banco?.demonstrativo4 || '',
        SACADO_NOME: (titulo as any).cliente?.razao_social || '',
        TIPO_PSACADO: (titulo as any).cliente?.cnpj ? 'CNPJ' : 'CPF'
      };

      // Substituir variáveis nos templates - abordagem mais simples
      templateTopo = templateTopo.replace(/\{\{DATA_PROC\}\}/g, variables.DATA_PROC);
      templateTopo = templateTopo.replace(/\{\{DATA_VENC\}\}/g, variables.DATA_VENC);
      templateTopo = templateTopo.replace(/\{\{DATA_DOCUMENTO\}\}/g, variables.DATA_DOCUMENTO);
      
      // Substituir especificamente as variáveis do plano no template do topo PRIMEIRO
      
      templateTopo = templateTopo.replace(/\{\{NOME_PLANO\}\}/g, variables.NOME_PLANO);
      templateTopo = templateTopo.replace(/\{\{DESCRICAO_PLANO\}\}/g, variables.DESCRICAO_PLANO);
      templateTopo = templateTopo.replace(/\{\{TIPO_SERVICO\}\}/g, variables.TIPO_SERVICO);
      templateTopo = templateTopo.replace(/\{\{QUANTIDADE_USUARIOS\}\}/g, variables.QUANTIDADE_USUARIOS);
      templateTopo = templateTopo.replace(/\{\{VALOR_PLANO\}\}/g, variables.VALOR_PLANO);
      templateTopo = templateTopo.replace(/\{\{PERIODICIDADE\}\}/g, variables.PERIODICIDADE);
      
      // Substituir outras variáveis
      Object.entries(variables).forEach(([key, value]) => {
        if (!['DATA_PROC', 'DATA_VENC', 'DATA_DOCUMENTO'].includes(key)) {
          templateTopo = templateTopo.replace(new RegExp(`{{${key}}}`, 'g'), value);
          templateCorpo = templateCorpo.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }
      });
      
      // Substituir variáveis no corpo
      templateCorpo = templateCorpo.replace(/\{\{DATA_VENC\}\}/g, variables.DATA_VENC);
      templateCorpo = templateCorpo.replace(/\{\{DATA_DOCUMENTO\}\}/g, variables.DATA_DOCUMENTO);
      templateCorpo = templateCorpo.replace(/\{\{DATA_PROC\}\}/g, variables.DATA_PROC);

      // Combinar os templates com estrutura HTML completa
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Boleto - Título ${titulo.id}</title>
            <style>
                @page {
                    size: A4;
                    margin: 3mm;
                }
                body {
                    margin: 0;
                    padding: 0;
                    font-family: Arial, sans-serif;
                    background: #fff;
                    color: #000;
                }
                .boleto-topo {
                    margin-bottom: 2px;
                }
                .boleto-corpo {
                    margin-bottom: 1px;
                    page-break-inside: avoid;
                }
                .boleto-corpo:last-child {
                    margin-bottom: 0;
                }
                .separador {
                    width: 100%;
                    margin: 0;
                    border-top: 1px dashed #999;
                    padding: 0;
                    height: 1px;
                    box-sizing: border-box;
                    position: relative;
                    z-index: 10;
                }
            </style>
        </head>
        <body>
            <div class="boleto-topo">${templateTopo}</div>
            <div class="boleto-corpo">${templateCorpo}</div>
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(htmlContent);

    } catch (error: any) {
      console.error('Erro ao imprimir boleto:', error);
      logger.error('Erro ao imprimir boleto', { 
        titulo_id: req.params.id, 
        error: error.message,
        stack: error.stack 
      });
      res.status(500).json({ error: 'Erro interno do servidor', message: error.message });
    }
  }

  private static formatarData(data: string | Date): string {
    const dataObj = new Date(data);
    const dia = dataObj.getDate().toString().padStart(2, '0');
    const mes = (dataObj.getMonth() + 1).toString().padStart(2, '0');
    const ano = dataObj.getFullYear();
    return `${dia}/${mes}/${ano}`;
  }
}
