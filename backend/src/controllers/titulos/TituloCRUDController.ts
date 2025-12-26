import { Request, Response } from 'express';
import { Titulo } from '../../models/Titulo';
import { Cliente } from '../../models/Cliente';
import { Contrato } from '../../models/Contrato';
import { Plano } from '../../models/Plano';
import { Banco } from '../../models/Banco';
import { Op, WhereOptions } from 'sequelize';
import { logger } from '../../utils/logger';
import { normalizeDateForDb } from '../../utils/dateUtils';
import { gerarLinkPagamentoPublico } from './TituloHelpers';
import { TituloBulkController } from './TituloBulkController';
import type { TituloComRelacoes } from './types';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../services/AuditoriaService';

export class TituloCRUDController {
  
  /**
   * Lista títulos com filtros e paginação
   */
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

  /**
   * Busca título por ID
   */
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

      // Gerar link relativo de pagamento (não precisa de baseUrl)
      const linkPagamento = gerarLinkPagamentoPublico(titulo.id);

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

  /**
   * Cria novo título (ou redireciona para bulk se array)
   */
  public static async create(req: Request, res: Response): Promise<void> {
    try {
      if (Array.isArray(req.body.titulos) || req.body.titulos) {
        return await TituloBulkController.createBulk(req, res);
      }

      const { tituloCreateSchema } = await import('../../validators/titulo.validator');
      const { error, value } = tituloCreateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });

      if (error) {
        const errorDetails = error.details.map(detail => ({ 
          message: detail.message, 
          path: detail.path, 
          type: detail.type,
          context: detail.context
        }));

        logger.warn('Erro de validação na criação de título', { 
          errors: errorDetails,
          body: JSON.stringify(req.body) 
        });
        res.status(400).json({ success: false, message: 'Dados inválidos', errors: error.details.map(detail => detail.message) });
        return;
      }

      const { cliente_id, plano_id, contrato_id, data_vencimento, observacoes, desconto_percentual: dp, desconto_valor: dv, acrescimo_percentual: ap, acrescimo_valor: av, descricao, banco_id, is_avulso } = value;

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

      const { FinancialCalculationsService } = await import('../../services/FinancialCalculationsService');
      
      const valorFinal = FinancialCalculationsService.calcularValorFinal(
        parseFloat(plano.valor_mensal.toString()),
        {
          desconto_valor,
          desconto_percentual
        },
        {
          acrescimo_valor,
          acrescimo_percentual
        }
      );
      
      if (!FinancialCalculationsService.validarValor(valorFinal)) {
        res.status(400).json({ success: false, message: 'Valor inválido (R$ ' + valorFinal.toFixed(2) + '). Valor mínimo R$ 0,01.' });
        return;
      }

      const { withTransaction } = await import('../../utils/transaction');
      const titulo = await withTransaction(async (transaction) => {
        return await Titulo.create({
          cliente_id,
          plano_id: plano.id,
          banco_id: banco.id,
          contrato_id: contratoReferencia?.id || contrato_id || null,
          numero_titulo: gerarNumeroTitulo(),
          valor: valorFinal,
          valor_final: valorFinal,
          // Normalizar data para evitar problemas de timezone (garante meia-noite local)
          data_vencimento: normalizeDateForDb(data_vencimento) || new Date(data_vencimento),
          observacoes: observacoes || '',
          desconto_percentual,
          desconto_valor,
          acrescimo_percentual,
          acrescimo_valor,
          descricao: descricao || null,
          status: 'pendente',
          pago: false,
          is_avulso: is_avulso === true
        }, { transaction });
      });

      // Registrar auditoria
      await registrarCriacao(
        req,
        'Titulo',
        titulo.id,
        titulo.toJSON() as Record<string, unknown>
      );

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

