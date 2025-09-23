import { Request, Response } from 'express';
import { CarneParcela } from '../models/CarneParcela';
import { DadosEmpresa } from '../models/DadosEmpresa';
import { Op } from 'sequelize';
import fs from 'fs';
import path from 'path';
import JsBarcode from 'jsbarcode';
import { createCanvas } from 'canvas';
import QRCode from 'qrcode';

export class CarneParcelaController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const { carne_id, search, status, page = 1, limit = 10 } = req.query;

      const where: any = {};
      
      if (carne_id) {
        where.carne_id = carne_id;
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
              { association: 'banco' }
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
              { association: 'banco' }
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

      const parcela = await CarneParcela.findByPk(id);
      if (!parcela) {
        res.status(404).json({ error: 'Parcela não encontrada' });
        return;
      }

      await parcela.update({
        data_pagamento: data_pagamento || new Date(),
        valor_pago: valor_pago || parcela.valor_parcela,
        observacoes: observacoes || '',
        status: 'pago'
      });

      res.json({ success: true, message: 'Parcela marcada como paga' });
    } catch (error) {
      console.error('Erro ao marcar parcela como paga:', error);
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
        data_pagamento: null,
        valor_pago: null,
        observacoes: '',
        status: 'pendente'
      });

      res.json({ success: true, message: 'Parcela desmarcada como paga' });
    } catch (error) {
      console.error('Erro ao desmarcar parcela como paga:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const parcela = await CarneParcela.findByPk(id);
      if (!parcela) {
        res.status(404).json({ error: 'Parcela não encontrada' });
        return;
      }

      await parcela.update(updateData);

      res.json({ success: true, message: 'Parcela atualizada com sucesso' });
    } catch (error) {
      console.error('Erro ao atualizar parcela:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async imprimirBoleto(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const parcela = await CarneParcela.findByPk(id, {
        include: [{ association: 'carne', include: ['cliente', 'plano', 'banco'] }],
      });

      if (!parcela) {
        res.status(404).json({ error: 'Parcela não encontrada' });
        return;
      }

      const formatMoney = (value: number) => {
        return value.toFixed(2).replace('.', ',');
      };

      const safe = (value: any, fallback = '') => {
        return value !== null && value !== '' ? value : fallback;
      };

      // Função para calcular fator de vencimento (dias desde 07/10/1997)
      const calculateFatorVencimento = (dataVencimento: string) => {
        const dataBase = new Date('1997-10-07');
        const dataVenc = new Date(dataVencimento);
        const diffTime = dataVenc.getTime() - dataBase.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays.toString().padStart(4, '0');
      };

      // Função para calcular dígito verificador módulo 10
      const calculateDV = (campo: string) => {
        const multiplicadores = [2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1];
        let soma = 0;
        
        for (let i = 0; i < campo.length && i < multiplicadores.length; i++) {
          const digito = parseInt(campo[i]);
          if (isNaN(digito)) continue;
          
          const produto = digito * multiplicadores[i];
          soma += produto > 9 ? Math.floor(produto / 10) + (produto % 10) : produto;
        }
        
        const resto = soma % 10;
        return resto === 0 ? 0 : 10 - resto;
      };

      // Função para gerar Nosso Número realista
      const generateNossoNumero = (parcela: any) => {
        const banco = (parcela as any).carne?.banco;
        const codigoBanco = banco?.codigo && banco.codigo.trim() !== '' ? banco.codigo : '000';
        const parcelaId = parcela.id.toString().padStart(8, '0');
        const carneId = (parcela as any).carne?.id?.toString().padStart(4, '0') || '0000';
        
        // Formato: Código do Banco + ID do Carnê + ID da Parcela + DV
        const baseNumber = `${codigoBanco}${carneId}${parcelaId}`;
        
        // Calcular dígito verificador simples (soma dos dígitos módulo 10)
        const soma = baseNumber.split('').reduce((acc, digit) => acc + parseInt(digit), 0);
        const dv = soma % 10;
        
        return `${baseNumber}${dv}`;
      };

      // Função para gerar código de barras realista (FEBRABAN)
      const generateCodigoBarras = (parcela: any) => {
        const banco = (parcela as any).carne?.banco;
        const codigoBanco = banco?.codigo && banco.codigo.trim() !== '' ? banco.codigo : '000';
        const moeda = '9'; // Real
        const fatorVencimento = calculateFatorVencimento(parcela.data_vencimento);
        const valor = parseFloat(parcela.valor_parcela.toString()).toFixed(2).replace('.', '').padStart(10, '0');
        const nossoNumero = generateNossoNumero(parcela);
        
        // Usar dados reais do banco quando disponíveis
        const identificadorConta = banco?.identificador_conta && banco.identificador_conta.trim() !== '' 
          ? banco.identificador_conta.substring(0, 8) 
          : parcela.id.toString().padStart(8, '0');
        
        // Formato: banco + moeda + fator vencimento + valor + identificador conta + nosso número (primeiros 8)
        const codigoCompleto = `${codigoBanco}${moeda}${fatorVencimento}${valor}${identificadorConta}${nossoNumero.substring(0, 8)}`;
        
        return codigoCompleto;
      };

      // Função para gerar linha digitável no formato FEBRABAN
      const generateLinhaDigitavel = (parcela: any) => {
        const codigoBarras = generateCodigoBarras(parcela);
        const banco = (parcela as any).carne?.banco;
        const codigoBanco = banco?.codigo && banco.codigo.trim() !== '' ? banco.codigo : '000';
        
        // Garantir que o código de barras tenha pelo menos 44 caracteres
        const codigoCompleto = codigoBarras.padEnd(44, '0');
        
        // Formato: 00000.00000 00000.000000 00000.000000 0 00000000000000
        // Campo 1: Posições 1-3 (código banco) + 4 (moeda) + 5-9 (posições 1-5 do código de barras)
        const campo1 = `${codigoBanco}9${codigoCompleto.substring(4, 9)}`.padEnd(10, '0');
        const dv1 = calculateDV(campo1);
        
        // Campo 2: Posições 10-20 do código de barras
        const campo2 = codigoCompleto.substring(9, 20).padEnd(11, '0');
        const dv2 = calculateDV(campo2);
        
        // Campo 3: Posições 21-31 do código de barras
        const campo3 = codigoCompleto.substring(20, 31).padEnd(11, '0');
        const dv3 = calculateDV(campo3);
        
        // Campo 4: DV geral (posição 4 do código de barras)
        const dvGeral = codigoCompleto.substring(3, 4);
        
        // Campo 5: Fator vencimento + valor
        const fatorVencimento = calculateFatorVencimento(parcela.data_vencimento);
        const valor = parseFloat(parcela.valor_parcela.toString()).toFixed(2).replace('.', '').padStart(10, '0');
        const campo5 = `${fatorVencimento}${valor}`;
        
        return `${campo1.substring(0, 5)}.${campo1.substring(5)}${dv1} ${campo2.substring(0, 5)}.${campo2.substring(5)}${dv2} ${campo3.substring(0, 5)}.${campo3.substring(5)}${dv3} ${dvGeral} ${campo5}`;
      };

      // Função para gerar código de barras como base64
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

      // Função para gerar QR Code usando biblioteca local
      const generateQRCodeBase64 = async (data: string) => {
        try {
          const qrCodeDataURL = await QRCode.toDataURL(data, {
            width: 100,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          return qrCodeDataURL;
        } catch (error) {
          console.error('Erro ao gerar QR Code:', error);
          return '';
        }
      };

      // Função para gerar QR Code com dados estruturados do PIX
      const generateQRCode = async (parcela: any) => {
        const banco = (parcela as any).carne?.banco;
        const dadosEmpresa = (parcela as any).carne?.cliente;
        
        // Dados para PIX (formato simplificado)
        const pixData = {
          chave: banco?.chave_pix || dadosEmpresa?.email || dadosEmpresa?.cnpj || dadosEmpresa?.cpf,
          valor: parseFloat(parcela.valor_parcela.toString()).toFixed(2),
          descricao: `Parcela ${parcela.numero_parcela} - ${(parcela as any).carne?.plano?.nome_plano || 'Serviço'}`,
          beneficiario: dadosEmpresa?.razao_social || 'Empresa',
          cidade: dadosEmpresa?.cidade || 'São Paulo',
          identificador: parcela.id.toString(),
          nossoNumero: generateNossoNumero(parcela),
          linhaDigitavel: generateLinhaDigitavel(parcela)
        };
        
        const qrString = JSON.stringify(pixData);
        return await generateQRCodeBase64(qrString);
      };

      // Buscar dados da empresa
      const dadosEmpresa = await DadosEmpresa.findOne();
      
      // Carregar template HTML
      const templatePath = path.join(__dirname, '../templates/boleto.html');
      let template = fs.readFileSync(templatePath, { encoding: 'utf8' });

      // Substituir variáveis no template (usando as mesmas variáveis do PHP)
      const variables = {
        // Dados da empresa (usando variáveis do sistema PHP)
        // Logo da empresa (para o topo do boleto)
        LOGOMARCA: (() => {
          if (dadosEmpresa?.logo) {
            // Se já tem URL completa, usar como está
            if (dadosEmpresa.logo.startsWith('http')) {
              return dadosEmpresa.logo;
            }
            // Se é só o nome do arquivo, construir o caminho
            return `/uploads/empresa/${dadosEmpresa.logo}`;
          }
          // Se não tem logo da empresa, usar logo própria
          return `/images/bancos/boletoproprio.png`;
        })(),
        
        // Logo do banco (para a área de autenticação bancária)
        LOGOBANCO: (() => {
          const banco = (parcela as any).carne?.banco;
          
          // Se tem banco específico, usar logo do banco
          if (banco?.tipo_banco) {
            return `/images/bancos/${banco.tipo_banco}.png`;
          }
          
          // Se não tem banco específico, usar logo própria
          return `/images/bancos/boletoproprio.png`;
        })(),
        
        // Logo SVA (Sistema de Valores a Receber) - geralmente vazio
        LOGOSVA: '',
        
        // Quantidade e valor unitário
        QUANTIDADE: '1',
        VALOR_UNITARIO: `R$ ${parseFloat(parcela.valor_parcela.toString()).toFixed(2).replace('.', ',')},`,
        CEDENTE: safe(dadosEmpresa?.razao_social, ''),
        EMPRESACPF: safe(dadosEmpresa?.cnpj, ''),
        EMPRESAENDERECO: safe(dadosEmpresa?.endereco, ''),
        EMPRESABAIRRO: safe(dadosEmpresa?.bairro, ''),
        EMPRESACEP: safe(dadosEmpresa?.cep, ''),
        EMPRESACIDADE: safe(dadosEmpresa?.cidade, ''),
        EMPRESAESTADO: safe(dadosEmpresa?.estado, ''),

        // Dados do título/documento
        NUMERO_DOCUMENTO: parcela.id.toString(),
        TITULONN: parcela.id.toString(),
        DATA_ORIGINAL: new Date(parcela.data_vencimento).toLocaleDateString('pt-BR'),
        DATA_PROC: new Date().toLocaleDateString('pt-BR'),

        // Dados do sacado/cliente
        SACADO_IDNOME: safe((parcela as any).carne?.cliente?.razao_social),
        SACADO_ENDERECO: safe((parcela as any).carne?.cliente?.endereco),
        SACADO_COMPLEMENTO: safe((parcela as any).carne?.cliente?.complemento),
        SACADO_BAIRRO: safe((parcela as any).carne?.cliente?.bairro),
        SACADO_CEP: safe((parcela as any).carne?.cliente?.cep),
        SACADO_CIDADE: safe((parcela as any).carne?.cliente?.cidade),
        SACADO_ESTADO: safe((parcela as any).carne?.cliente?.estado),
        SACADO_CPF: safe((parcela as any).carne?.cliente?.cnpj || (parcela as any).carne?.cliente?.cpf),

        // Movimentações financeiras
        MOVIMENTO: `Parcela ${parcela.numero_parcela} - ${(parcela as any).carne?.plano?.nome_plano || 'Serviço'}`,
        VALOR_COBRADO: `R$ ${formatMoney(parseFloat(parcela.valor_parcela.toString()))}`,
        TAXA_BOLETO: (parcela as any).carne?.banco?.incluir_taxa && (parcela as any).carne?.banco?.taxa_cobranca 
          ? `R$ ${formatMoney((parcela as any).carne?.banco?.taxa_cobranca)}` 
          : 'R$ 0,00',
        MULTA_MORA: (parcela as any).carne?.banco?.percentual_multa 
          ? `R$ ${formatMoney(parseFloat(parcela.valor_parcela.toString()) * ((parcela as any).carne?.banco?.percentual_multa / 100))}` 
          : 'R$ 0,00',
        VALOR_BOLETO: `R$ ${formatMoney(parseFloat(parcela.valor_parcela.toString()))}`,

        // Demonstrativo (dados reais do banco)
        DEMONSTRATIVO1: safe((parcela as any).carne?.banco?.observacao_linha_1 || `Parcela ${parcela.numero_parcela} de ${(parcela as any).carne?.quantidade_parcelas} do Carnê ${(parcela as any).carne?.numero_carne}`),
        DEMONSTRATIVO2: safe((parcela as any).carne?.banco?.observacao_linha_2 || `Cliente: ${safe((parcela as any).carne?.cliente?.razao_social)}`),
        DEMONSTRATIVO3: safe((parcela as any).carne?.banco?.observacao_linha_3 || `Plano: ${safe((parcela as any).carne?.plano?.nome_plano)}`),
        DEMONSTRATIVO4: safe((parcela as any).carne?.banco?.observacao_linha_4 || ''),

        // Dados do boleto bancário
        CODIGO_BANCO_COM_DV: safe((parcela as any).carne?.banco?.codigo && (parcela as any).carne?.banco?.codigo.trim() !== '' ? (parcela as any).carne?.banco?.codigo : '000'),
        LINHA_DIGITAVEL: parcela.linha_digitavel || generateLinhaDigitavel(parcela),
        LOCAL_PAGAMENTO: safe((parcela as any).carne?.banco?.local_pagamento || ''),
        DATA_VENC: new Date(parcela.data_vencimento).toLocaleDateString('pt-BR'),
        AGENCIA_CODIGO: safe((parcela as any).carne?.banco?.identificador_conta || ''),
        DATA_DOCUMENTO: new Date(parcela.created_at).toLocaleDateString('pt-BR'),
        ESPECIE_DOC: 'DM',
        NOSSO_NUMERO: generateNossoNumero(parcela),
        CARTEIRA: '',
        VAR_CARTEIRA: '',
        ESPECIE: 'R$',

        // Instruções (dados reais do banco)
        TEXTO_MULTAMORA: (parcela as any).carne?.banco?.percentual_multa 
          ? `Multa de ${(parcela as any).carne?.banco?.percentual_multa}% sobre o valor em atraso` 
          : '',
        INSTRUCOES1: safe((parcela as any).carne?.banco?.instrucao_linha_1 || ''),
        INSTRUCOES2: safe((parcela as any).carne?.banco?.instrucao_linha_2 || ''),
        INSTRUCOES3: safe((parcela as any).carne?.banco?.instrucao_linha_3 || ''),
        INSTRUCOES4: safe((parcela as any).carne?.banco?.instrucao_linha_4 || ''),
        INSTRUCOES5: safe((parcela as any).carne?.banco?.instrucao_linha_5 || ''),

        // QR Code e código de barras (usando dados do banco)
        QRCODE: parcela.qrcode_image || parcela.qrcode || await generateQRCode(parcela),
        BOLETO_BARCODE2: `<div class="barcode-container" style="text-align: center; margin: 10px 0; padding: 5px;">
          <img src="${generateBarcodeBase64(parcela.codigo_barras || generateCodigoBarras(parcela))}" 
               alt="Código de Barras" style="width: auto; height: 60px; max-width: 400px;" />
        </div>`,

        // Dados do pagador
        SACADO_NOME: safe((parcela as any).carne?.cliente?.razao_social),
        TIPO_PSACADO: (parcela as any).carne?.cliente?.cnpj ? 'CNPJ' : 'CPF'
      };

      // Substituir todas as variáveis no template
      Object.entries(variables).forEach(([key, value]) => {
        template = template.replace(new RegExp(`{{${key}}}`, 'g'), value);
      });

      const htmlContent = template;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(htmlContent);
    } catch (error) {
      console.error('Erro ao imprimir boleto:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async gerarPdfBoleto(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const parcela = await CarneParcela.findByPk(id, {
        include: [
          {
            association: 'carne',
            include: [
              { association: 'cliente' },
              { association: 'plano' },
              { association: 'banco' }
            ]
          }
        ]
      });

      if (!parcela) {
        res.status(404).json({ error: 'Parcela não encontrada' });
        return;
      }

      const formatMoney = (value: number) => {
        return value.toFixed(2).replace('.', ',');
      };

      const safe = (value: any, fallback = '') => {
        return value !== null && value !== '' ? value : fallback;
      };

      // Função para calcular fator de vencimento (dias desde 07/10/1997)
      const calculateFatorVencimento = (dataVencimento: string) => {
        const dataBase = new Date('1997-10-07');
        const dataVenc = new Date(dataVencimento);
        const diffTime = dataVenc.getTime() - dataBase.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays.toString().padStart(4, '0');
      };

      // Função para calcular dígito verificador módulo 10
      const calculateDV = (campo: string) => {
        const multiplicadores = [2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1];
        let soma = 0;
        
        for (let i = 0; i < campo.length && i < multiplicadores.length; i++) {
          const digito = parseInt(campo[i]);
          if (isNaN(digito)) continue;
          
          const produto = digito * multiplicadores[i];
          soma += produto > 9 ? Math.floor(produto / 10) + (produto % 10) : produto;
        }
        
        const resto = soma % 10;
        return resto === 0 ? 0 : 10 - resto;
      };

      // Função para gerar Nosso Número realista
      const generateNossoNumero = (parcela: any) => {
        const banco = (parcela as any).carne?.banco;
        const codigoBanco = banco?.codigo && banco.codigo.trim() !== '' ? banco.codigo : '000';
        const parcelaId = parcela.id.toString().padStart(8, '0');
        const carneId = (parcela as any).carne?.id?.toString().padStart(4, '0') || '0000';
        
        // Formato: Código do Banco + ID do Carnê + ID da Parcela + DV
        const baseNumber = `${codigoBanco}${carneId}${parcelaId}`;
        
        // Calcular dígito verificador simples (soma dos dígitos módulo 10)
        const soma = baseNumber.split('').reduce((acc, digit) => acc + parseInt(digit), 0);
        const dv = soma % 10;
        
        return `${baseNumber}${dv}`;
      };

      // Função para gerar código de barras realista (FEBRABAN)
      const generateCodigoBarras = (parcela: any) => {
        const banco = (parcela as any).carne?.banco;
        const codigoBanco = banco?.codigo && banco.codigo.trim() !== '' ? banco.codigo : '000';
        const moeda = '9'; // Real
        const fatorVencimento = calculateFatorVencimento(parcela.data_vencimento);
        const valor = parseFloat(parcela.valor_parcela.toString()).toFixed(2).replace('.', '').padStart(10, '0');
        const nossoNumero = generateNossoNumero(parcela);
        
        // Usar dados reais do banco quando disponíveis
        const identificadorConta = banco?.identificador_conta && banco.identificador_conta.trim() !== '' 
          ? banco.identificador_conta.substring(0, 8) 
          : parcela.id.toString().padStart(8, '0');
        
        // Formato: banco + moeda + fator vencimento + valor + identificador conta + nosso número (primeiros 8)
        const codigoCompleto = `${codigoBanco}${moeda}${fatorVencimento}${valor}${identificadorConta}${nossoNumero.substring(0, 8)}`;
        
        return codigoCompleto;
      };

      // Função para gerar linha digitável no formato FEBRABAN
      const generateLinhaDigitavel = (parcela: any) => {
        const codigoBarras = generateCodigoBarras(parcela);
        const banco = (parcela as any).carne?.banco;
        const codigoBanco = banco?.codigo && banco.codigo.trim() !== '' ? banco.codigo : '000';
        
        // Garantir que o código de barras tenha pelo menos 44 caracteres
        const codigoCompleto = codigoBarras.padEnd(44, '0');
        
        // Formato: 00000.00000 00000.000000 00000.000000 0 00000000000000
        // Campo 1: Posições 1-3 (código banco) + 4 (moeda) + 5-9 (posições 1-5 do código de barras)
        const campo1 = `${codigoBanco}9${codigoCompleto.substring(4, 9)}`.padEnd(10, '0');
        const dv1 = calculateDV(campo1);
        
        // Campo 2: Posições 10-20 do código de barras
        const campo2 = codigoCompleto.substring(9, 20).padEnd(11, '0');
        const dv2 = calculateDV(campo2);
        
        // Campo 3: Posições 21-31 do código de barras
        const campo3 = codigoCompleto.substring(20, 31).padEnd(11, '0');
        const dv3 = calculateDV(campo3);
        
        // Campo 4: DV geral (posição 4 do código de barras)
        const dvGeral = codigoCompleto.substring(3, 4);
        
        // Campo 5: Fator vencimento + valor
        const fatorVencimento = calculateFatorVencimento(parcela.data_vencimento);
        const valor = parseFloat(parcela.valor_parcela.toString()).toFixed(2).replace('.', '').padStart(10, '0');
        const campo5 = `${fatorVencimento}${valor}`;
        
        return `${campo1.substring(0, 5)}.${campo1.substring(5)}${dv1} ${campo2.substring(0, 5)}.${campo2.substring(5)}${dv2} ${campo3.substring(0, 5)}.${campo3.substring(5)}${dv3} ${dvGeral} ${campo5}`;
      };

      // Função para gerar código de barras como base64
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

      // Função para gerar QR Code usando biblioteca local
      const generateQRCodeBase64 = async (data: string) => {
        try {
          const qrCodeDataURL = await QRCode.toDataURL(data, {
            width: 100,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          return qrCodeDataURL;
        } catch (error) {
          console.error('Erro ao gerar QR Code:', error);
          return '';
        }
      };

      // Função para gerar QR Code com dados estruturados do PIX
      const generateQRCode = async (parcela: any) => {
        const banco = (parcela as any).carne?.banco;
        const dadosEmpresa = (parcela as any).carne?.cliente;
        
        // Dados para PIX (formato simplificado)
        const pixData = {
          chave: banco?.chave_pix || dadosEmpresa?.email || dadosEmpresa?.cnpj || dadosEmpresa?.cpf,
          valor: parseFloat(parcela.valor_parcela.toString()).toFixed(2),
          descricao: `Parcela ${parcela.numero_parcela} - ${(parcela as any).carne?.plano?.nome_plano || 'Serviço'}`,
          beneficiario: dadosEmpresa?.razao_social || 'Empresa',
          cidade: dadosEmpresa?.cidade || 'São Paulo',
          identificador: parcela.id.toString(),
          nossoNumero: generateNossoNumero(parcela),
          linhaDigitavel: generateLinhaDigitavel(parcela)
        };
        
        const qrString = JSON.stringify(pixData);
        return await generateQRCodeBase64(qrString);
      };

      // Buscar dados da empresa
      const dadosEmpresa = await DadosEmpresa.findOne();
      
      // Carregar template HTML
      const templatePath = path.join(__dirname, '../templates/boleto.html');
      let template = fs.readFileSync(templatePath, { encoding: 'utf8' });

      // Substituir variáveis no template (usando as mesmas variáveis do PHP)
      const variables = {
        // Dados da empresa (usando variáveis do sistema PHP)
        // Logo da empresa (para o topo do boleto)
        LOGOMARCA: (() => {
          if (dadosEmpresa?.logo) {
            // Se já tem URL completa, usar como está
            if (dadosEmpresa.logo.startsWith('http')) {
              return dadosEmpresa.logo;
            }
            // Se é só o nome do arquivo, construir o caminho
            return `/uploads/empresa/${dadosEmpresa.logo}`;
          }
          // Se não tem logo da empresa, usar logo própria
          return `/images/bancos/boletoproprio.png`;
        })(),
        
        // Logo do banco (para a área de autenticação bancária)
        LOGOBANCO: (() => {
          const banco = (parcela as any).carne?.banco;
          
          // Se tem banco específico, usar logo do banco
          if (banco?.tipo_banco) {
            return `/images/bancos/${banco.tipo_banco}.png`;
          }
          
          // Se não tem banco específico, usar logo própria
          return `/images/bancos/boletoproprio.png`;
        })(),
        
        // Logo SVA (Sistema de Valores a Receber) - geralmente vazio
        LOGOSVA: '',
        
        // Quantidade e valor unitário
        QUANTIDADE: '1',
        VALOR_UNITARIO: `R$ ${parseFloat(parcela.valor_parcela.toString()).toFixed(2).replace('.', ',')},`,
        CEDENTE: safe(dadosEmpresa?.razao_social, ''),
        EMPRESACPF: safe(dadosEmpresa?.cnpj, ''),
        EMPRESAENDERECO: safe(dadosEmpresa?.endereco, ''),
        EMPRESABAIRRO: safe(dadosEmpresa?.bairro, ''),
        EMPRESACEP: safe(dadosEmpresa?.cep, ''),
        EMPRESACIDADE: safe(dadosEmpresa?.cidade, ''),
        EMPRESAESTADO: safe(dadosEmpresa?.estado, ''),

        // Dados do título/documento
        NUMERO_DOCUMENTO: parcela.id.toString(),
        TITULONN: parcela.id.toString(),
        DATA_ORIGINAL: new Date(parcela.data_vencimento).toLocaleDateString('pt-BR'),
        DATA_PROC: new Date().toLocaleDateString('pt-BR'),

        // Dados do sacado/cliente
        SACADO_IDNOME: safe((parcela as any).carne?.cliente?.razao_social),
        SACADO_ENDERECO: safe((parcela as any).carne?.cliente?.endereco),
        SACADO_COMPLEMENTO: safe((parcela as any).carne?.cliente?.complemento),
        SACADO_BAIRRO: safe((parcela as any).carne?.cliente?.bairro),
        SACADO_CEP: safe((parcela as any).carne?.cliente?.cep),
        SACADO_CIDADE: safe((parcela as any).carne?.cliente?.cidade),
        SACADO_ESTADO: safe((parcela as any).carne?.cliente?.estado),
        SACADO_CPF: safe((parcela as any).carne?.cliente?.cnpj || (parcela as any).carne?.cliente?.cpf),

        // Movimentações financeiras
        MOVIMENTO: `Parcela ${parcela.numero_parcela} - ${(parcela as any).carne?.plano?.nome_plano || 'Serviço'}`,
        VALOR_COBRADO: `R$ ${formatMoney(parseFloat(parcela.valor_parcela.toString()))}`,
        TAXA_BOLETO: (parcela as any).carne?.banco?.incluir_taxa && (parcela as any).carne?.banco?.taxa_cobranca 
          ? `R$ ${formatMoney((parcela as any).carne?.banco?.taxa_cobranca)}` 
          : 'R$ 0,00',
        MULTA_MORA: (parcela as any).carne?.banco?.percentual_multa 
          ? `R$ ${formatMoney(parseFloat(parcela.valor_parcela.toString()) * ((parcela as any).carne?.banco?.percentual_multa / 100))}` 
          : 'R$ 0,00',
        VALOR_BOLETO: `R$ ${formatMoney(parseFloat(parcela.valor_parcela.toString()))}`,

        // Demonstrativo (dados reais do banco)
        DEMONSTRATIVO1: safe((parcela as any).carne?.banco?.observacao_linha_1 || `Parcela ${parcela.numero_parcela} de ${(parcela as any).carne?.quantidade_parcelas} do Carnê ${(parcela as any).carne?.numero_carne}`),
        DEMONSTRATIVO2: safe((parcela as any).carne?.banco?.observacao_linha_2 || `Cliente: ${safe((parcela as any).carne?.cliente?.razao_social)}`),
        DEMONSTRATIVO3: safe((parcela as any).carne?.banco?.observacao_linha_3 || `Plano: ${safe((parcela as any).carne?.plano?.nome_plano)}`),
        DEMONSTRATIVO4: safe((parcela as any).carne?.banco?.observacao_linha_4 || ''),

        // Dados do boleto bancário
        CODIGO_BANCO_COM_DV: safe((parcela as any).carne?.banco?.codigo && (parcela as any).carne?.banco?.codigo.trim() !== '' ? (parcela as any).carne?.banco?.codigo : '000'),
        LINHA_DIGITAVEL: parcela.linha_digitavel || generateLinhaDigitavel(parcela),
        LOCAL_PAGAMENTO: safe((parcela as any).carne?.banco?.local_pagamento || ''),
        DATA_VENC: new Date(parcela.data_vencimento).toLocaleDateString('pt-BR'),
        AGENCIA_CODIGO: safe((parcela as any).carne?.banco?.identificador_conta || ''),
        DATA_DOCUMENTO: new Date(parcela.created_at).toLocaleDateString('pt-BR'),
        ESPECIE_DOC: 'DM',
        NOSSO_NUMERO: generateNossoNumero(parcela),
        CARTEIRA: '',
        VAR_CARTEIRA: '',
        ESPECIE: 'R$',

        // Instruções (dados reais do banco)
        TEXTO_MULTAMORA: (parcela as any).carne?.banco?.percentual_multa 
          ? `Multa de ${(parcela as any).carne?.banco?.percentual_multa}% sobre o valor em atraso` 
          : '',
        INSTRUCOES1: safe((parcela as any).carne?.banco?.instrucao_linha_1 || ''),
        INSTRUCOES2: safe((parcela as any).carne?.banco?.instrucao_linha_2 || ''),
        INSTRUCOES3: safe((parcela as any).carne?.banco?.instrucao_linha_3 || ''),
        INSTRUCOES4: safe((parcela as any).carne?.banco?.instrucao_linha_4 || ''),
        INSTRUCOES5: safe((parcela as any).carne?.banco?.instrucao_linha_5 || ''),

        // QR Code e código de barras (usando dados do banco)
        QRCODE: parcela.qrcode_image || parcela.qrcode || await generateQRCode(parcela),
        BOLETO_BARCODE2: `<div class="barcode-container" style="text-align: center; margin: 10px 0; padding: 5px;">
          <img src="${generateBarcodeBase64(parcela.codigo_barras || generateCodigoBarras(parcela))}" 
               alt="Código de Barras" style="width: auto; height: 60px; max-width: 400px;" />
        </div>`,

        // Dados do pagador
        SACADO_NOME: safe((parcela as any).carne?.cliente?.razao_social),
        TIPO_PSACADO: (parcela as any).carne?.cliente?.cnpj ? 'CNPJ' : 'CPF'
      };

      // Substituir todas as variáveis no template
      Object.entries(variables).forEach(([key, value]) => {
        template = template.replace(new RegExp(`{{${key}}}`, 'g'), value);
      });

      const htmlContent = template;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(htmlContent);
    } catch (error) {
      console.error('Erro ao gerar PDF do boleto:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}
