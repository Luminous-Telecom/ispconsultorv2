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

      // Importar o CarneParcelaController para usar o método de gerar boleto
      const { CarneParcelaController } = await import('./CarneParcelaController');
      
      // Gerar HTML de todos os boletos
      const boletosHtml: string[] = [];
      
      for (const parcela of (registro as any).parcelas) {
        try {
          // Simular request para o método imprimirBoleto
          const mockReq = {
            params: { id: parcela.id.toString() },
            query: {}
          } as any;
          
          const mockRes = {
            setHeader: () => {},
            send: (html: string) => {
              boletosHtml.push(html);
            }
          } as any;
          
          // Chamar o método imprimirBoleto para cada parcela
          await CarneParcelaController.imprimirBoleto(mockReq, mockRes);
        } catch (error) {
          console.error(`Erro ao gerar boleto da parcela ${parcela.id}:`, error);
        }
      }

      // Combinar todos os boletos em um documento
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
                .boleto-page {
                    page-break-after: always;
                    margin-bottom: 20px;
                }
                .boleto-page:last-child {
                    page-break-after: avoid;
                }
            </style>
        </head>
        <body>
            ${boletosHtml.map(html => `<div class="boleto-page">${html}</div>`).join('')}
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
}