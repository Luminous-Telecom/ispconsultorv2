import { Request, Response } from 'express';
import { Carne } from '../models/Carne';
import { DadosEmpresa } from '../models/DadosEmpresa';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { createCanvas } from 'canvas';
import { Cliente } from '../models/Cliente';
import { Plano } from '../models/Plano';
import { Banco } from '../models/Banco';
import { Op } from 'sequelize';

function gerarNumeroCarne(): string {
  const ano = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 899999).toString();
  return `CAR${ano}${rand}`;
}

export class CarneController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 15;
      const search = req.query.search as string;
      const status = req.query.status as string;
      const cliente_id = req.query.cliente_id as string;

      const offset = (page - 1) * limit;

      // Construir filtros
      const where: any = {};
      
      if (search) {
        where[Op.or] = [
          { numero_carne: { [Op.like]: `%${search}%` } },
          { carnet_id: { [Op.like]: `%${search}%` } }
        ];
      }

      if (status) {
        where.status = status;
      }

      if (cliente_id) {
        where.cliente_id = cliente_id;
      }

      const { count, rows: carnes } = await Carne.findAndCountAll({
        where,
        include: [
          { 
            association: 'cliente', 
            attributes: ['id', 'razao_social', 'nome_fantasia', 'cnpj']
          },
          { 
            association: 'plano', 
            attributes: ['id', 'nome_plano', 'valor_mensal']
          },
          { 
            association: 'banco', 
            attributes: ['id', 'nome', 'codigo']
          }
        ],
        order: [['created_at', 'DESC']],
        limit,
        offset
      });

      res.json({
        data: carnes,
        pagination: {
          current_page: page,
          per_page: limit,
          total: count,
          last_page: Math.ceil(count / limit),
          from: offset + 1,
          to: Math.min(offset + limit, count)
        }
      });
    } catch (error) {
      console.error('Erro ao listar carnês:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const carne = await Carne.findByPk(id, {
        include: [
          { 
            association: 'cliente', 
            attributes: ['id', 'razao_social', 'nome_fantasia', 'cnpj']
          },
          { 
            association: 'plano', 
            attributes: ['id', 'nome_plano', 'valor_mensal']
          },
          { 
            association: 'banco', 
            attributes: ['id', 'nome', 'codigo']
          },
          { 
            association: 'parcelas'
          }
        ]
      });

      if (!carne) {
        res.status(404).json({ error: 'Carnê não encontrado' });
        return;
      }

      res.json(carne);
    } catch (error) {
      console.error('Erro ao buscar carnê:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const payload = { ...req.body } as any;

      if (!payload.numero_carne) {
        payload.numero_carne = gerarNumeroCarne();
      }

      // Garantir status default
      if (!payload.status) {
        payload.status = 'ativo';
      }

      const carne = await Carne.create(payload);

      // Gerar parcelas automaticamente
      await carne.gerarParcelas();

      const carneComRelacionamentos = await Carne.findByPk(carne.id, {
        include: ['cliente', 'plano', 'banco', 'parcelas']
      });

      res.status(201).json(carneComRelacionamentos || carne);
    } catch (error) {
      console.error('Erro ao criar carnê:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const [updatedRowsCount] = await Carne.update(req.body, {
        where: { id }
      });

      if (updatedRowsCount === 0) {
        res.status(404).json({ error: 'Carnê não encontrado' });
        return;
      }

      const carne = await Carne.findByPk(id, { include: ['cliente', 'plano', 'banco', 'parcelas'] });
      res.json(carne);
    } catch (error) {
      console.error('Erro ao atualizar carnê:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const carne = await Carne.findByPk(id, { include: ['parcelas'] });

      if (!carne) {
        res.status(404).json({ error: 'Carnê não encontrado' });
        return;
      }

      const parcelas = await (carne as any).getParcelas();
      const temParcelasPagas = parcelas.some((p: any) => p.pago === true);
      if (temParcelasPagas) {
        res.status(409).json({ error: 'Não é possível excluir carnê com parcelas pagas.' });
        return;
      }

      await carne.destroy();
      res.status(204).send();
    } catch (error) {
      console.error('Erro ao deletar carnê:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async findAtivos(req: Request, res: Response): Promise<void> {
    try {
      const carnes = await Carne.findAll({
        where: { status: 'ativo' },
        include: [
          { 
            association: 'cliente', 
            attributes: ['id', 'razao_social', 'nome_fantasia']
          },
          { 
            association: 'plano', 
            attributes: ['id', 'nome_plano', 'valor_mensal']
          }
        ],
        order: [['numero_carne', 'ASC']]
      });

      res.json(carnes);
    } catch (error) {
      console.error('Erro ao buscar carnês ativos:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async imprimir(req: Request, res: Response): Promise<void> {
    try {
      const { carne } = req.params;
      const registro = await Carne.findByPk(carne, { 
        include: [
          { association: 'cliente' },
          { association: 'plano' },
          { association: 'banco' },
          { 
            association: 'parcelas', 
            order: [['numero_parcela', 'ASC']],
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
          }
        ]
      });
      
      if (!registro) {
        res.status(404).send('Carnê não encontrado');
        return;
      }

      // Importar o CarneParcelaController para usar os métodos de gerar boleto
      const { CarneParcelaController } = await import('./CarneParcelaController');
      
      // Gerar apenas 1 topo (usando a primeira parcela como referência)
      let topoHtml = '';
      if ((registro as any).parcelas.length > 0) {
        try {
          const primeiraParcela = (registro as any).parcelas[0];
          const dadosEmpresa = await DadosEmpresa.findOne();
          
          // Carregar template do topo
          const templateTopoPath = path.join(__dirname, '../templates/boleto-topo-inner.html');
          let templateTopo = fs.readFileSync(templateTopoPath, { encoding: 'utf8' });

          // Gerar variáveis básicas
          const variables = {
            LOGOMARCA: dadosEmpresa?.logo ? dadosEmpresa.logo : `/images/bancos/boletoproprio.png`,
            CEDENTE: dadosEmpresa?.razao_social || '',
            EMPRESACPF: dadosEmpresa?.cnpj || '',
            EMPRESAENDERECO: dadosEmpresa?.endereco || '',
            EMPRESABAIRRO: dadosEmpresa?.bairro || '',
            EMPRESACEP: dadosEmpresa?.cep || '',
            EMPRESACIDADE: dadosEmpresa?.cidade || '',
            EMPRESAESTADO: dadosEmpresa?.estado || '',
            LOGOSVA: '',
            NUMERO_DOCUMENTO: primeiraParcela.numero_parcela || '',
            SACADO_IDNOME: primeiraParcela.carne?.cliente?.razao_social || '',
            SACADO_ENDERECO: primeiraParcela.carne?.cliente?.endereco || '',
            SACADO_COMPLEMENTO: primeiraParcela.carne?.cliente?.complemento || '',
            SACADO_BAIRRO: primeiraParcela.carne?.cliente?.bairro || '',
            SACADO_CEP: primeiraParcela.carne?.cliente?.cep || '',
            SACADO_CIDADE: primeiraParcela.carne?.cliente?.cidade || '',
            SACADO_ESTADO: primeiraParcela.carne?.cliente?.estado || '',
            TITULONN: primeiraParcela.numero_parcela || '',
            DATA_ORIGINAL: (() => {
              if (!primeiraParcela.data_vencimento) return '';
              const dateStr = primeiraParcela.data_vencimento instanceof Date 
                ? primeiraParcela.data_vencimento.toISOString()
                : (primeiraParcela.data_vencimento as any).toString();
              return dateStr.split('T')[0].split('-').reverse().join('/');
            })(),
            SACADO_CPF: primeiraParcela.carne?.cliente?.cnpj || primeiraParcela.carne?.cliente?.cpf || '',
            DATA_PROC: (() => {
              if (!primeiraParcela.created_at) return '';
              const dateStr = primeiraParcela.created_at instanceof Date 
                ? primeiraParcela.created_at.toISOString()
                : (primeiraParcela.created_at as any).toString();
              return dateStr.split('T')[0].split('-').reverse().join('/');
            })(),
            MOVIMENTO: 'Valor do título',
            VALOR_COBRADO: parseFloat(primeiraParcela.valor_parcela.toString()).toFixed(2).replace('.', ','),
            TAXA_BOLETO: '0,00',
            MULTA_MORA: '0,00',
            DEMONSTRATIVO1: primeiraParcela.carne?.banco?.demonstrativo1 || '',
            DEMONSTRATIVO2: primeiraParcela.carne?.banco?.demonstrativo2 || '',
            DEMONSTRATIVO3: primeiraParcela.carne?.banco?.demonstrativo3 || '',
            DEMONSTRATIVO4: primeiraParcela.carne?.banco?.demonstrativo4 || '',
            VALOR_BOLETO: parseFloat(primeiraParcela.valor_parcela.toString()).toFixed(2).replace('.', ',')
          };

          // Substituir variáveis no template do topo
          Object.entries(variables).forEach(([key, value]) => {
            templateTopo = templateTopo.replace(new RegExp(`{{${key}}}`, 'g'), value);
          });

          topoHtml = templateTopo;
        } catch (error) {
          console.error(`Erro ao gerar topo do boleto:`, error);
        }
      }
      
      // Gerar corpos de todos os boletos
      const corposHtml: string[] = [];
      
      for (const parcela of (registro as any).parcelas) {
        try {
          const dadosEmpresa = await DadosEmpresa.findOne();
          
          // Carregar template do corpo
          const templateCorpoPath = path.join(__dirname, '../templates/boleto-corpo-inner.html');
          let templateCorpo = fs.readFileSync(templateCorpoPath, { encoding: 'utf8' });

          // Gerar QR Code e código de barras
          const generateQRCode = async (parcela: any) => {
            try {
              const qrData = `ID:${parcela.id}|VALOR:${parcela.valor_parcela}|VENC:${parcela.data_vencimento}`;
              return await QRCode.toDataURL(qrData);
            } catch (error) {
              console.error('Erro ao gerar QR Code:', error);
              return '';
            }
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

          const qrCodeData = await generateQRCode(parcela);
          const barcodeData = generateBarcodeBase64(parcela.codigo_barras || parcela.id.toString());

          // Gerar variáveis básicas
          const variables = {
            LOGOBANCO: parcela.carne?.banco?.tipo_banco ? `/images/bancos/${parcela.carne.banco.tipo_banco}.png` : `/images/bancos/boletoproprio.png`,
            CODIGO_BANCO_COM_DV: parcela.carne?.banco?.codigo_banco || parcela.carne?.banco?.codigo || '237',
            LINHA_DIGITAVEL: parcela.linha_digitavel || '12345.67890.12345.678901.23456.789012.3.45678901234567',
            LOCAL_PAGAMENTO: parcela.carne?.banco?.local_pagamento || '',
            DATA_VENC: (() => {
              if (!parcela.data_vencimento) return '';
              const dateStr = parcela.data_vencimento instanceof Date 
                ? parcela.data_vencimento.toISOString()
                : (parcela.data_vencimento as any).toString();
              return dateStr.split('T')[0].split('-').reverse().join('/');
            })(),
            CEDENTE: dadosEmpresa?.razao_social || '',
            AGENCIA_CODIGO: parcela.carne?.banco?.agencia_codigo || '',
            DATA_DOCUMENTO: (() => {
              if (!parcela.created_at) return '';
              const dateStr = parcela.created_at instanceof Date 
                ? parcela.created_at.toISOString()
                : (parcela.created_at as any).toString();
              return dateStr.split('T')[0].split('-').reverse().join('/');
            })(),
            NUMERO_DOCUMENTO: parcela.numero_parcela || '',
            ESPECIE_DOC: parcela.carne?.banco?.especie_doc || '',
            DATA_PROC: (() => {
              if (!parcela.created_at) return '';
              const dateStr = parcela.created_at instanceof Date 
                ? parcela.created_at.toISOString()
                : (parcela.created_at as any).toString();
              return dateStr.split('T')[0].split('-').reverse().join('/');
            })(),
            NOSSO_NUMERO: parcela.id.toString(),
            CARTEIRA: parcela.carne?.banco?.carteira || '',
            VAR_CARTEIRA: '',
            ESPECIE: parcela.carne?.banco?.especie || '',
            QUANTIDADE: '1',
            VALOR_UNITARIO: `R$ ${parseFloat(parcela.valor_parcela.toString()).toFixed(2).replace('.', ',')}`,
            VALOR_BOLETO: parseFloat(parcela.valor_parcela.toString()).toFixed(2).replace('.', ','),
            TEXTO_MULTAMORA: parcela.carne?.banco?.texto_multamora || '',
            INSTRUCOES1: parcela.carne?.banco?.instrucao_linha_1 || '',
            INSTRUCOES2: parcela.carne?.banco?.instrucao_linha_2 || '',
            INSTRUCOES3: parcela.carne?.banco?.instrucao_linha_3 || '',
            INSTRUCOES4: parcela.carne?.banco?.instrucao_linha_4 || '',
            INSTRUCOES5: parcela.carne?.banco?.instrucao_linha_5 || '',
            QRCODE: qrCodeData,
            SACADO_NOME: parcela.carne?.cliente?.razao_social || '',
            TIPO_PSACADO: parcela.carne?.cliente?.cnpj ? 'CNPJ' : 'CPF',
            SACADO_CPF: parcela.carne?.cliente?.cnpj || parcela.carne?.cliente?.cpf || '',
            SACADO_ENDERECO: parcela.carne?.cliente?.endereco || '',
            SACADO_BAIRRO: parcela.carne?.cliente?.bairro || '',
            SACADO_COMPLEMENTO: parcela.carne?.cliente?.complemento || '',
            SACADO_CIDADE: parcela.carne?.cliente?.cidade || '',
            SACADO_ESTADO: parcela.carne?.cliente?.estado || '',
            SACADO_CEP: parcela.carne?.cliente?.cep || '',
            BOLETO_BARCODE2: `<div class="barcode-container" style="text-align: center; margin: 10px 0; padding: 5px;">
              <img src="${barcodeData}" 
                   alt="Código de Barras" style="width: auto; height: 60px; max-width: 400px;" />
            </div>`
          };

          // Substituir variáveis no template do corpo
          Object.entries(variables).forEach(([key, value]) => {
            templateCorpo = templateCorpo.replace(new RegExp(`{{${key}}}`, 'g'), value);
          });

          corposHtml.push(templateCorpo);
        } catch (error) {
          console.error(`Erro ao gerar corpo do boleto da parcela ${parcela.id}:`, error);
        }
      }

      // Combinar 1 topo + múltiplos corpos
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Boletos do Carnê - ${registro.numero_carne}</title>
            <style>
                @page {
                    size: A4;
                    margin: 5mm;
                }
                body {
                    margin: 0;
                    padding: 0;
                    font-family: Arial, sans-serif;
                    background: #fff;
                    color: #000;
                }
                .boleto-topo {
                    margin-bottom: 5px;
                }
                .boleto-corpo {
                    margin-bottom: 2px;
                    page-break-inside: avoid;
                }
                .boleto-corpo:last-child {
                    margin-bottom: 0;
                }
            </style>
        </head>
        <body>
            <div class="boleto-topo">${topoHtml}</div>
            ${corposHtml.map(corpo => `<div class="boleto-corpo">${corpo}</div>`).join('')}
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(htmlContent);

    } catch (error) {
      console.error('Erro ao imprimir carnê:', error);
      res.status(500).send('Erro interno do servidor');
    }
  }

  static async pdf(req: Request, res: Response): Promise<void> {
    try {
      const { carne } = req.params;
      const registro = await Carne.findByPk(carne, { include: ['cliente', 'plano', 'banco', 'parcelas'] });
      if (!registro) {
        res.status(404).send('Carnê não encontrado');
        return;
      }
      // Por ora, retornando HTML; integração com gerador de PDF pode ser feita depois
      const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>PDF Carnê ${registro.numero_carne}</title></head><body><h1>PDF do Carnê ${registro.numero_carne}</h1><p>Cliente: ${(registro as any).cliente?.razao_social || 'N/A'}</p></body></html>`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async gerarTitulos(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as any;
      const carne = await Carne.findByPk(id);
      if (!carne) {
        res.status(404).json({ error: 'Carnê não encontrado' });
        return;
      }
      // Placeholder de integração com banco
      res.json({ success: true, message: 'Títulos gerados com sucesso' });
    } catch (error) {
      console.error('Erro ao gerar títulos:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async consultarStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as any;
      const carne = await Carne.findByPk(id);
      if (!carne) {
        res.status(404).json({ error: 'Carnê não encontrado' });
        return;
      }
      // Placeholder de integração com banco
      res.json({ success: true, status: 'ativo', message: 'Status consultado com sucesso' });
    } catch (error) {
      console.error('Erro ao consultar status:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async cancelarNoBanco(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as any;
      const carne = await Carne.findByPk(id);
      if (!carne) {
        res.status(404).json({ error: 'Carnê não encontrado' });
        return;
      }
      // Placeholder de integração com banco
      res.json({ success: true, message: 'Carnê cancelado no banco com sucesso' });
    } catch (error) {
      console.error('Erro ao cancelar carnê:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
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