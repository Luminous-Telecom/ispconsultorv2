/**
 * Serviço de Auditoria com Elasticsearch
 * Registra ações críticas do sistema no Elasticsearch
 * 
 * @module services/elasticsearch/ElasticsearchAuditService
 */
import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import { AuthenticatedRequest } from '../../../types/auth';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';

/** Req com saasUser (SaaS) não tem empresa_id - retorna null */
function getEmpresaIdForAudit(req: Request | AuthenticatedRequest): number | null {
  const reqAny = req as AuthenticatedRequest & { saasUser?: unknown };
  if (reqAny.saasUser) return null;
  return getEmpresaIdOrNull(req);
}
import { getElasticsearchService } from '../ElasticsearchService';
import { ES_DATA_STREAM } from '../dataStreams';
import { elasticsearchEventTimestamps } from '../elasticsearchTimestamps';
import { collectRelatedEntityIds } from '../relatedEntityIds';
import { logger } from '../../../utils/logger';
import { normalizarSnapshotAuditoria } from '../../auditoria/normalizarSnapshotAuditoria';
import { SistemaLogOperacionalService, houveAlteracaoEfetivaEmUpdate } from '../../sistema/SistemaLogOperacionalService';
import { getClientIp } from '../../../utils/requestUtils';

export type AcaoAuditoria = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'import' | 'executar';

/** Origem da operação de auditoria - identifica quem executou */
export type OrigemAuditoria = 'usuario' | 'agendador' | 'webhook' | 'sistema';

interface DadosAuditoria {
  acao: AcaoAuditoria;
  entidade: string;
  entidade_id?: number | null;
  dados_anteriores?: Record<string, unknown> | null;
  dados_novos?: Record<string, unknown> | null;
  rota?: string;
  metodo_http?: string;
  observacoes?: string | null;
  /** Override para empresa_id (ex.: operações SaaS onde req não tem tenant) */
  empresa_id?: number | null;
  /** Origem da operação - agendador, webhook, sistema. Default: usuario */
  origem_auditoria?: OrigemAuditoria;
  /** Override para IP (ex.: webhook - capturar antes do processamento em background) */
  ip_address?: string | null;
}

/**
 * Obter User Agent da requisição
 */
function getUserAgent(req: Request): string | null {
  return req.headers['user-agent'] || null;
}

/**
 * Obter dados do usuário autenticado (ERP ou SaaS)
 */
function getUserData(req: Request | AuthenticatedRequest): {
  id: number | null;
  nome: string | null;
  email: string | null;
} {
  const reqAny = req as AuthenticatedRequest & { saasUser?: JwtPayload };
  const userPayload = reqAny.saasUser ?? (reqAny.user as JwtPayload | undefined);

  if (!userPayload) {
    return { id: null, nome: null, email: null };
  }

  const userId = userPayload.sub ? parseInt(String(userPayload.sub), 10) : null;
  const email = typeof userPayload.email === 'string' ? userPayload.email : null;
  const nome = typeof userPayload.nome === 'string' ? userPayload.nome : null;

  return {
    id: userId,
    nome: nome ?? null,
    email
  };
}


/**
 * Registrar ação na auditoria (Elasticsearch)
 * Não lança erro se falhar para não interromper o fluxo principal
 */
