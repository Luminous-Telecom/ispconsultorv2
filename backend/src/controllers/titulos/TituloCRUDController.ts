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
import { registrarCriacaoElasticsearch } from '../../services/elasticsearch/ElasticsearchAuditService';
import { setAuditData } from '../../middleware/auditMiddleware';

export class TituloCRUDController {
  
  /**
   * Lista títulos com filtros e paginação
   */
  public static async list(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        cliente_id,
        data_vencimento_inicio,
        data_vencimento_fim,
        search,
        searchField
      } = req.query;

      const limitNum = Number(limit);
      const pageNum = Number(page);
      const offset = (pageNum - 1) * limitNum;

      const where: WhereOptions = {};

      if (status) {
        if (typeof status === 'string' && status.startsWith('!')) {
          where.status = { [Op.ne]: status.substring(1) };
        } else {
          where.status = status;
        }
      }

      if (cliente_id) {
        where.cliente_id = cliente_id;
      }

      if (data_vencimento_inicio || data_vencimento_fim) {
        const range: Record<symbol, unknown> = {};

        if (data_vencimento_inicio) {
          const [year, month, day] = (data_vencimento_inicio as string).split('-').map(Number);
          range[Op.gte] = new Date(year, month - 1, day, 0, 0, 0, 0);
        }

        if (data_vencimento_fim) {
          const [year, month, day] = (data_vencimento_fim as string).split('-').map(Number);
          range[Op.lte] = new Date(year, month - 1, day, 23, 59, 59, 999);
        }

        where.data_vencimento = range;
      }

      if (search && String(search).trim()) {
        const term = String(search).trim();
        const likePattern = `%${term.replace(/[%_\\]/g, '\\$&')}%`;
        const termNum = Number(term);
        const isNumericSearch = !isNaN(termNum) && term !== '';

        const field = typeof searchField === 'string' ? searchField : undefined;
        const orConditions: WhereOptions[] = [];

        const addMultiFieldSearch = () => {
          orConditions.push(
            { numero_titulo: { [Op.like]: likePattern } } as WhereOptions,
            { status: { [Op.like]: likePattern } } as WhereOptions,
            { charge_id: { [Op.like]: likePattern } } as WhereOptions,
            { nosso_numero: { [Op.like]: likePattern } } as WhereOptions,
            { '$cliente.razao_social$': { [Op.like]: likePattern } } as WhereOptions,
            { '$cliente.nome_fantasia$': { [Op.like]: likePattern } } as WhereOptions,
            { '$plano.nome_plano$': { [Op.like]: likePattern } } as WhereOptions
          );

          if (isNumericSearch) {
            orConditions.push(
              { id: termNum } as WhereOptions,
              { valor: termNum } as WhereOptions,
              { valor_pago: termNum } as WhereOptions,
              { contrato_id: termNum } as WhereOptions
            );
          }
        };

        if (field) {
          switch (field) {
            case 'id':
              if (isNumericSearch) orConditions.push({ id: termNum } as WhereOptions);
              break;
            case 'numero_titulo':
              orConditions.push({ numero_titulo: { [Op.like]: likePattern } } as WhereOptions);
              break;
            case 'status':
              orConditions.push({ status: { [Op.like]: likePattern } } as WhereOptions);
              break;
            case 'charge_id':
              orConditions.push({ charge_id: { [Op.like]: likePattern } } as WhereOptions);
              break;
            case 'nosso_numero':
              orConditions.push({ nosso_numero: { [Op.like]: likePattern } } as WhereOptions);
              break;
            case 'contrato_id':
              if (isNumericSearch) orConditions.push({ contrato_id: termNum } as WhereOptions);
              break;
            case 'valor':
              if (isNumericSearch) orConditions.push({ valor: termNum } as WhereOptions);
              break;
            case 'valor_pago':
              if (isNumericSearch) orConditions.push({ valor_pago: termNum } as WhereOptions);
              break;
            case 'cliente':
              orConditions.push(
                { '$cliente.razao_social$': { [Op.like]: likePattern } } as WhereOptions,
                { '$cliente.nome_fantasia$': { [Op.like]: likePattern } } as WhereOptions
              );
              break;
            case 'plano':
              orConditions.push({ '$plano.nome_plano$': { [Op.like]: likePattern } } as WhereOptions);
              break;
            default:
              addMultiFieldSearch();
              break;
          }
        } else {
          addMultiFieldSearch();
        }

        // Se escolheram um campo numérico e digitaram texto, retornamos vazio (sem OR inválido)
        if (orConditions.length === 0) {
          where.id = { [Op.eq]: -1 };
        } else {
          (where as Record<symbol, unknown>)[Op.or] = orConditions as unknown as WhereOptions[];
        }
      }

