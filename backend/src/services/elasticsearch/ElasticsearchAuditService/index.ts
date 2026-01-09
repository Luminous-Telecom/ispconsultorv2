/**
 * Serviço de Auditoria com Elasticsearch
 * Registra ações críticas do sistema no Elasticsearch
 * 
 * @module services/elasticsearch/ElasticsearchAuditService
 */
import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import { AuthenticatedRequest } from '../../../types/auth';
import { getElasticsearchService } from '../ElasticsearchService';
import { logger } from '../../../utils/logger';
import { safeFormatDateISOLocal } from '../../../utils/timezoneUtils';

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
      logger.debug('Iniciando registro de auditoria no Elasticsearch', {
        acao: dados.acao,
        entidade: dados.entidade,
        entidade_id: dados.entidade_id
      });

      const elasticsearchService = getElasticsearchService();
      const client = elasticsearchService.getClient();

      if (!client) {
        // Cliente Elasticsearch não disponível
        logger.warn('Cliente Elasticsearch não disponível', {
          context: 'ElasticsearchAuditService',
          action: 'registrarAuditoriaElasticsearch',
          acao: dados.acao,
          entidade: dados.entidade
        });
        return;
      }

      logger.debug('Cliente Elasticsearch obtido, verificando conexão', {
        acao: dados.acao,
        entidade: dados.entidade
      });

      // Verificar conexão
      const isConnected = await elasticsearchService.checkConnection();
      
      if (!isConnected) {
        // Elasticsearch não disponível
        logger.warn('Elasticsearch não disponível', {
          context: 'ElasticsearchAuditService',
          action: 'registrarAuditoriaElasticsearch',
          acao: dados.acao,
          entidade: dados.entidade
        });
        return;
      }

      logger.debug('Conexão com Elasticsearch verificada, garantindo índice', {
        acao: dados.acao,
        entidade: dados.entidade,
        index: elasticsearchService.getIndexName()
      });

      // Garantir que o índice existe
      await elasticsearchService.ensureIndex();
      
      logger.debug('Índice garantido, preparando documento', {
        acao: dados.acao,
        entidade: dados.entidade
      });

      // Obter dados do usuário
      const userData = getUserData(req);

      // Limpar dados removendo apenas campos internos do Sequelize e campos muito grandes
      const limparDados = (dados: Record<string, unknown> | null): Record<string, unknown> | null => {
        if (!dados || typeof dados !== 'object') return null;
        
        const limpo: Record<string, unknown> = {};
        const camposExcluir = [
          'dataValues', '_changed', '_options', 'isNewRecord', '_previousDataValues', 
          '$modelOptions', 'Model', 'sequelize', 'tableName',
          'xml', 'pdf_base64', 'pdf_url', 'danfe_url',
          'pagamentos', 'arquivos', 'created_at_formatada', 'saldo_devedor', 'vencida'
        ];
        
        for (const [key, value] of Object.entries(dados)) {
          // Ignorar campos internos do Sequelize, campos muito grandes e relacionamentos
          if (key.startsWith('_') || key.startsWith('$') || camposExcluir.includes(key)) {
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
          
          // Manter todos os valores primitivos
          if (value === null || value instanceof Date || typeof value !== 'object') {
            if (value instanceof Date) {
              limpo[key] = safeFormatDateISOLocal(value);
            } else {
              limpo[key] = value;
            }
            continue;
          }
          
          // Para arrays, converter para array de IDs ou remover se for relacionamento
          if (Array.isArray(value)) {
            const arrLimpo = value.slice(0, 5).map((item: any) => {
              if (item && typeof item === 'object' && item.id !== undefined) {
                return item.id;
              }
              return typeof item === 'object' ? null : item;
            }).filter((item: any) => item !== null);
            
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

      const document = {
        usuario_id: userData.id,
        usuario_nome: userData.nome,
        usuario_email: userData.email,
        acao: dados.acao,
        entidade: dados.entidade,
        entidade_id: dados.entidade_id || null,
        dados_anteriores: dadosAnterioresLimpos,
        dados_novos: dadosNovosLimpos,
        ip_address: getClientIp(req),
        user_agent: getUserAgent(req),
        rota: dados.rota || req.originalUrl || null,
        metodo_http: dados.metodo_http || req.method || null,
        observacoes: dados.observacoes || null,
        timestamp: safeFormatDateISOLocal(new Date()) || ''
      };

      // Validar se o documento pode ser serializado antes de enviar
      logger.debug('Validando serialização do documento', {
        acao: dados.acao,
        entidade: dados.entidade,
        tamanho_dados_anteriores: dadosAnterioresLimpos ? Object.keys(dadosAnterioresLimpos).length : 0,
        tamanho_dados_novos: dadosNovosLimpos ? Object.keys(dadosNovosLimpos).length : 0
      });

      try {
        const documentString = JSON.stringify(document);
        logger.debug('Documento serializado com sucesso', {
          acao: dados.acao,
          entidade: dados.entidade,
          tamanho_documento: documentString.length
        });
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
        
        console.error('--- Detalhes do objeto de erro ---');
        console.error('Tipo:', typeof error);
        console.error('Chaves:', Object.keys(err));
        console.error('Tem response:', !!err.response);
        console.error('Tem meta:', !!err.meta);
        console.error('Tem cause:', !!err.cause);
        console.error('Tem code:', !!err.code);
        
        if (err.response) {
          errorDetails.elasticsearch_response = {
            status: err.response.status,
            statusText: err.response.statusText,
            data: typeof err.response.data === 'string' ? err.response.data.substring(0, 500) : err.response.data
          };
          
          console.error('--- Resposta do Elasticsearch ---');
          console.error('Status:', err.response.status);
          console.error('Status Text:', err.response.statusText);
          console.error('Data:', typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data, null, 2));
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
          
          console.error('--- Metadados do erro Elasticsearch ---');
          console.error('Status Code:', err.meta.statusCode);
          console.error('Body:', typeof err.meta.body === 'string' ? err.meta.body : JSON.stringify(err.meta.body, null, 2));
          console.error('Request Method:', err.meta.request?.method);
          console.error('Request Path:', err.meta.request?.path);
        }
        
        // Adicionar outras propriedades do erro que podem ser úteis
        if (err.name) {
          errorDetails.error_name = err.name;
          console.error('Nome do erro:', err.name);
        }
        if (err.code) {
          errorDetails.error_code = err.code;
          console.error('Código do erro:', err.code);
        }
        if (err.cause) {
          errorDetails.error_cause = err.cause;
          console.error('Causa do erro:', err.cause);
        }
      }
      
      // Log completo do erro
      console.error('--- Erro completo ---');
      console.error('String:', String(error));
      if (error instanceof Error) {
        console.error('JSON:', JSON.stringify({
          name: error.name,
          message: error.message,
          stack: error.stack
        }, null, 2));
      } else {
        console.error('JSON:', JSON.stringify(error, null, 2));
      }
      
      // Log como warning em vez de error, já que não é crítico
      logger.warn('Falha ao registrar auditoria no Elasticsearch (não crítico)', errorDetails);
      
      console.error('=== FIM DO ERRO DE AUDITORIA ELASTICSEARCH ===');
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


