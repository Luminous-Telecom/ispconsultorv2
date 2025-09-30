import { Request, Response } from 'express';
import { Titulo } from '../models/Titulo';
import { Cliente } from '../models/Cliente';
import { Plano } from '../models/Plano';
import { Banco } from '../models/Banco';
import { BancoApiService } from '../services/BancoApiService';
import { logger } from '../utils/logger';
import { Op } from 'sequelize';

export class TituloController {
  
  // Método para processar template do topo
  private static processarTemplateTopo(template: string, variables: any): string {
    let resultado = template;
    
    // Substituir variáveis do template
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      resultado = resultado.replace(regex, variables[key] || '');
    });
    
    return resultado;
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
      const where: any = {};
      
      if (status) {
        where.status = status;
      }
      
      if (cliente_id) {
        where.cliente_id = cliente_id;
      }
      
      if (data_vencimento_inicio || data_vencimento_fim) {
        where.data_vencimento = {};
        
        if (data_vencimento_inicio) {
          where.data_vencimento[Op.gte] = new Date(data_vencimento_inicio as string);
        }
        
        if (data_vencimento_fim) {
          where.data_vencimento[Op.lte] = new Date(data_vencimento_fim as string);
        }
      }

      // Filtro de busca
      if (search) {
        where[Op.or] = [
          { numero_titulo: { [Op.like]: `%${search}%` } },
          { observacoes: { [Op.like]: `%${search}%` } }
        ];
      }

      const { count, rows } = await Titulo.findAndCountAll({
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
        order: [['created_at', 'DESC']],
        limit: Number(limit),
        offset
      });

      res.json({
        success: true,
        data: rows,
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(count / Number(limit))
        }
      });
    } catch (error: any) {
      logger.error('Erro ao listar títulos', { error: error.message });
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

      res.json({
        success: true,
        data: titulo
      });
    } catch (error: any) {
      logger.error('Erro ao buscar título', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Criar novo título
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { cliente_id, plano_id, data_vencimento, observacoes } = req.body;

      // Validar dados obrigatórios
      if (!cliente_id || !plano_id || !data_vencimento) {
        res.status(400).json({
          success: false,
          message: 'Cliente, plano e data de vencimento são obrigatórios'
        });
        return;
      }

      // Buscar cliente
      const cliente = await Cliente.findByPk(cliente_id, {
        include: [
          {
            model: Banco,
            as: 'bancoBoleto',
            attributes: ['id', 'nome', 'tipo_banco', 'ativo']
          }
        ]
      });

      if (!cliente) {
        res.status(404).json({
          success: false,
          message: 'Cliente não encontrado'
        });
        return;
      }

      // Buscar plano
      const plano = await Plano.findByPk(plano_id);
      if (!plano) {
        res.status(404).json({
          success: false,
          message: 'Plano não encontrado'
        });
        return;
      }

      // Selecionar banco
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

      // Gerar número único do título
      const gerarNumeroTitulo = () => {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        return `TIT-${timestamp}-${random}`;
      };

      // Criar título
      const titulo = await Titulo.create({
        cliente_id,
        plano_id,
        banco_id: banco.id,
        numero_titulo: gerarNumeroTitulo(),
        valor: plano.valor_mensal,
        data_vencimento,
        observacoes: observacoes || '',
        status: 'pendente',
        pago: false
      });

      res.status(201).json({
        success: true,
        message: 'Título criado com sucesso',
        data: titulo
      });
    } catch (error: any) {
      logger.error('Erro ao criar título', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
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
      }) as any;

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
        if (titulo.charge_id && titulo.banco.tipo_banco === 'efi') {
          try {
            await BancoApiService.cancelarTitulo(titulo as any);
            logger.info('Título cancelado na EFI', { 
              titulo_id: titulo.id, 
              charge_id: titulo.charge_id 
            });
          } catch (error: any) {
            logger.warn('Erro ao cancelar título na EFI', { 
              titulo_id: titulo.id, 
              error: error.message 
            });
          }
        }
      }

      // Verificar alteração de vencimento
      if (data_vencimento && new Date(data_vencimento).getTime() !== new Date(titulo.data_vencimento).getTime()) {
        logger.info('Verificando alteração de vencimento', {
          titulo_id: titulo.id,
          data_original: titulo.data_vencimento,
          data_nova: data_vencimento,
          mudou: true,
          banco: titulo.banco.tipo_banco
        });
      }

      // Atualizar título
      await titulo.update({
        status: status || titulo.status,
        data_vencimento: data_vencimento || titulo.data_vencimento,
        observacoes: observacoes !== undefined ? observacoes : titulo.observacoes
      });

      res.json({
        success: true,
        message: 'Título atualizado com sucesso',
        data: titulo
      });
    } catch (error: any) {
      logger.error('Erro ao atualizar título', { error: error.message });
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
      }) as any;

      if (!titulo) {
        res.status(404).json({
          success: false,
          message: 'Título não encontrado'
        });
        return;
      }

      // Cancelar na API do banco se tiver charge_id
      if (titulo.charge_id && titulo.banco.tipo_banco === 'efi') {
        try {
          await BancoApiService.cancelarTitulo(titulo as any);
          logger.info('Título cancelado na EFI antes da exclusão', { 
            titulo_id: titulo.id, 
            charge_id: titulo.charge_id 
          });
        } catch (error: any) {
          logger.warn('Erro ao cancelar título na EFI', { 
            titulo_id: titulo.id, 
            error: error.message 
          });
        }
      }

      // Deletar título
      await titulo.destroy();

      res.json({
        success: true,
        message: 'Título deletado com sucesso'
      });
    } catch (error: any) {
      logger.error('Erro ao deletar título', { error: error.message });
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
          { model: Banco, as: 'banco', attributes: ['id', 'nome', 'codigo', 'tipo_banco', 'client_id_producao', 'client_secret_producao', 'sandbox'] }
        ]
      }) as any;

      if (!titulo) {
        res.status(404).json({
          success: false,
          message: 'Título não encontrado'
        });
        return;
      }

      // Verificar se já está registrado no banco
      if (!titulo.charge_id) {
        logger.info('Título não registrado no banco, registrando agora...', {
          titulo_id: titulo.id,
          banco_id: titulo.banco_id,
          cliente_id: titulo.cliente_id
        });

        try {
          // Registrar no banco
          const resultado = await BancoApiService.gerarTitulo(titulo as any);
          
          if (resultado.success && resultado.data) {
            // Atualizar título com dados do banco
            await titulo.update({
              charge_id: resultado.data.charge_id,
              url_boleto: resultado.data.url_boleto,
              qrcode: resultado.data.qrcode,
              qrcode_image: resultado.data.qrcode_image,
              codigo_barras: resultado.data.codigo_barras,
              linha_digitavel: resultado.data.linha_digitavel,
              nosso_numero: resultado.data.nosso_numero
            });

            logger.info('Título registrado no banco com sucesso', {
              titulo_id: titulo.id,
              charge_id: resultado.data.charge_id
            });
          } else {
            logger.warn('Falha ao registrar título no banco', {
              titulo_id: titulo.id,
              message: resultado.message
            });
          }
        } catch (error: any) {
          logger.error('Erro ao registrar título no banco', { 
            titulo_id: titulo.id, 
            error: error.message 
          });
          res.status(500).json({
            success: false,
            message: 'Erro ao registrar título no banco: ' + error.message
          });
          return;
        }
      }

      // Renderizar template do boleto
      const template = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Boleto - ${titulo.numero_titulo}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .boleto-info { border: 1px solid #ccc; padding: 15px; margin-bottom: 20px; }
            .cliente-info { margin-bottom: 15px; }
            .valor-info { font-size: 18px; font-weight: bold; text-align: center; margin: 20px 0; }
            .codigo-barras { font-family: monospace; font-size: 12px; margin: 10px 0; }
            .linha-digitavel { font-family: monospace; font-size: 14px; margin: 10px 0; }
            .qr-code { text-align: center; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Boleto de Pagamento</h1>
            <p>Número do Título: ${titulo.numero_titulo}</p>
          </div>
          
          <div class="boleto-info">
            <div class="cliente-info">
              <h3>Dados do Cliente</h3>
              <p><strong>Razão Social:</strong> ${titulo.cliente.razao_social}</p>
              <p><strong>CNPJ:</strong> ${titulo.cliente.cnpj}</p>
              <p><strong>Email:</strong> ${titulo.cliente.email}</p>
            </div>
            
            <div class="cliente-info">
              <h3>Dados do Plano</h3>
              <p><strong>Plano:</strong> ${titulo.plano.nome_plano}</p>
              <p><strong>Descrição:</strong> ${titulo.plano.descricao || 'N/A'}</p>
            </div>
            
            <div class="valor-info">
              <p>Valor: R$ ${titulo.valor.toFixed(2)}</p>
              <p>Vencimento: ${new Date(titulo.data_vencimento).toLocaleDateString('pt-BR')}</p>
            </div>
            
            ${titulo.codigo_barras ? `
              <div class="codigo-barras">
                <strong>Código de Barras:</strong><br>
                ${titulo.codigo_barras}
              </div>
            ` : ''}
            
            ${titulo.linha_digitavel ? `
              <div class="linha-digitavel">
                <strong>Linha Digitável:</strong><br>
                ${titulo.linha_digitavel}
              </div>
            ` : ''}
            
            ${titulo.qrcode_image ? `
              <div class="qr-code">
                <img src="${titulo.qrcode_image}" alt="QR Code" style="max-width: 200px;">
              </div>
            ` : ''}
            
            ${titulo.url_boleto ? `
              <div style="text-align: center; margin: 20px 0;">
                <a href="${titulo.url_boleto}" target="_blank" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                  Abrir Boleto no Banco
                </a>
              </div>
            ` : ''}
          </div>
          
          <div class="footer">
            <p>Este boleto foi gerado automaticamente pelo sistema CTM Telecom</p>
            <p>Data de geração: ${new Date().toLocaleString('pt-BR')}</p>
          </div>
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html');
      res.send(template);
    } catch (error: any) {
      logger.error('Erro ao imprimir boleto', { error: error.message });
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

      await titulo.marcarComoPago(valor_pago, data_pagamento ? new Date(data_pagamento) : undefined);

      res.json({
        success: true,
        message: 'Título marcado como pago',
        data: titulo
      });
    } catch (error: any) {
      logger.error('Erro ao marcar título como pago', { error: error.message });
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
    } catch (error: any) {
      logger.error('Erro ao desmarcar título como pago', { error: error.message });
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

      const where: any = {};
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
    } catch (error: any) {
      logger.error('Erro ao buscar estatísticas dos títulos', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}
