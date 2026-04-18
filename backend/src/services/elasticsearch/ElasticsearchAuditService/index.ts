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
import { safeFormatDateISOLocal } from '../../../utils/timezoneUtils';

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
 * Obter IP do cliente da requisição
 */
function getClientIp(req: Request): string | null {
  const reqAny = req as Request & { ip?: string; webhookClientIp?: string };
  const headers = req.headers;
  return (
    (typeof reqAny.webhookClientIp === 'string' && reqAny.webhookClientIp.trim()) ||
    (headers['cf-connecting-ip'] as string)?.trim() ||
    (headers['x-client-ip'] as string)?.trim() ||
    (headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (headers['x-real-ip'] as string)?.trim() ||
    (headers['true-client-ip'] as string)?.trim() ||
    (typeof reqAny.ip === 'string' && reqAny.ip.trim()) ||
    req.socket?.remoteAddress?.trim() ||
    null
  );
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

  setImmediate(async () => {
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
          return;
        }

      // Limpar dados removendo apenas campos internos do Sequelize e campos muito grandes
      const limparDados = (dados: Record<string, unknown> | null): Record<string, unknown> | null => {
        if (!dados || typeof dados !== 'object') return null;
        
        const limpo: Record<string, unknown> = {};
        const camposExcluir = [
          'dataValues', '_changed', '_options', 'isNewRecord', '_previousDataValues', 
          '$modelOptions', 'Model', 'sequelize', 'tableName',
          'xml', 'pdf_base64', 'pdf_url', 'danfe_url',
          'pagamentos', 'arquivos', 'saldo_devedor', 'vencida'
        ];
        
        // Campos de relacionamento que devem ser convertidos para arrays de IDs
        const relacionamentosArray = ['planos', 'titulos', 'contratos', 'termos', 'mensagens', 'notas_fiscais', 'parcelas', 'documentos', 'anexos'];
        
        for (const [key, value] of Object.entries(dados)) {
          // Ignorar campos internos do Sequelize e campos muito grandes
          if (key.startsWith('_') || key.startsWith('$') || camposExcluir.includes(key)) {
            continue;
          }
          
          // Ignorar valores null para evitar conflitos de mapeamento no Elasticsearch
          if (value === null || value === undefined) {
            continue;
          }
          
          // Tratar relacionamentos que são arrays (planos, titulos, contratos, etc.)
          if (relacionamentosArray.includes(key)) {
            if (Array.isArray(value)) {
              // Extrair apenas IDs dos objetos do relacionamento que estão ativos
              const ids = value
                .slice(0, 10) // Limitar a 10 itens para não sobrecarregar
                .map((item: any) => {
                  if (item && typeof item === 'object' && item.id !== undefined) {
                    // Verificar se o item está ativo baseado no tipo de relacionamento
                    let isAtivo = true; // Por padrão, incluir se não tiver campo de status
                    
                    // Para contratos: status === 'ativo'
                    if (key === 'contratos' && item.status) {
                      isAtivo = String(item.status).toLowerCase() === 'ativo';
                    }
                    // Para títulos: status !== 'cancelado'
                    else if (key === 'titulos' && item.status) {
                      isAtivo = String(item.status).toLowerCase() !== 'cancelado';
                    }
                    // Para outros relacionamentos: verificar campo ativo ou status
                    else if (item.ativo !== undefined) {
                      isAtivo = item.ativo === true || item.ativo === 1;
                    } else if (item.status !== undefined) {
                      const statusLower = String(item.status).toLowerCase();
                      isAtivo = !['cancelado', 'inativo', 'excluido', 'deleted', 'suspenso'].includes(statusLower);
                    }
                    
                    return isAtivo ? item.id : null;
                  }
                  return null;
                })
                .filter((id: any) => id !== null);
              
              if (ids.length > 0) {
                limpo[`${key}_ids`] = ids; // Usar sufixo _ids para indicar que é array de IDs
              }
            } else if (value && typeof value === 'object' && (value as any).id !== undefined) {
              // Se for um único objeto, verificar se está ativo antes de incluir
              const item = value as any;
              let isAtivo = true; // Por padrão, incluir se não tiver campo de status
              
              // Para contratos: status === 'ativo'
              if (key === 'contratos' && item.status) {
                isAtivo = String(item.status).toLowerCase() === 'ativo';
              }
              // Para títulos: status !== 'cancelado'
              else if (key === 'titulos' && item.status) {
                isAtivo = String(item.status).toLowerCase() !== 'cancelado';
              }
              // Para outros relacionamentos: verificar campo ativo ou status
              else if (item.ativo !== undefined) {
                isAtivo = item.ativo === true || item.ativo === 1;
              } else if (item.status !== undefined) {
                const statusLower = String(item.status).toLowerCase();
                isAtivo = !['cancelado', 'inativo', 'excluido', 'deleted', 'suspenso'].includes(statusLower);
              }
              
              if (isAtivo) {
                limpo[`${key}_id`] = item.id;
              }
            }
            continue;
          }
          
          // Incluir created_at_formatada e outros campos formatados como strings
          if (key === 'created_at_formatada' || key.endsWith('_formatada')) {
            if (typeof value === 'string') {
              limpo[key] = value;
            }
            continue;
          }
          
          // Para relacionamentos (objetos aninhados), manter apenas ID
          if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
            const relObj = value as any;
            if (relObj.id !== undefined) {
              limpo[`${key}_id`] = relObj.id;
            }
            continue;
          }
          
          // Manter valores primitivos (exceto null que já foi tratado)
          if (value instanceof Date || typeof value !== 'object') {
            if (value instanceof Date) {
              limpo[key] = safeFormatDateISOLocal(value);
            } else {
              limpo[key] = value;
            }
            continue;
          }
          
          // Para arrays genéricos, converter para array de IDs ou valores primitivos
          if (Array.isArray(value)) {
            // Se array vazio, não incluir para evitar conflitos de mapeamento
            if (value.length === 0) {
              continue;
            }
            
            const arrLimpo = value.slice(0, 5).map((item: any) => {
              if (item && typeof item === 'object' && item.id !== undefined) {
                return item.id;
              }
              return typeof item === 'object' ? null : item;
            }).filter((item: any) => item !== null);
            
            // Só incluir se tiver itens válidos
            if (arrLimpo.length > 0) {
              limpo[key] = arrLimpo;
            }
            continue;
          }
        }
        
        return Object.keys(limpo).length > 0 ? limpo : null;
      };

      // Limpar dados antes de criar o documento
      const dadosAnterioresLimpos = limparDados(dados.dados_anteriores || null);
      const dadosNovosLimpos = limparDados(dados.dados_novos || null);

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
      await client.index({
        index: ES_DATA_STREAM.AUDITORIA,
        document,
        refresh: isAgent ? 'wait_for' : false
      });

      // Log removido para evitar poluição do console
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
  observacoes?: string
): Promise<void> {
  try {
    const elasticsearchService = getElasticsearchService();
    const client = elasticsearchService.getClient();
    if (!client) return;
    const isConnected = await elasticsearchService.checkConnection();
    if (!isConnected) return;
    const limpar = (d: Record<string, unknown> | null): Record<string, unknown> | null => {
      if (!d || typeof d !== 'object') return null;
      try {
        return JSON.parse(JSON.stringify(d)) as Record<string, unknown>;
      } catch {
        return d;
      }
    };

    const da = limpar(dadosAnteriores);
    const dn = limpar(dadosNovos);
    const relatedIds = collectRelatedEntityIds({
      entidadeId,
      dadosNovos: dn,
      dadosAnteriores: da
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
      origem_auditoria: 'agendador' as const
    };
    if (relatedIds.length > 0) {
      document.related_entity_ids = relatedIds;
    }

    await client.index({
        index: ES_DATA_STREAM.AUDITORIA,
        document
      });
  } catch (error) {
    logger.warn('Falha ao registrar auditoria (Sistema) no Elasticsearch', {
      context: 'ElasticsearchAuditService',
      action: 'registrarAtualizacaoElasticsearchSistema',
      entidade,
      entidade_id: entidadeId,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
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