export async function registrarAuditoriaElasticsearch(
  req: Request | AuthenticatedRequest,
  dados: DadosAuditoria
): Promise<void> {
  const isAgent = dados.entidade === 'Agent';

  // Capturar IP e dados do usuário de forma síncrona (antes do setImmediate)
  // para evitar req/socket indisponível quando o callback executar
  const userData = getUserData(req);
  const ipAddress = dados.ip_address ?? getClientIp(req);
  const empresaId = dados.empresa_id ?? getEmpresaIdForAudit(req);
  const rota = dados.rota ?? req.originalUrl ?? null;
  const metodoHttp = dados.metodo_http ?? req.method ?? null;
  const userAgent = getUserAgent(req);

  const dadosAnterioresNorm = normalizarSnapshotAuditoria(dados.dados_anteriores ?? null);
  const dadosNovosNorm = normalizarSnapshotAuditoria(dados.dados_novos ?? null);

  if (dados.acao === 'update' && !houveAlteracaoEfetivaEmUpdate(dadosAnterioresNorm, dadosNovosNorm)) {
    return;
  }

  const snapshotBase = {
    acao: dados.acao,
    entidade: dados.entidade,
    entidadeId: dados.entidade_id ?? null,
    observacoes: dados.observacoes ?? null,
    empresaId,
    usuarioId: userData.id,
    ipAddress,
    userAgent,
    rota,
    metodoHttp,
    origemAuditoria: (dados.origem_auditoria ?? 'usuario') as OrigemAuditoria,
    dadosNovos: dadosNovosNorm,
    dadosAnteriores: dadosAnterioresNorm,
  };

  setImmediate(async () => {
    const persistOperacional = (elasticsearchLogId: string | null) => {
      SistemaLogOperacionalService.registrarFromAuditoriaSnapshot({
        ...snapshotBase,
        elasticsearchLogId,
      });
    };

    try {
        const elasticsearchService = getElasticsearchService();
        const client = elasticsearchService.getClient();

        if (!client) {
          logger.warn('Cliente Elasticsearch não disponível', {
            context: 'ElasticsearchAuditService',
            action: 'registrarAuditoriaElasticsearch',
            acao: dados.acao,
            entidade: dados.entidade
          });
          persistOperacional(null);
          return;
        }

        const isConnected = await elasticsearchService.checkConnection();
        if (!isConnected) {
          logger.warn('Elasticsearch não disponível', {
            context: 'ElasticsearchAuditService',
            action: 'registrarAuditoriaElasticsearch',
            acao: dados.acao,
            entidade: dados.entidade
          });
          persistOperacional(null);
          return;
        }

      const dadosAnterioresLimpos = dadosAnterioresNorm;
      const dadosNovosLimpos = dadosNovosNorm;

      const reqAny = req as AuthenticatedRequest & { saasUser?: unknown };
      const isSaas = !!reqAny.saasUser;

      const relatedIds = collectRelatedEntityIds({
        entidadeId: dados.entidade_id,
        dadosNovos: dadosNovosLimpos,
        dadosAnteriores: dadosAnterioresLimpos
      });

      const document: Record<string, unknown> = {
        log_tipo: 'auditoria',
        saas: isSaas,
        empresa_id: empresaId ?? null,
        usuario_id: userData.id,
        usuario_nome: userData.nome,
        usuario_email: userData.email,
        acao: dados.acao,
        entidade: dados.entidade,
        entidade_id: dados.entidade_id || null,
        dados_anteriores: dadosAnterioresLimpos,
        dados_novos: dadosNovosLimpos,
        ip_address: ipAddress,
        user_agent: userAgent,
        rota,
        metodo_http: metodoHttp,
        observacoes: dados.observacoes || null,
        ...elasticsearchEventTimestamps(new Date())
      };
      if (relatedIds.length > 0) {
        document.related_entity_ids = relatedIds;
      }
      if (dados.origem_auditoria) {
        document.origem_auditoria = dados.origem_auditoria;
      }

      // Validar se o documento pode ser serializado antes de enviar
      try {
        const documentString = JSON.stringify(document);
      } catch (serializeError) {
        logger.warn('Documento não pode ser serializado para Elasticsearch', {
          context: 'ElasticsearchAuditService',
          acao: dados.acao,
          entidade: dados.entidade,
          entidade_id: dados.entidade_id,
          error: serializeError instanceof Error ? serializeError.message : 'Erro desconhecido',
          stack: serializeError instanceof Error ? serializeError.stack : undefined
        });
        return;
      }

      // Indexar documento no Elasticsearch
      const indexResult = await client.index({
        index: ES_DATA_STREAM.AUDITORIA,
        document,
        refresh: isAgent ? 'wait_for' : false
      });
      const esDocId =
        (indexResult as { _id?: string })._id ??
        (indexResult as { body?: { _id?: string } }).body?._id ??
        null;
      persistOperacional(esDocId);
    } catch (error) {
      // Não lançar erro para não interromper o fluxo principal
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      // Usar console.error para garantir que os detalhes sejam mostrados
      console.error('=== ERRO AO REGISTRAR AUDITORIA NO ELASTICSEARCH ===');
      console.error('Ação:', dados.acao);
      console.error('Entidade:', dados.entidade);
      console.error('Entidade ID:', dados.entidade_id);
      console.error('Mensagem do erro:', errorMessage);
      console.error('Nome do erro:', error instanceof Error ? error.name : 'Unknown');
      console.error('Stack:', errorStack);
      
      // Log mais detalhado para diagnosticar problema específico do cancelamento
      const errorDetails: any = {
        context: 'ElasticsearchAuditService',
        action: 'registrarAuditoriaElasticsearch',
        error: errorMessage,
        stack: errorStack,
        dados: {
          acao: dados.acao,
          entidade: dados.entidade,
          entidade_id: dados.entidade_id
        }
      };
      
      // Adicionar informações específicas do erro se disponível
      if (error && typeof error === 'object') {
        const err = error as any;
        
        if (err.response) {
          errorDetails.elasticsearch_response = {
            status: err.response.status,
            statusText: err.response.statusText,
            data: typeof err.response.data === 'string' ? err.response.data.substring(0, 500) : err.response.data
          };
        }
        
        if (err.meta) {
          errorDetails.elasticsearch_meta = {
            body: typeof err.meta.body === 'string' ? err.meta.body.substring(0, 500) : err.meta.body,
            statusCode: err.meta.statusCode,
            request: err.meta.request ? {
              params: err.meta.request.params,
              method: err.meta.request.method,
              path: err.meta.request.path
            } : undefined
          };
        }
        
        if (err.name) {
          errorDetails.error_name = err.name;
        }
        if (err.code) {
          errorDetails.error_code = err.code;
        }
        if (err.cause) {
          errorDetails.error_cause = err.cause;
        }
      }
      
      // Log como warning em vez de error, já que não é crítico
      logger.warn('Falha ao registrar auditoria no Elasticsearch (não crítico)', errorDetails);
      if (isAgent) {
        logger.info('ElasticsearchAuditService: Agent - ERRO capturado no catch', { error: errorMessage });
      }
      persistOperacional(null);
    }
  });
}

