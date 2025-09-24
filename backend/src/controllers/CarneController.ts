import { Request, Response } from 'express';
import { Carne } from '../models/Carne';
import { DadosEmpresa } from '../models/DadosEmpresa';
import fs from 'fs';
import path from 'path';
import JsBarcode from 'jsbarcode';
import { createCanvas } from 'canvas';
import { Cliente } from '../models/Cliente';
import { Plano } from '../models/Plano';
import { Banco } from '../models/Banco';
import { Op } from 'sequelize';
import { BancoApiService } from '../services/BancoApiService';
import { logger } from '../utils/logger';

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
        // Mapear novos status para status do banco
        switch (status) {
          case 'em-dias':
            where.status = { [Op.in]: ['ativo', 'pendente', 'registrado'] };
            break;
          case 'atrasado':
            where.status = { [Op.in]: ['ativo', 'pendente', 'registrado'] };
            // TODO: Adicionar lógica para verificar parcelas vencidas
            break;
          case 'pago':
            where.status = 'pago';
            break;
          case 'cancelado':
            where.status = 'cancelado';
            break;
          default:
            where.status = status;
        }
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

      // Adicionar informações de parcelas pagas para cada carnê
      const carnesComParcelas = await Promise.all(
        carnes.map(async (carne: any) => {
          const resumo = await carne.getResumo();
          return {
            ...carne.toJSON(),
            parcelas_pagas: resumo.parcelas_pagas
          };
        })
      );

      res.json({
        data: carnesComParcelas,
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
      const data = { ...req.body } as any;
      
      // Validações obrigatórias
      if (!data.cliente_id) {
        res.status(400).json({ error: 'Cliente é obrigatório' });
        return;
      }
      
      if (!data.plano_id) {
        res.status(400).json({ error: 'Plano é obrigatório' });
        return;
      }
      
      if (!data.banco_id) {
        res.status(400).json({ error: 'Banco é obrigatório' });
        return;
      }
      
      if (!data.valor_parcela || data.valor_parcela <= 0) {
        res.status(400).json({ error: 'Valor da parcela deve ser maior que zero' });
        return;
      }
      
      if (!data.quantidade_parcelas || data.quantidade_parcelas <= 0) {
        res.status(400).json({ error: 'Quantidade de parcelas deve ser maior que zero' });
        return;
      }
      
      if (!data.data_vencimento_primeira) {
        res.status(400).json({ error: 'Data de vencimento da primeira parcela é obrigatória' });
        return;
      }

      // Gerar número único do carnê
      data.numero_carne = gerarNumeroCarne();
      
      // Calcular valor total
      data.valor_total = data.valor_parcela * data.quantidade_parcelas;

      // Remover valor_parcela dos dados do carnê (não existe na tabela)
      const valorParcela = data.valor_parcela;
      delete data.valor_parcela;

      // Garantir status default
      if (!data.status) {
        data.status = 'pendente';
      }

      const carne = await Carne.create(data);

      // Gerar parcelas automaticamente
      await carne.gerarParcelas(valorParcela, data);

      // Carregar relacionamentos para geração de títulos
      const carneComRelacionamentos = await Carne.findByPk(carne.id, {
        include: ['cliente', 'plano', 'banco', 'parcelas']
      });

      // Gerar títulos automaticamente se for banco EFI
      let resultadoGeracao = null;
      if (carneComRelacionamentos) {
        const banco = await carneComRelacionamentos.getBanco();
        if (banco && banco.tipo_banco === 'efi') {
          logger.info('Gerando títulos automaticamente para carnê EFI', {
            carne_id: carne.id,
            banco_id: banco.id
          });
          
          resultadoGeracao = await BancoApiService.gerarCarne(carneComRelacionamentos);
          
          if (resultadoGeracao.success) {
            // Atualizar carnê com dados retornados
            await carneComRelacionamentos.update({
              carnet_id: resultadoGeracao.data?.carnet_id || null,
              codigo_barras: resultadoGeracao.data?.codigo_barras || null,
              linha_digitavel: resultadoGeracao.data?.linha_digitavel || null,
              status: 'ativo'
            });

            // Atualizar parcelas com charge_ids
            if (resultadoGeracao.data?.charges && Array.isArray(resultadoGeracao.data.charges)) {
              const parcelas = await carneComRelacionamentos.getParcelas();
              for (let i = 0; i < parcelas.length && i < resultadoGeracao.data.charges.length; i++) {
                const parcela = parcelas[i];
                const charge = resultadoGeracao.data.charges[i];
                await parcela.update({
                  charge_id: charge.charge_id || null,
                  numero_parcela: charge.parcel || (i + 1)
                });
              }
            }
            
            logger.info('Títulos gerados automaticamente com sucesso', {
              carne_id: carne.id,
              carnet_id: resultadoGeracao.data?.carnet_id
            });
          } else {
            logger.warn('Falha ao gerar títulos automaticamente', {
              carne_id: carne.id,
              error: resultadoGeracao.message
            });
          }
        }
      }

      // Retornar carnê atualizado
      const carneFinal = await Carne.findByPk(carne.id, {
        include: ['cliente', 'plano', 'banco', 'parcelas']
      });

      res.status(201).json({
        success: true,
        message: 'Carnê gerado com sucesso!' + (resultadoGeracao?.success ? ' Títulos gerados automaticamente.' : ''),
        data: carneFinal || carne,
        geracao_titulos: resultadoGeracao
      });
    } catch (error: any) {
      console.error('Erro ao criar carnê:', error);
      res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor',
        message: error.message 
      });
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
      const carne = await Carne.findByPk(id, { 
        include: [
          { association: 'parcelas' },
          { association: 'banco' }
        ]
      });

      if (!carne) {
        res.status(404).json({ error: 'Carnê não encontrado' });
        return;
      }

      // Verificar se tem parcelas pagas
      const parcelas = await (carne as any).getParcelas();
      const temParcelasPagas = parcelas.some((p: any) => p.status === 'pago');
      
      if (temParcelasPagas) {
        res.status(409).json({ 
          success: false,
          error: 'Não é possível excluir carnê com parcelas pagas.' 
        });
        return;
      }

      // Cancelar carnê completo no banco (ou parcelas individualmente se necessário)
      const errosCancelamento: string[] = [];
      
      // Tentar cancelar carnê completo primeiro (mais eficiente para EFI)
      const resultado = await BancoApiService.cancelarCarne(carne);
      
      if (resultado.success) {
        // Carnê cancelado com sucesso - marcar todas as parcelas como canceladas
        for (const parcela of parcelas) {
          await parcela.update({ status: 'cancelado' });
        }
      } else {
        // Falhou cancelamento do carnê completo - tentar parcelas individuais
        errosCancelamento.push(resultado.message || 'Erro desconhecido');
        
        for (const parcela of parcelas) {
          if (parcela.charge_id) {
            // Marcar parcela como cancelada localmente, mesmo que o cancelamento falhou
            await parcela.update({
              status: 'cancelado',
              observacoes: 'Cancelado automaticamente ao excluir carnê. Falha na API: ' + (resultado.message || 'Erro desconhecido')
            });
          }
        }
      }

      // Se houve erros no cancelamento, mostrar aviso mas continuar com a exclusão
      if (errosCancelamento.length > 0) {
        console.warn('Erros ao cancelar títulos do carnê ' + carne.id, errosCancelamento);
      }

      // Deletar parcelas e carnê
      await carne.destroy();

      let mensagem = 'Carnê excluído com sucesso!';
      if (errosCancelamento.length > 0) {
        mensagem += ' Alguns títulos podem não ter sido cancelados no banco, mas foram marcados como cancelados localmente.';
      }

      res.json({
        success: true,
        message: mensagem
      });
    } catch (error: any) {
      console.error('Erro ao deletar carnê:', error);
      res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor',
        message: error.message 
      });
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
            LOGOMARCA: dadosEmpresa?.logo ? dadosEmpresa.logo : `${process.env.BASE_URL}/images/bancos/boletoproprio.png`,
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

          const qrCodeData = parcela.qrcode_image || '';
          const barcodeData = generateBarcodeBase64(parcela.codigo_barras || parcela.id.toString());

          // Gerar variáveis básicas
          const variables = {
            LOGOBANCO: parcela.carne?.banco?.tipo_banco ? `${process.env.BASE_URL}/images/bancos/${parcela.carne.banco.tipo_banco}.png` : `${process.env.BASE_URL}/images/bancos/boletoproprio.png`,
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
            <div class="boleto-topo">${topoHtml}</div>
            ${corposHtml.length > 0 ? '<div class="separador"></div>' : ''}
            ${corposHtml.map((corpo, index) => 
              `<div class="separador"></div><div class="boleto-corpo">${corpo}</div>`
            ).join('')}
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
      const { carne } = req.params as any;
      const carneObj = await Carne.findByPk(carne, {
        include: [
          { association: 'cliente' },
          { association: 'plano' },
          { association: 'banco' },
          { association: 'parcelas' }
        ]
      });
      
      if (!carneObj) {
        res.status(404).json({ 
          success: false,
          error: 'Carnê não encontrado' 
        });
        return;
      }

      const banco = await carneObj.getBanco();
      
      if (!banco || banco.tipo_banco !== 'efi') {
        res.status(400).json({ 
          success: false,
          error: 'Apenas carnês EFI podem ter títulos gerados' 
        });
        return;
      }

      // Gerar carnê via API da EFI
      const resultado = await BancoApiService.gerarCarne(carneObj);
      
      if (resultado.success) {
        // Atualizar carnê com dados retornados
        await carneObj.update({
          carnet_id: resultado.data?.carnet_id || null,
          codigo_barras: resultado.data?.codigo_barras || null,
          linha_digitavel: resultado.data?.linha_digitavel || null,
          status: 'ativo'
        });

        // Atualizar parcelas com charge_ids
        if (resultado.data?.charges && Array.isArray(resultado.data.charges)) {
          const parcelas = await carneObj.getParcelas();
          for (let i = 0; i < parcelas.length && i < resultado.data.charges.length; i++) {
            const parcela = parcelas[i];
            const charge = resultado.data.charges[i];
            await parcela.update({
              charge_id: charge.charge_id || null,
              numero_parcela: charge.parcel || (i + 1)
            });
          }
        }

        res.json({
          success: true,
          message: 'Títulos gerados com sucesso na EFI!',
          data: {
            carnet_id: resultado.data?.carnet_id,
            codigo_barras: resultado.data?.codigo_barras,
            linha_digitavel: resultado.data?.linha_digitavel
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Falha ao gerar títulos na EFI: ' + (resultado.message || 'Erro desconhecido')
        });
      }
    } catch (error: any) {
      console.error('Erro ao gerar títulos:', error);
      res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor',
        message: error.message 
      });
    }
  }

  static async consultarStatus(req: Request, res: Response): Promise<void> {
    try {
      const { carne } = req.params as any;
      const carneObj = await Carne.findByPk(carne, {
        include: [
          { association: 'banco' },
          { association: 'parcelas' }
        ]
      });
      
      if (!carne) {
        res.status(404).json({ 
          success: false,
          error: 'Carnê não encontrado' 
        });
        return;
      }

      const banco = await carne.getBanco();
      
      if (!banco || banco.tipo_banco !== 'efi' || !carne.carnet_id) {
        res.status(400).json({ 
          success: false,
          error: 'Apenas carnês EFI com carnet_id podem ter status consultado' 
        });
        return;
      }

      // Consultar status via API da EFI
      const resultado = await BancoApiService.consultarStatusCarne(carne);
      
      if (resultado.success) {
        // Atualizar status local se necessário
        if (resultado.data?.status && resultado.data.status !== carne.status) {
          await carne.update({ status: resultado.data.status });
        }

        res.json({
          success: true,
          message: 'Status consultado com sucesso!',
          data: {
            status_atual: carne.status,
            status_banco: resultado.data?.status,
            carnet_id: carne.carnet_id,
            parcelas_total: (await carne.getParcelas()).length,
            parcelas_pagas: (await carne.getParcelas()).filter((p: any) => p.status === 'pago').length
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Falha ao consultar status na EFI: ' + (resultado.message || 'Erro desconhecido')
        });
      }
    } catch (error: any) {
      console.error('Erro ao consultar status:', error);
      res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor',
        message: error.message 
      });
    }
  }

  static async cancelarNoBanco(req: Request, res: Response): Promise<void> {
    try {
      const { carne } = req.params as any;
      const carneObj = await Carne.findByPk(carne, {
        include: [
          { association: 'banco' },
          { association: 'parcelas' }
        ]
      });
      
      if (!carne) {
        res.status(404).json({ 
          success: false,
          error: 'Carnê não encontrado' 
        });
        return;
      }

      const banco = await carne.getBanco();
      
      if (!banco || banco.tipo_banco !== 'efi' || !carne.carnet_id) {
        res.status(400).json({ 
          success: false,
          error: 'Apenas carnês EFI com carnet_id podem ser cancelados' 
        });
        return;
      }

      // Cancelar carnê via API da EFI
      const resultado = await BancoApiService.cancelarCarne(carne);
      
      if (resultado.success) {
        // Marcar todas as parcelas como canceladas
        const parcelas = await carne.getParcelas();
        for (const parcela of parcelas) {
          await parcela.update({ status: 'cancelado' });
        }

        // Atualizar status do carnê
        await carne.update({ status: 'cancelado' });

        res.json({
          success: true,
          message: 'Carnê cancelado no banco com sucesso!',
          data: {
            carnet_id: carne.carnet_id,
            status: 'cancelado',
            parcelas_canceladas: parcelas.length
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Falha ao cancelar carnê na EFI: ' + (resultado.message || 'Erro desconhecido')
        });
      }
    } catch (error: any) {
      console.error('Erro ao cancelar carnê:', error);
      res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor',
        message: error.message 
      });
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