import { Request, Response } from 'express';
import { Titulo } from '../../../models/financeiro/Titulo';
import { Cliente } from '../../../models/clientes/Cliente';
import { Contrato } from '../../../models/contratos/Contrato';
import { Plano } from '../../../models/cadastros/Plano';
import { Banco } from '../../../models/cadastros/Banco';
import { TituloService } from '../../../services/financeiro/TituloService';
import { ClienteService } from '../../../services/clientes/ClienteService';
import { ContratoService } from '../../../services/contratos/ContratoService';
import { PlanoService } from '../../../services/cadastros/PlanoService';
import { BancoService } from '../../../services/cadastros/BancoService';
import { Transaction, WhereOptions } from 'sequelize';
import { logger } from '../../../utils/logger';
import { normalizeDateForDb } from '../../../utils/dateUtils';
import { formatDateOnly } from '../../../utils/timezoneUtils';
import { gerarLinkPagamentoPublico } from '../TituloHelpers';
import { TituloBulkController } from '../TituloBulkController';
import type { TituloComRelacoes } from '../TituloHelpers/types';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService/index';
import { setAuditData } from '../../../middleware/auditMiddleware';
import { sendSuccess, sendError, sendNotFound, sendValidationError } from '../../../utils/responseUtils';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';

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
        data_pagamento_inicio,
        data_pagamento_fim,
        search,
        searchField,
        sortColumn,
        sortDirection,
        empresa_id: empresaIdQuery
      } = req.query;

      const limitNum = Number(limit);
      const pageNum = Number(page);
      const parsedEmpresa = empresaIdQuery != null && empresaIdQuery !== '' ? Number(empresaIdQuery) : NaN;
      const empresaId = !Number.isNaN(parsedEmpresa) && parsedEmpresa > 0 ? parsedEmpresa : getEmpresaIdOrNull(req);

      // Passar parâmetros diretamente para o service (que já constrói os filtros internamente usando helpers)
      const result = await TituloService.list({
        page: pageNum,
        limit: limitNum,
        status: status as string,
        cliente_id: cliente_id as string | number,
        data_vencimento_inicio: data_vencimento_inicio as string,
        data_vencimento_fim: data_vencimento_fim as string,
        data_pagamento_inicio: data_pagamento_inicio as string,
        data_pagamento_fim: data_pagamento_fim as string,
        search: search as string,
        searchField: searchField as string,
        sortColumn: sortColumn as string,
        sortDirection: sortDirection as string,
        empresa_id: empresaId ?? undefined,
      });

      sendSuccess(res, result);
    } catch (error: unknown) {
      const logger = (await import('../../../utils/logger')).logger;
      
      // Log detalhado do erro antes de enviar resposta genérica
      const sqlError = error as any;
      const errorDetails: Record<string, unknown> = {
        error: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined,
        query: req.query,
        sortColumn: req.query.sortColumn,
        sortDirection: req.query.sortDirection
      };
      
      // Tentar extrair SQL do erro Sequelize
      if (sqlError?.sql) {
        errorDetails.sql = typeof sqlError.sql === 'string' ? sqlError.sql.substring(0, 1000) : sqlError.sql;
      }
      if (sqlError?.original?.sql) {
        errorDetails.sql = typeof sqlError.original.sql === 'string' ? sqlError.original.sql.substring(0, 1000) : sqlError.original.sql;
      }
      if (sqlError?.original?.message) {
        errorDetails.originalMessage = sqlError.original.message;
      }
      
      logger.error('TituloCRUDController.list - Erro capturado no controller', errorDetails);
      
      sendError(res, error, 'Erro ao listar títulos', 500, true, {
        query: req.query,
        search: req.query.search ? String(req.query.search) : null,
        status: req.query.status ? String(req.query.status) : null,
        cliente_id: req.query.cliente_id ? String(req.query.cliente_id) : null
      });
    }
  }

  /**
   * Busca título por ID
   */
  public static async show(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const empresaId = getEmpresaIdOrNull(req);

      const titulo = await TituloService.getById(id);

      if (!titulo) {
        sendNotFound(res, 'Título não encontrado');
        return;
      }

      if (empresaId !== null && titulo.empresa_id !== empresaId) {
        sendNotFound(res, 'Título não encontrado');
        return;
      }

      // Gerar link relativo de pagamento (não precisa de baseUrl)
      const linkPagamento = gerarLinkPagamentoPublico(titulo.id);

      const tituloComLink = {
        ...titulo.toJSON(),
        link_pagamento_publico: linkPagamento
      };

      sendSuccess(res, tituloComLink);
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao buscar título', 500, true);
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

      const { tituloCreateSchema } = await import('../../../validators/titulo.validator');
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
        // Converter para Record<string, string[]> esperado pelo sendValidationError
        const errorsByField: Record<string, string[]> = error.details.reduce((acc, detail) => {
          const field = detail.path.join('.') || 'general';
          if (!acc[field]) {
            acc[field] = [];
          }
          acc[field].push(detail.message);
          return acc;
        }, {} as Record<string, string[]>);
        sendValidationError(res, 'Dados inválidos', errorsByField);
        return;
      }

      const { cliente_id, plano_id, contrato_id, data_vencimento, observacoes, desconto_percentual: dp, desconto_valor: dv, acrescimo_percentual: ap, acrescimo_valor: av, descricao, banco_id, is_avulso, valor: valorInformado } = value;

      const desconto_percentual = dp ? parseFloat(dp.toString()) : null;
      const desconto_valor = dv ? parseFloat(dv.toString()) : null;
      const acrescimo_percentual = ap ? parseFloat(ap.toString()) : null;
      const acrescimo_valor = av ? parseFloat(av.toString()) : null;

      const cliente = await ClienteService.getById(cliente_id);
      if (!cliente || !cliente.ativo) {
        sendNotFound(res, 'Cliente não encontrado ou inativo');
        return;
      }

      let contratoReferencia: Contrato | null = null;
      if (contrato_id) {
        contratoReferencia = await ContratoService.getById(contrato_id);
        if (contratoReferencia && contratoReferencia.cliente_id !== cliente.id) {
          contratoReferencia = null;
        }
        if (!contratoReferencia) {
          sendNotFound(res, 'Contrato informado não encontrado para este cliente');
          return;
        }
      } else {
        const contratosAtivos = await ContratoService.list({ page: 1, limit: 1, status: 'ativo' });
        contratoReferencia = contratosAtivos.data.find(c => c.cliente_id === cliente.id) || null;
      }

      let plano;
      if (plano_id) {
        plano = await PlanoService.getById(plano_id);
        if (!plano) {
          sendNotFound(res, 'Plano não encontrado');
          return;
        }
      } else if (contratoReferencia) {
        plano = await contratoReferencia.getPlano();
        if (!plano) {
          sendValidationError(res, 'Contrato selecionado não possui plano associado');
          return;
        }
      } else {
        sendValidationError(res, 'Informe o plano ou associe o cliente a um contrato com plano ativo');
        return;
      }

      if (!data_vencimento) {
         sendValidationError(res, 'Data de vencimento é obrigatória');
         return;
      }
      
      let banco;
      const bancoIdToFind = banco_id || contratoReferencia?.conta_boleto;
      
      if (bancoIdToFind) {
        banco = await BancoService.getById(bancoIdToFind);
        if (!banco || !banco.ativo) {
          sendValidationError(res, 'Banco configurado não está ativo');
          return;
        }
      } else {
        banco = await BancoService.findFirstAtivo();
        if (!banco) {
          sendValidationError(res, 'Nenhum banco ativo encontrado');
          return;
        }
      }

      const gerarNumeroTitulo = () => `TIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const { FinancialCalculationsService } = await import('../../../services/FinancialCalculationsService');
      
      // Para título avulso, valor é obrigatório
      if (is_avulso && (!valorInformado || parseFloat(valorInformado.toString()) <= 0)) {
        sendValidationError(res, 'Valor é obrigatório para títulos avulsos e deve ser maior que zero');
        return;
      }
      
      // Para título avulso, usar valor informado se disponível, senão usar valor do plano
      const valorBase = is_avulso && valorInformado && parseFloat(valorInformado.toString()) > 0
        ? parseFloat(valorInformado.toString())
        : parseFloat(plano.valor_mensal.toString());
      
      const valorFinal = FinancialCalculationsService.calcularValorFinal(
        valorBase,
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
        sendValidationError(res, 'Valor inválido (R$ ' + valorFinal.toFixed(2) + '). Valor mínimo R$ 0,01.');
        return;
      }

      const empresaId = contratoReferencia?.empresa_id ?? cliente.empresa_id ?? getEmpresaIdOrNull(req);
      const { withTransaction } = await import('../../../utils/transaction');
      const titulo = await withTransaction(async (transaction) => {
        return await TituloService.create({
          empresa_id: empresaId ?? null,
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
        }, transaction);
      });

      // Registrar auditoria (já registra no Elasticsearch internamente)
      const tituloData = titulo.toJSON() as Record<string, unknown>;
      try {
        const empresaIdAudit = getEmpresaIdOrNull(req) ?? titulo.empresa_id ?? null;
        await registrarCriacao(
          req,
          'Titulo',
          titulo.id,
          tituloData,
          undefined,
          empresaIdAudit
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }

      sendSuccess(res, titulo, 'Título criado com sucesso', 201);
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao criar título', 500, true, {
        body: req.body
      });
    }
  }

  /**
   * Atualiza título
   */
  public static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, data_vencimento, observacoes, valor } = req.body;

      const titulo = await TituloService.getById(id) as TituloComRelacoes | null;

      if (!titulo) {
        sendNotFound(res, 'Título não encontrado');
        return;
      }

      // Capturar dados anteriores para auditoria
      const tituloModelUpdate = titulo as unknown as Titulo;
      const dadosAnteriores = tituloModelUpdate.toJSON() as Record<string, unknown>;

      // Validações de status
      if (status === 'cancelado' && titulo.status === 'pago') {
        sendValidationError(res, 'Não é possível cancelar um título que já foi pago');
        return;
      }
      if (status === 'cancelado' && titulo.status === 'cancelado') {
        sendValidationError(res, 'Este título já está cancelado');
        return;
      }
      if (status === 'pago' && titulo.status === 'cancelado') {
        sendValidationError(res, 'Não é possível marcar como pago um título cancelado');
        return;
      }

      // Lógica de cancelamento no gateway
      if (status === 'cancelado' && titulo.status !== 'cancelado') {
        if (titulo.charge_id && titulo.banco && ['efi', 'asaas'].includes(titulo.banco?.tipo_banco ?? '')) {
          const { BancoApiService } = await import('../../../services/bancos/BancoApiService');
          const resultadoCancelamento = await BancoApiService.cancelarTitulo(titulo as TituloComRelacoes);

          if (!resultadoCancelamento.success) {
            logger.warn('Falha ao cancelar título no gateway bancário', { titulo_id: titulo.id, charge_id: titulo.charge_id, message: resultadoCancelamento.message });
            sendError(res, new Error(resultadoCancelamento.message ?? 'Não foi possível cancelar o título no banco emissor'), resultadoCancelamento.message ?? 'Não foi possível cancelar o título no banco emissor', 400, false);
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
          sendValidationError(res, 'Não é possível alterar o valor de um título já registrado no banco emissor');
          return;
        }
        if (valor <= 0) {
          sendValidationError(res, 'Valor deve ser maior que zero');
          return;
        }
      }

      // Lógica de alteração de vencimento
      let dataVencimentoParaUpdate: Date | undefined;
      if (data_vencimento) {
        const dataVencimentoOriginal = formatDateOnly(titulo.data_vencimento) || '';
        const dataVencimentoNova = formatDateOnly(data_vencimento) || '';
        
        if (dataVencimentoNova !== dataVencimentoOriginal) {
          if (titulo.status === 'cancelado') {
            sendValidationError(res, 'Não é possível alterar o vencimento de um título cancelado');
            return;
          }
          
          if (tituloRegistradoNoBanco) {
            sendValidationError(res, 'Não é possível alterar o vencimento de um título já registrado no banco emissor');
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
      const tituloAtualizado = await TituloService.update(id, dadosParaUpdate);
      
      // Registrar auditoria
      const dadosNovos = tituloAtualizado.toJSON() as Record<string, unknown>;
      
      // Disponibilizar dados para o middleware
      setAuditData(req, dadosAnteriores, dadosNovos);
      
      try {
        const empresaIdAudit = getEmpresaIdOrNull(req) ?? tituloAtualizado.empresa_id ?? null;
        await registrarAtualizacao(
          req,
          'Titulo',
          titulo.id,
          dadosAnteriores,
          dadosNovos,
          undefined,
          empresaIdAudit
        );
      } catch (auditError) {
        // Não bloquear o fluxo se a auditoria falhar
        logger.warn('Erro ao registrar auditoria (não crítico)', {
          titulo_id: titulo.id,
          error: auditError instanceof Error ? auditError.message : 'Erro desconhecido'
        });
      }

      sendSuccess(res, tituloAtualizado, 'Título atualizado com sucesso');
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao atualizar título', 500, true);
    }
  }

  /**
   * Deleta título (apenas se pendente e não registrado no banco)
   */
  public static async destroy(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const titulo = await TituloService.getById(id) as TituloComRelacoes | null;

      if (!titulo) {
        sendNotFound(res, 'Título não encontrado');
        return;
      }

      const isCancelado = titulo.status === 'cancelado';
      if (!isCancelado) {
        if (titulo.pago) {
          sendValidationError(res, 'Só é possível excluir títulos pendentes (não pagos).');
          return;
        }
        const tituloRegistradoNoBanco = !!(
          titulo.nosso_numero ||
          titulo.codigo_barras ||
          titulo.linha_digitavel ||
          titulo.charge_id ||
          titulo.url_boleto
        );
        if (tituloRegistradoNoBanco) {
          sendValidationError(res, 'Só é possível excluir títulos que ainda não foram registrados no banco emissor.');
          return;
        }
      }

      // Capturar dados anteriores para auditoria
      const tituloModelCancel = titulo as unknown as Titulo;
      const dadosAnteriores = tituloModelCancel.toJSON() as Record<string, unknown>;

      // Registrar auditoria
      try {
        const empresaIdAudit = getEmpresaIdOrNull(req) ?? titulo.empresa_id ?? null;
        await registrarExclusao(
          req,
          'Titulo',
          titulo.id,
          dadosAnteriores,
          undefined,
          empresaIdAudit
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }

      // Deletar título
      await TituloService.delete(id);

      sendSuccess(res, undefined, 'Título deletado com sucesso');
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao deletar título', 500, true);
    }
  }

  /**
   * Busca títulos por contrato
   */
  public static async getByContrato(req: Request, res: Response): Promise<void> {
    try {
      const { contratoId } = req.params;
      const { sortColumn, sortDirection } = req.query;
      const empresaId = getEmpresaIdOrNull(req);

      const contrato = await ContratoService.getById(contratoId);
      if (!contrato) {
        sendNotFound(res, 'Contrato não encontrado');
        return;
      }

      if (empresaId !== null && contrato.empresa_id !== empresaId) {
        sendNotFound(res, 'Contrato não encontrado');
        return;
      }

      const finalSortColumn = (sortColumn as string) || 'id';
      const finalSortDirection = (sortDirection as string) || 'desc';

      // Usar TituloService.list com filtro de contrato_id, sem filtro de data - todos os títulos do contrato
      const result = await TituloService.list({
        page: 1,
        limit: 5000,
        cliente_id: undefined,
        search: String(contratoId),
        searchField: 'contrato_id',
        sortColumn: finalSortColumn,
        sortDirection: finalSortDirection,
        empresa_id: empresaId ?? undefined,
      });

      // Filtrar apenas não-avulsos - backend já ordena
      const titulos = result.data.filter(t => !t.is_avulso);

      sendSuccess(res, titulos);
    } catch (error: unknown) {
      const logger = (await import('../../../utils/logger')).logger;
      logger.error('TituloCRUDController.getByContrato - Erro', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        contratoId: req.params.contratoId
      });
      sendError(res, error, 'Erro ao buscar títulos por contrato', 500, true);
    }
  }

  /**
   * Busca títulos avulsos por contrato
   */
  public static async getAvulsosByContrato(req: Request, res: Response): Promise<void> {
    try {
      const { contratoId } = req.params;
      const { sortColumn, sortDirection } = req.query;
      const empresaId = getEmpresaIdOrNull(req);

      const contrato = await ContratoService.getById(contratoId);
      if (!contrato) {
        sendNotFound(res, 'Contrato não encontrado');
        return;
      }

      if (empresaId !== null && contrato.empresa_id !== empresaId) {
        sendNotFound(res, 'Contrato não encontrado');
        return;
      }

      const finalSortColumn = (sortColumn as string) || 'id';
      const finalSortDirection = (sortDirection as string) || 'desc';

      // Usar TituloService.list com filtro de contrato_id, sem filtro de data - todos os títulos avulsos do contrato
      const result = await TituloService.list({
        page: 1,
        limit: 5000,
        cliente_id: undefined,
        search: String(contratoId),
        searchField: 'contrato_id',
        sortColumn: finalSortColumn,
        sortDirection: finalSortDirection,
        empresa_id: empresaId ?? undefined,
      });

      // Filtrar apenas avulsos - backend já ordena
      const titulos = result.data.filter(t => t.is_avulso);

      sendSuccess(res, titulos);
    } catch (error: unknown) {
      const logger = (await import('../../../utils/logger')).logger;
      logger.error('TituloCRUDController.getAvulsosByContrato - Erro', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        contratoId: req.params.contratoId
      });
      sendError(res, error, 'Erro ao buscar títulos avulsos por contrato', 500, true);
    }
  }

  /**
   * Retorna estatísticas dos títulos
   */
  public static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const { cliente_id } = req.query;
      const empresaId = getEmpresaIdOrNull(req);

      const where: WhereOptions = {};
      if (cliente_id) where.cliente_id = cliente_id;
      if (empresaId !== null) where.empresa_id = empresaId;

      const [totalTitulos, titulosPendentes, titulosPagos, titulosVencidos, titulosCancelados] = await Promise.all([
        TituloService.count(where),
        TituloService.count({ ...where, status: 'pendente' }),
        TituloService.count({ ...where, status: 'pago' }),
        TituloService.count({ ...where, status: 'vencido' }),
        TituloService.count({ ...where, status: 'cancelado' })
      ]);

      const [valorTotal, valorPendente, valorPago, valorVencido, valorCancelado] = await Promise.all([
        Titulo.sum('valor', { where }),
        Titulo.sum('valor', { where: { ...where, status: 'pendente' } }),
        Titulo.sum('valor', { where: { ...where, status: 'pago' } }),
        Titulo.sum('valor', { where: { ...where, status: 'vencido' } }),
        Titulo.sum('valor', { where: { ...where, status: 'cancelado' } })
      ]);

      sendSuccess(res, {
        quantidade: { total: totalTitulos, pendentes: titulosPendentes, pagos: titulosPagos, vencidos: titulosVencidos, cancelados: titulosCancelados },
        valores: { total: valorTotal || 0, pendente: valorPendente || 0, pago: valorPago || 0, vencido: valorVencido || 0, cancelado: valorCancelado || 0 }
      });
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao buscar estatísticas dos títulos', 500, true);
    }
  }

  /**
   * Gera link de pagamento público
   */
  public static async gerarLinkPagamento(req: Request, res: Response): Promise<void> {
    try {
      const tituloId = parseInt(req.params.id, 10);
      if (isNaN(tituloId)) {
        sendValidationError(res, 'ID do título inválido');
        return;
      }

      const titulo = await TituloService.getById(tituloId);
      if (!titulo) {
        sendNotFound(res, 'Título não encontrado');
        return;
      }

      // Gerar link relativo de pagamento (não precisa de baseUrl)
      const link = gerarLinkPagamentoPublico(tituloId);

      sendSuccess(res, { titulo_id: tituloId, link: link, numero_titulo: titulo.numero_titulo }, 'Link de pagamento gerado com sucesso');
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao gerar link de pagamento', 500, true);
    }
  }

  /**
   * Envia título via WhatsApp
   */
  public static async enviarWhatsApp(req: Request, res: Response): Promise<void> {
    try {
      const tituloId = parseInt(req.params.id, 10);
      if (isNaN(tituloId)) {
        sendValidationError(res, 'ID do título inválido');
        return;
      }

      const { WhatsAppService } = await import('../../../services/comunicacao/WhatsAppService');
      const resultado = await WhatsAppService.enviarTituloManual(tituloId);

      if (resultado.sucesso) {
        sendSuccess(res, undefined, resultado.mensagem || 'Mensagem enviada com sucesso');
      } else {
        sendError(res, new Error(resultado.mensagem || 'Erro ao enviar mensagem'), resultado.mensagem || 'Erro ao enviar mensagem', 400, false);
      }
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao enviar título via WhatsApp', 500, true);
    }
  }

  /**
   * Envia título via Email
   */
  public static async enviarEmail(req: Request, res: Response): Promise<void> {
    try {
      const tituloId = parseInt(req.params.id, 10);
      if (isNaN(tituloId)) {
        sendValidationError(res, 'ID do título inválido');
        return;
      }

      const { EmailService } = await import('../../../services/comunicacao/EmailService');
      const resultado = await EmailService.enviarTituloManual(tituloId);

      if (resultado.sucesso) {
        sendSuccess(res, undefined, resultado.mensagem || 'Email enviado com sucesso');
      } else {
        sendError(res, new Error(resultado.mensagem || 'Erro ao enviar email'), resultado.mensagem || 'Erro ao enviar email', 400, false);
      }
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao enviar título via Email', 500, true);
    }
  }
}