  /**
   * Atualiza título
   */
  public static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, data_vencimento, observacoes } = req.body;

      const titulo = await Titulo.findByPk(id, { include: [{ model: Cliente, as: 'cliente' }, { model: Banco, as: 'banco' }] }) as TituloComRelacoes | null;

      if (!titulo) {
        res.status(404).json({ success: false, message: 'Título não encontrado' });
        return;
      }

      // Capturar dados anteriores para auditoria
      const dadosAnteriores = titulo.toJSON() as Record<string, unknown>;

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
          const { BancoApiService } = await import('../../services/BancoApiService');
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
          // Normalizar data para evitar problemas de timezone
          dataVencimentoParaUpdate = normalizeDateForDb(data_vencimento) || new Date(data_vencimento);
          
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

      // Recarregar título para obter dados atualizados
      await titulo.reload();
      
      // Registrar auditoria
      const dadosNovos = titulo.toJSON() as Record<string, unknown>;
      await registrarAtualizacao(
        req,
        'Titulo',
        titulo.id,
        dadosAnteriores,
        dadosNovos
      );

      res.json({ success: true, message: 'Título atualizado com sucesso', data: titulo });
    } catch (error: unknown) {
      logger.error('Erro ao atualizar título', { error });
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  /**
   * Deleta título
   */
  public static async destroy(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const titulo = await Titulo.findByPk(id, { include: [{ model: Banco, as: 'banco' }] }) as TituloComRelacoes | null;

      if (!titulo) {
        res.status(404).json({ success: false, message: 'Título não encontrado' });
        return;
      }

      // Capturar dados anteriores para auditoria
      const dadosAnteriores = titulo.toJSON() as Record<string, unknown>;

      // Cancelar na API do banco
      if (titulo.charge_id && titulo.banco && ['efi', 'asaas'].includes(titulo.banco.tipo_banco ?? '')) {
        try {
          const { BancoApiService } = await import('../../services/BancoApiService');
          const resultado = await BancoApiService.cancelarTitulo(titulo as TituloComRelacoes);
          logger.info(`Cancelamento no gateway ${resultado.success ? 'bem-sucedido' : 'falhou'}`, { titulo_id: titulo.id, charge_id: titulo.charge_id, message: resultado.message });
        } catch (error: unknown) {
          logger.warn('Erro ao cancelar título no gateway bancário', { titulo_id: titulo.id, error });
        }
      }

      // Registrar auditoria
      await registrarExclusao(
        req,
        'Titulo',
        titulo.id,
        dadosAnteriores
      );

      // Deletar título
      await titulo.destroy();

      res.json({ success: true, message: 'Título deletado com sucesso' });
    } catch (error: unknown) {
      logger.error('Erro ao deletar título', { error });
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  /**
   * Busca títulos por contrato
   */
  public static async getByContrato(req: Request, res: Response): Promise<void> {
    try {
      const { contratoId } = req.params;

      const contrato = await Contrato.findByPk(contratoId);
      if (!contrato) {
        res.status(404).json({ success: false, message: 'Contrato não encontrado' });
        return;
      }

      const titulos = await Titulo.findAll({
        where: { contrato_id: contratoId, is_avulso: false },
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

  /**
   * Busca títulos avulsos por contrato
   */
  public static async getAvulsosByContrato(req: Request, res: Response): Promise<void> {
    try {
      const { contratoId } = req.params;

      const contrato = await Contrato.findByPk(contratoId);
      if (!contrato) {
        res.status(404).json({ success: false, message: 'Contrato não encontrado' });
        return;
      }

      const titulos = await Titulo.findAll({
        where: { contrato_id: contratoId, is_avulso: true },
        include: [
          { model: Cliente, as: 'cliente', where: { id: contrato.cliente_id }, attributes: ['id', 'razao_social', 'nome_fantasia', 'cnpj'] },
          { model: Plano, as: 'plano', attributes: ['id', 'nome_plano', 'valor_mensal'] },
          { model: Banco, as: 'banco', attributes: ['id', 'nome', 'tipo_banco'] }
        ],
        order: [['data_vencimento', 'DESC']]
      });

      res.json({ success: true, data: titulos });
    } catch (error: unknown) {
      logger.error('Erro ao buscar títulos avulsos por contrato', { error });
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  /**
   * Retorna estatísticas dos títulos
   */
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

  /**
   * Gera link de pagamento público
   */
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

      // Gerar link relativo de pagamento (não precisa de baseUrl)
      const link = gerarLinkPagamentoPublico(tituloId);

      res.json({ success: true, data: { titulo_id: tituloId, link: link, numero_titulo: titulo.numero_titulo }, message: 'Link de pagamento gerado com sucesso' });
    } catch (error: unknown) {
      logger.error('Erro ao gerar link de pagamento:', { error });
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  /**
   * Envia título via WhatsApp
   */
  public static async enviarWhatsApp(req: Request, res: Response): Promise<void> {
    try {
      const tituloId = parseInt(req.params.id, 10);
      if (isNaN(tituloId)) {
        res.status(400).json({ success: false, message: 'ID do título inválido' });
        return;
      }

      const { WhatsAppService } = await import('../../services/WhatsAppService');
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

  /**
   * Envia título via Email
   */
  public static async enviarEmail(req: Request, res: Response): Promise<void> {
    try {
      const tituloId = parseInt(req.params.id, 10);
      if (isNaN(tituloId)) {
        res.status(400).json({ success: false, message: 'ID do título inválido' });
        return;
      }

      const { EmailService } = await import('../../services/EmailService');
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

