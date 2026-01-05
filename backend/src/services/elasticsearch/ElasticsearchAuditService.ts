/**
 * Serviço de Auditoria com Elasticsearch
 * Registra ações críticas do sistema no Elasticsearch
 * 
 * @module services/elasticsearch/ElasticsearchAuditService
 */
import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import { AuthenticatedRequest } from '../../types/auth';
import { getElasticsearchService } from './ElasticsearchService';
import { logger } from '../../utils/logger';

export type AcaoAuditoria = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'import';

interface DadosAuditoria {
  acao: AcaoAuditoria;
  entidade: string;
  entidade_id?: number | null;
  dados_anteriores?: Record<string, unknown> | null;
  dados_novos?: Record<string, unknown> | null;
  rota?: string;
  metodo_http?: string;
  observacoes?: string | null;
}

/**
 * Obter IP do cliente da requisição
 */
function getClientIp(req: Request): string | null {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
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
 * Obter dados do usuário autenticado
 */
function getUserData(req: Request | AuthenticatedRequest): {
  id: number | null;
  nome: string | null;
  email: string | null;
} {
  // Verificar se é AuthenticatedRequest e tem user
  const authenticatedReq = req as AuthenticatedRequest;
  const userPayload = authenticatedReq.user as JwtPayload | undefined;
  
  if (!userPayload) {
    return { id: null, nome: null, email: null };
  }

  // O payload JWT contém sub (userId), email e role
  const userId = userPayload.sub ? parseInt(userPayload.sub, 10) : null;
  const email = typeof userPayload.email === 'string' ? userPayload.email : null;
  const nome = typeof userPayload.nome === 'string' ? userPayload.nome : null;

  return {
    id: userId,
    nome,
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
  // Executar de forma assíncrona sem bloquear
  setImmediate(async () => {
    try {
      const elasticsearchService = getElasticsearchService();
      const client = elasticsearchService.getClient();

      if (!client) {
        // Cliente Elasticsearch não disponível
        logger.warn('Cliente Elasticsearch não disponível', {
          context: 'ElasticsearchAuditService',
          action: 'registrarAuditoriaElasticsearch'
        });
        return;
      }

      // Verificar conexão
      const isConnected = await elasticsearchService.checkConnection();
      
      if (!isConnected) {
        // Elasticsearch não disponível
        logger.warn('Elasticsearch não disponível', {
          context: 'ElasticsearchAuditService',
          action: 'registrarAuditoriaElasticsearch'
        });
        return;
      }

      // Garantir que o índice existe
      await elasticsearchService.ensureIndex();

      // Obter dados do usuário
      const userData = getUserData(req);

      // Preparar documento para Elasticsearch
      const document = {
        usuario_id: userData.id,
        usuario_nome: userData.nome,
        usuario_email: userData.email,
        acao: dados.acao,
        entidade: dados.entidade,
        entidade_id: dados.entidade_id || null,
        dados_anteriores: dados.dados_anteriores || null,
        dados_novos: dados.dados_novos || null,
        ip_address: getClientIp(req),
        user_agent: getUserAgent(req),
        rota: dados.rota || req.originalUrl || null,
        metodo_http: dados.metodo_http || req.method || null,
        observacoes: dados.observacoes || null,
        timestamp: new Date().toISOString()
      };

      // Indexar documento no Elasticsearch
      const result = await client.index({
        index: elasticsearchService.getIndexName(),
        document
      });

      logger.info('Ação registrada na auditoria (Elasticsearch)', {
        context: 'ElasticsearchAuditService',
        acao: dados.acao,
        entidade: dados.entidade,
        entidade_id: dados.entidade_id,
        usuario_id: userData.id,
        document_id: result._id,
        index: elasticsearchService.getIndexName()
      });
    } catch (error) {
      // Não lançar erro para não interromper o fluxo principal
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;

      logger.error('Erro ao registrar auditoria no Elasticsearch', {
        context: 'ElasticsearchAuditService',
        action: 'registrarAuditoriaElasticsearch',
        error: errorMessage,
        stack: errorStack,
        dados: {
          acao: dados.acao,
          entidade: dados.entidade,
          entidade_id: dados.entidade_id
        }
      });
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
  observacoes?: string
): Promise<void> {
  await registrarAuditoriaElasticsearch(req, {
    acao: 'create',
    entidade,
    entidade_id: entidadeId,
    dados_novos: dadosNovos,
    observacoes
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
  observacoes?: string
): Promise<void> {
  await registrarAuditoriaElasticsearch(req, {
    acao: 'update',
    entidade,
    entidade_id: entidadeId,
    dados_anteriores: dadosAnteriores,
    dados_novos: dadosNovos,
    observacoes
  });
}

/**
 * Registrar exclusão de entidade
 */
export async function registrarExclusaoElasticsearch(
  req: Request | AuthenticatedRequest,
  entidade: string,
  entidadeId: number,
  dadosAnteriores: Record<string, unknown>,
  observacoes?: string
): Promise<void> {
  await registrarAuditoriaElasticsearch(req, {
    acao: 'delete',
    entidade,
    entidade_id: entidadeId,
    dados_anteriores: dadosAnteriores,
    observacoes
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