      const include = [
        { model: Cliente, as: 'cliente', attributes: ['id', 'razao_social', 'nome_fantasia', 'cnpj', 'email'], required: false },
        { model: Plano, as: 'plano', attributes: ['id', 'nome_plano', 'valor_mensal'], required: false },
        { model: Banco, as: 'banco', attributes: ['id', 'nome', 'tipo_banco'], required: false }
      ];

      const { count, rows } = await Titulo.findAndCountAll({
        where,
        include,
        order: [['id', 'DESC']],
        limit: limitNum,
        offset,
        distinct: true,
        subQuery: false
      });

      const total = Number(count);
      const perPage = limitNum;
      const currentPage = pageNum;
      const lastPage = total > 0 ? Math.ceil(total / perPage) : 1;
      const from = total > 0 ? offset + 1 : 0;
      const to = total > 0 ? Math.min(offset + perPage, total) : 0;

      res.json({
        success: true,
        data: rows,
        pagination: { current_page: currentPage, per_page: perPage, total, last_page: lastPage, from, to }
      });
    } catch (error: unknown) {
      const errorObj = error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : { message: 'Erro desconhecido', original: error };
      
      logger.error('Erro ao listar títulos', {
        error: errorObj,
        query: req.query,
        search: req.query.search ? String(req.query.search) : null,
        status: req.query.status ? String(req.query.status) : null,
        cliente_id: req.query.cliente_id ? String(req.query.cliente_id) : null
      });
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
      const tituloData = titulo.toJSON() as Record<string, unknown>;
      await registrarCriacao(
        req,
        'Titulo',
        titulo.id,
        tituloData
      );
      await registrarCriacaoElasticsearch(
        req,
        'Titulo',
        titulo.id,
        tituloData
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
      const { status, data_vencimento, observacoes, valor } = req.body;

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

      // Verificar se título está registrado no banco emissor
      const tituloRegistradoNoBanco = !!(
        titulo.nosso_numero ||
        titulo.codigo_barras ||
        titulo.linha_digitavel ||
        titulo.charge_id ||
        titulo.url_boleto
      );

      // Validar alteração de valor
      if (valor !== undefined && valor !== null) {
        if (tituloRegistradoNoBanco) {
          res.status(400).json({ success: false, message: 'Não é possível alterar o valor de um título já registrado no banco emissor' });
          return;
        }
        if (valor <= 0) {
          res.status(400).json({ success: false, message: 'Valor deve ser maior que zero' });
          return;
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
          
          if (tituloRegistradoNoBanco) {
            res.status(400).json({ success: false, message: 'Não é possível alterar o vencimento de um título já registrado no banco emissor' });
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

      // Preparar dados para atualização
      const dadosParaUpdate: Partial<Titulo> = {
        status: status || titulo.status,
        observacoes: observacoes !== undefined ? observacoes : titulo.observacoes
      };

      // Só atualizar data_vencimento e valor se não estiver registrado no banco
      if (!tituloRegistradoNoBanco) {
        if (dataVencimentoParaUpdate) {
          dadosParaUpdate.data_vencimento = dataVencimentoParaUpdate;
        } else if (data_vencimento) {
          dadosParaUpdate.data_vencimento = normalizeDateForDb(data_vencimento) || new Date(data_vencimento);
        }
        
        if (valor !== undefined && valor !== null && valor > 0) {
          dadosParaUpdate.valor = valor;
        }
      } else if (dataVencimentoParaUpdate) {
        // Se estiver registrado, só atualizar data se foi fornecida e diferente
        dadosParaUpdate.data_vencimento = dataVencimentoParaUpdate;
      }

      // Atualizar título
      await titulo.update(dadosParaUpdate);

      // Recarregar título para obter dados atualizados
      await titulo.reload();
      
      // Registrar auditoria
      const dadosNovos = titulo.toJSON() as Record<string, unknown>;
      
      // Disponibilizar dados para o middleware
      setAuditData(req, dadosAnteriores, dadosNovos);
      
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

