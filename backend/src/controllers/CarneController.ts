import { Request, Response } from 'express';
import { Carne } from '../models/Carne';
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
          { association: 'parcelas', order: [['numero_parcela', 'ASC']] }
        ]
      });
      
      if (!registro) {
        res.status(404).send('Carnê não encontrado');
        return;
      }

      const formatMoney = (value: number) => {
        return value.toFixed(2).replace('.', ',');
      };

      const safe = (value: any, fallback = '') => {
        return value !== null && value !== '' ? value : fallback;
      };

      // Gerar capa do carnê
      const capaHtml = `
        <div class="capa-compacta" style="font-family: Arial, sans-serif; color: #000; margin: 0 auto; padding: 0; border: 0; background: #fff; width: 100%; max-width: 100%; height: 94.5mm; overflow: hidden; box-sizing: border-box; display: flex; flex-direction: column;">
          <!-- CABEÇALHO CORPORATIVO -->
          <div style="background: #f5f7fa; border-bottom: 2px solid #000; padding: 10px 12px; text-align: center;">
            <div style="font-size: 20px; font-weight: 800; color: #000; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px;">
              CARNÊ DE COBRANÇA
            </div>
            <div style="font-size: 12px; color: #333; margin-bottom: 6px;">
              ERP ASSESSORIA TÉCNICA
            </div>
            <div style="font-size: 10px; background: #000; color: #fff; padding: 4px 12px; display: inline-block; border-radius: 2px;">
              CARNÊ Nº ${registro.numero_carne}
            </div>
          </div>

          <!-- INFORMAÇÕES DO CLIENTE -->
          <div style="padding: 12px; flex: 1; display: flex; flex-direction: column;">
            <div style="margin-bottom: 8px;">
              <strong>CLIENTE:</strong> ${safe((registro as any).cliente?.razao_social)}
            </div>
            <div style="margin-bottom: 8px;">
              <strong>PLANO:</strong> ${safe((registro as any).plano?.nome_plano)}
            </div>
            <div style="margin-bottom: 8px;">
              <strong>BANCO:</strong> ${safe((registro as any).banco?.nome)}
            </div>
            <div style="margin-bottom: 8px;">
              <strong>VALOR TOTAL:</strong> R$ ${formatMoney(parseFloat((registro as any).valor_total.toString()))}
            </div>
            <div style="margin-bottom: 8px;">
              <strong>PARCELAS:</strong> ${(registro as any).quantidade_parcelas}
            </div>
            <div style="margin-bottom: 8px;">
              <strong>PRIMEIRO VENCIMENTO:</strong> ${new Date((registro as any).data_vencimento_primeira).toLocaleDateString('pt-BR')}
            </div>
          </div>
        </div>
      `;

      // Gerar boletos das parcelas
      const boletosHtml = ((registro as any).parcelas || []).map((parcela: any) => `
        <div class="boleto-standard" style="font-family: Arial, sans-serif; color: #000; margin: 0 auto; padding: 0; border: 0; background: #fff; width: 100%; max-width: 100%; height: 95mm; overflow: hidden; box-sizing: border-box; display: flex; flex-direction: column;">
          <!-- CABEÇALHO DO BOLETO -->
          <div style="background: #f5f7fa; border-bottom: 1px solid #000; padding: 8px 12px; text-align: center;">
            <div style="font-size: 16px; font-weight: 700; color: #000; margin-bottom: 2px;">
              BOLETO BANCÁRIO
            </div>
            <div style="font-size: 9px; color: #333;">
              Parcela ${parcela.numero_parcela} de ${(registro as any).quantidade_parcelas}
            </div>
          </div>

          <!-- INFORMAÇÕES DO BOLETO -->
          <div style="padding: 12px; flex: 1; display: flex; flex-direction: column;">
            <div style="margin-bottom: 6px;">
              <strong>CLIENTE:</strong> ${safe((registro as any).cliente?.razao_social)}
            </div>
            <div style="margin-bottom: 6px;">
              <strong>VALOR:</strong> R$ ${formatMoney(parseFloat(parcela.valor_parcela.toString()))}
            </div>
            <div style="margin-bottom: 6px;">
              <strong>VENCIMENTO:</strong> ${new Date(parcela.data_vencimento).toLocaleDateString('pt-BR')}
            </div>
            <div style="margin-bottom: 6px;">
              <strong>BANCO:</strong> ${safe((registro as any).banco?.nome)}
            </div>
            <div style="margin-bottom: 6px;">
              <strong>STATUS:</strong> ${parcela.status}
            </div>
            ${parcela.data_pagamento ? `
              <div style="margin-bottom: 6px;">
                <strong>PAGO EM:</strong> ${new Date(parcela.data_pagamento).toLocaleDateString('pt-BR')}
              </div>
            ` : ''}
          </div>
        </div>
      `).join('<hr class="cut-line" style="border: 0; border-top: 1px dashed #000; margin: 1px 0;" />');

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Imprimir Carnê - ${registro.numero_carne}</title>
            <style>
                @page {
                    size: A4;
                    margin: 5mm 7mm;
                }
                @media print {
                    .no-print { display: none !important; }
                    .page-break { page-break-before: always !important; }
                    body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
                    .container { max-width: none; width: 100%; }
                }
                .cut-line {
                    border: 0;
                    border-top: 1px dashed #000;
                    margin: 1px 0;
                    page-break-inside: avoid;
                }
                .cut-line::before {
                    content: '✂  recorte aqui';
                    position: absolute;
                    left: 0;
                    top: -12px;
                    font-size: 9px;
                    color: #555;
                    background: #fff;
                    padding: 0 6px;
                }
            </style>
        </head>
        <body>
            <div class="container-fluid" style="width: 100%; max-width: 100%; padding: 0; margin: 0;">
                <!-- Botões de controle (não imprimir) -->
                <div class="no-print" style="padding: 10px; background: #f8f9fa; border-bottom: 1px solid #dee2e6;">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="h5 mb-0">Carnê #${registro.numero_carne}</div>
                        <button onclick="window.print()" class="btn btn-primary">
                            <i class="bi bi-printer"></i> Imprimir
                        </button>
                    </div>
                </div>

                <!-- CAPA E BOLETOS -->
                <div class="primeira-pagina">
                    ${capaHtml}
                    <hr class="cut-line" />
                    ${boletosHtml}
                </div>
            </div>
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(htmlContent);
    } catch (error) {
      console.error('Erro ao imprimir carnê:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
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
}