/**
 * Registrar criação de entidade
 */
export async function registrarCriacaoElasticsearch(
  req: Request | AuthenticatedRequest,
  entidade: string,
  entidadeId: number,
  dadosNovos: Record<string, unknown>,
  observacoes?: string,
  empresa_id?: number | null,
  origem_auditoria?: OrigemAuditoria
): Promise<void> {
  await registrarAuditoriaElasticsearch(req, {
    acao: 'create',
    entidade,
    entidade_id: entidadeId,
    dados_novos: dadosNovos,
    observacoes,
    empresa_id,
    origem_auditoria
  });
}

/**
 * Registrar atualização de entidade
 */
export async function registrarAtualizacaoElasticsearch(
  req: Request | AuthenticatedRequest,
  entidade: string,
  entidadeId: number,
  dadosAnteriores: Record<string, unknown>,
  dadosNovos: Record<string, unknown>,
  observacoes?: string,
  empresa_id?: number | null,
  origem_auditoria?: OrigemAuditoria
): Promise<void> {
  await registrarAuditoriaElasticsearch(req, {
    acao: 'update',
    entidade,
    entidade_id: entidadeId,
    dados_anteriores: dadosAnteriores,
    dados_novos: dadosNovos,
    observacoes,
    empresa_id,
    origem_auditoria
  });
}

/**
 * Registrar atualização de entidade sem requisição HTTP (ex.: rotina agendada).
 * Grava no Elasticsearch com contexto "Sistema".
 * Executa de forma síncrona (await) para garantir que o registro seja enviado antes de retornar.
 */
export async function registrarAtualizacaoElasticsearchSistema(
  entidade: string,
  entidadeId: number,
  dadosAnteriores: Record<string, unknown>,
  dadosNovos: Record<string, unknown>,
  observacoes?: string,
  empresa_id?: number | null
): Promise<void> {
  const da = normalizarSnapshotAuditoria(dadosAnteriores);
  const dn = normalizarSnapshotAuditoria(dadosNovos);

  if (!houveAlteracaoEfetivaEmUpdate(da, dn)) {
    return;
  }

  const persistOperacional = (elasticsearchLogId: string | null) => {
    SistemaLogOperacionalService.registrarFromAuditoriaSnapshot({
      acao: 'update',
      entidade,
      entidadeId,
      observacoes: observacoes ?? null,
      empresaId: empresa_id ?? null,
      usuarioId: null,
      ipAddress: null,
      userAgent: 'Rotina agendada',
      rota: null,
      metodoHttp: null,
      origemAuditoria: 'agendador',
      dadosNovos: dn,
      dadosAnteriores: da,
      elasticsearchLogId,
    });
  };

  try {
    const elasticsearchService = getElasticsearchService();
    const client = elasticsearchService.getClient();
    if (!client) {
      persistOperacional(null);
      return;
    }
    const isConnected = await elasticsearchService.checkConnection();
    if (!isConnected) {
      persistOperacional(null);
      return;
    }

    const relatedIds = collectRelatedEntityIds({
      entidadeId,
      dadosNovos: dn,
      dadosAnteriores: da,
    });

    const document: Record<string, unknown> = {
      log_tipo: 'auditoria',
      saas: false,
      usuario_id: null,
      usuario_nome: 'Sistema',
      usuario_email: null,
      acao: 'update' as const,
      entidade,
      entidade_id: entidadeId,
      dados_anteriores: da,
      dados_novos: dn,
      ip_address: null,
      user_agent: 'Rotina agendada',
      rota: null,
      metodo_http: null,
      observacoes: observacoes || null,
      ...elasticsearchEventTimestamps(new Date()),
      origem_auditoria: 'agendador' as const,
      empresa_id: empresa_id != null && empresa_id > 0 ? empresa_id : null
    };
    if (relatedIds.length > 0) {
      document.related_entity_ids = relatedIds;
    }

    const indexResult = await client.index({
        index: ES_DATA_STREAM.AUDITORIA,
        document
      });
    const esDocId =
      (indexResult as { _id?: string })._id ??
      (indexResult as { body?: { _id?: string } }).body?._id ??
      null;
    persistOperacional(esDocId);
  } catch (error) {
    logger.warn('Falha ao registrar auditoria (Sistema) no Elasticsearch', {
      context: 'ElasticsearchAuditService',
      action: 'registrarAtualizacaoElasticsearchSistema',
      entidade,
      entidade_id: entidadeId,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
    persistOperacional(null);
  }
}

/** Dados do usuário para auditoria de execução manual */
export interface UsuarioAuditoria {
  id: number;
  nome: string | null;
  email: string | null;
}

/**
 * Registrar execução de rotina agendada na auditoria principal.
 * Chamado sempre que o agendador executa uma rotina (sucesso ou erro).
 * Se executada manualmente, passar usuario para exibir quem executou.
 */
export async function registrarExecucaoRotinaAuditoria(params: {
  routineId: number;
  routineNome: string;
  routineTipo: string;
  status: 'sucesso' | 'erro';
  duracaoMs: number;
  empresaId?: number | null;
  saas?: boolean;
  erro?: string;
  resultado?: Record<string, unknown>;
  /** Usuário que executou manualmente - quando presente, exibe o usuário; quando ausente, execução automática */
  usuario?: UsuarioAuditoria | null;
  /** IP do cliente - quando execução manual */
  ipAddress?: string | null;
}): Promise<void> {
  try {
    const elasticsearchService = getElasticsearchService();
    const client = elasticsearchService.getClient();
    if (!client) return;
    const isConnected = await elasticsearchService.checkConnection();
    if (!isConnected) return;
    const { routineId, routineNome, routineTipo, status, duracaoMs, empresaId, saas = false, erro, resultado, usuario, ipAddress } = params;
    const observacoes = status === 'sucesso'
      ? `Rotina "${routineNome}" (${routineTipo}) executada em ${duracaoMs}ms`
      : `Rotina "${routineNome}" (${routineTipo}) falhou: ${erro || 'Erro desconhecido'}`;

    const document: Record<string, unknown> = {
      log_tipo: 'auditoria',
      saas,
      usuario_id: usuario?.id ?? null,
      usuario_nome: usuario?.nome ?? 'Sistema',
      usuario_email: usuario?.email ?? null,
      acao: 'executar' as const,
      entidade: 'ScheduledRoutine',
      entidade_id: routineId,
      dados_anteriores: null,
      dados_novos: { executado: true, status, duracao_ms: duracaoMs, resultado: resultado || null },
      ip_address: (usuario && ipAddress) ? ipAddress : null,
      user_agent: 'Agendador de tarefas',
      rota: null,
      metodo_http: null,
      observacoes,
      ...elasticsearchEventTimestamps(new Date()),
      origem_auditoria: 'agendador' as const,
      empresa_id: empresaId ?? null,
      related_entity_ids: [String(routineId)]
    };

    await client.index({
      index: ES_DATA_STREAM.AUDITORIA,
      document
    });

    SistemaLogOperacionalService.registrarRotinaExecucao({
      origem: saas ? 'saas' : 'erp',
      empresaId: empresaId ?? null,
      usuarioId: usuario?.id ?? null,
      routineId,
      routineNome,
      routineTipo,
      status,
      duracaoMs,
      resultado: resultado ?? null,
      erro: erro ?? null,
      ipAddress: usuario && ipAddress ? ipAddress : null,
    });
  } catch (error) {
    logger.warn('Falha ao registrar execução de rotina na auditoria', {
      context: 'ElasticsearchAuditService',
      action: 'registrarExecucaoRotinaAuditoria',
      routineId: params.routineId,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

/**
 * Registrar exclusão de entidade
 */
export async function registrarExclusaoElasticsearch(
  req: Request | AuthenticatedRequest,
  entidade: string,
  entidadeId: number,
  dadosAnteriores: Record<string, unknown>,
  observacoes?: string,
  empresa_id?: number | null
): Promise<void> {
  await registrarAuditoriaElasticsearch(req, {
    acao: 'delete',
    entidade,
    entidade_id: entidadeId,
    dados_anteriores: dadosAnteriores,
    observacoes,
    empresa_id
  });
}

/**
 * Registrar login
 */
export async function registrarLoginElasticsearch(
  req: Request | AuthenticatedRequest,
  usuarioId: number,
  observacoes?: string
): Promise<void> {
  await registrarAuditoriaElasticsearch(req, {
    acao: 'login',
    entidade: 'Usuario',
    entidade_id: usuarioId,
    observacoes
  });
}

/**
 * Registrar logout
 */
export async function registrarLogoutElasticsearch(
  req: Request | AuthenticatedRequest,
  usuarioId: number,
  observacoes?: string
): Promise<void> {
  await registrarAuditoriaElasticsearch(req, {
    acao: 'logout',
    entidade: 'Usuario',
    entidade_id: usuarioId,
    observacoes
  });
}


