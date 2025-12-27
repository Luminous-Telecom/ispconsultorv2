/**
 * Middleware de Auditoria Automática
 * Captura automaticamente ações de create, update e delete
 * 
 * @module middleware/auditMiddleware
 */
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { 
  registrarCriacaoElasticsearch, 
  registrarAtualizacaoElasticsearch, 
  registrarExclusaoElasticsearch 
} from '../services/elasticsearch/ElasticsearchAuditService';
import { logger } from '../utils/logger';

// Mapeamento de rotas para entidades
const ROUTE_ENTITY_MAP: Record<string, string> = {
  '/api/clientes': 'Cliente',
  '/api/planos': 'Plano',
  '/api/bancos': 'Banco',
  '/api/usuarios': 'Usuario',
  '/api/titulos': 'Titulo',
  '/api/contratos': 'Contrato',
  '/api/dados-empresa': 'DadosEmpresa',
  '/api/parametros': 'Parametros',
  '/api/servidores-email': 'ServidorEmail',
  '/api/servidores-whatsapp': 'ServidorWhatsApp',
  '/api/modelos-documento': 'ModeloDocumento',
  '/api/dias-vencimento': 'DiasVencimento',
  '/api/termos-contrato': 'TermoContrato',
  '/api/modelos-termo': 'ModeloTermo',
  '/api/assinaturas-digital': 'AssinaturaDigital',
  '/api/assinatura-digital': 'AssinaturaDigital',
  '/api/cliente-arquivos': 'ClienteArquivo',
  '/api/scheduler': 'ScheduledRoutine',
};

/**
 * Extrai o nome da entidade da rota
 */
function getEntityFromRoute(path: string): string | null {
  // Remover query params
  const cleanPath = path.split('?')[0];
  
  // Tentar encontrar correspondência exata
  for (const [route, entity] of Object.entries(ROUTE_ENTITY_MAP)) {
    if (cleanPath.startsWith(route)) {
      return entity;
    }
  }
  
  return null;
}

/**
 * Extrai o ID da entidade da rota ou do body
 */
function getEntityId(req: Request): number | null {
  // Tentar pegar do parâmetro da rota
  const paramId = req.params.id;
  if (paramId) {
    const id = parseInt(paramId, 10);
    if (!isNaN(id)) {
      return id;
    }
  }
  
  // Tentar pegar do body (para create)
  if (req.body?.id) {
    const id = parseInt(String(req.body.id), 10);
    if (!isNaN(id)) {
      return id;
    }
  }
  
  return null;
}

/**
 * Serializa objeto para JSON seguro (remove funções, circular refs, etc)
 */
function safeSerialize(obj: unknown): Record<string, unknown> | null {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  try {
    // Se já é um objeto simples, retornar
    if (typeof obj === 'object' && !Array.isArray(obj) && obj.constructor === Object) {
      const serialized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        // Ignorar funções e símbolos
        if (typeof value !== 'function' && typeof value !== 'symbol') {
          serialized[key] = value;
        }
      }
      return serialized;
    }
    
    // Tentar JSON stringify/parse para objetos complexos
    return JSON.parse(JSON.stringify(obj, (key, value) => {
      // Remover funções
      if (typeof value === 'function') {
        return undefined;
      }
      return value;
    }));
  } catch (error) {
    logger.warn('Erro ao serializar objeto para auditoria', {
      context: 'auditMiddleware',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
    return null;
  }
}

/**
 * Middleware para capturar dados antes da operação (para update/delete)
 */
export const auditCaptureMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const method = req.method.toUpperCase();
  
  // Apenas para UPDATE e DELETE
  if (method !== 'PUT' && method !== 'PATCH' && method !== 'DELETE') {
    return next();
  }

  const entity = getEntityFromRoute(req.originalUrl);
  if (!entity) {
    return next();
  }

  const entityId = getEntityId(req);
  if (!entityId) {
    return next();
  }

  // Armazenar dados originais para uso posterior
  // Vamos usar uma propriedade customizada no request
  (req as any).__auditEntity = entity;
  (req as any).__auditEntityId = entityId;
  (req as any).__auditMethod = method;
  (req as any).__auditOriginalUrl = req.originalUrl;

  // Para DELETE, não precisamos buscar dados anteriores aqui
  // O controller deve fornecer os dados antes de deletar
  // Para UPDATE, também não buscamos aqui para não duplicar queries
  // O controller deve fornecer os dados anteriores

  next();
};

/**
 * Middleware para registrar auditoria após operação bem-sucedida
 */
export const auditLogMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const method = req.method.toUpperCase();
  const originalSend = res.json.bind(res);
  const originalStatus = res.status.bind(res);

  // Interceptar resposta para capturar status
  let responseStatus = 200;
  res.status = function(code: number) {
    responseStatus = code;
    return originalStatus(code);
  } as typeof res.status;

  res.json = function(body: unknown) {
    // Chamar função original primeiro
    const result = originalSend(body);

    // Registrar auditoria apenas se a operação foi bem-sucedida
    if (responseStatus >= 200 && responseStatus < 300) {
      setImmediate(async () => {
        try {
          const entity = (req as any).__auditEntity || getEntityFromRoute(req.originalUrl);
          if (!entity) {
            logger.debug('Entidade não encontrada para auditoria', {
              context: 'auditMiddleware',
              method,
              url: req.originalUrl
            });
            return;
          }

          const entityId = (req as any).__auditEntityId || getEntityId(req);
          
          logger.debug('Processando auditoria', {
            context: 'auditMiddleware',
            method,
            entity,
            entityId,
            url: req.originalUrl
          });
          
          // Para CREATE, pegar ID da resposta
          if (method === 'POST' && body && typeof body === 'object') {
            const responseBody = body as Record<string, unknown>;
            if (responseBody.success && responseBody.data) {
              const data = responseBody.data as Record<string, unknown>;
              if (data.id) {
                const id = parseInt(String(data.id), 10);
                if (!isNaN(id)) {
                  await registrarCriacaoElasticsearch(
                    req,
                    entity,
                    id,
                    safeSerialize(data) || {},
                    `Criação via ${req.method} ${req.originalUrl}`
                  );
                }
              }
            }
          }
          
          // Para UPDATE, precisamos que o controller forneça dados anteriores
          // Este middleware apenas registra se os dados estiverem disponíveis
          if ((method === 'PUT' || method === 'PATCH') && entityId) {
            const dadosAnteriores = (req as any).__auditDadosAnteriores;
            const dadosNovos = (req as any).__auditDadosNovos;
            
            logger.debug('Verificando dados de auditoria para UPDATE', {
              context: 'auditMiddleware',
              method,
              entity,
              entityId,
              url: req.originalUrl,
              hasDadosAnteriores: !!dadosAnteriores,
              hasDadosNovos: !!dadosNovos,
              keysAnteriores: dadosAnteriores ? Object.keys(dadosAnteriores).slice(0, 5) : [],
              keysNovos: dadosNovos ? Object.keys(dadosNovos).slice(0, 5) : []
            });
            
            if (dadosAnteriores && dadosNovos) {
              logger.debug('Registrando auditoria de atualização via middleware', {
                context: 'auditMiddleware',
                entity,
                entityId,
                method
              });
              
              await registrarAtualizacaoElasticsearch(
                req,
                entity,
                entityId,
                dadosAnteriores,
                dadosNovos,
                `Atualização via ${req.method} ${req.originalUrl}`
              );
            } else {
              // Se não houver dados, o controller provavelmente já registrou a auditoria diretamente
              // Não é necessário logar como warning, apenas debug para rastreamento
              logger.debug('Dados de auditoria não encontrados para UPDATE - controller pode ter registrado diretamente', {
                context: 'auditMiddleware',
                entity,
                entityId,
                method,
                url: req.originalUrl
              });
            }
          }
          
          // Para DELETE, precisamos que o controller forneça dados anteriores
          if (method === 'DELETE' && entityId) {
            const dadosAnteriores = (req as any).__auditDadosAnteriores;
            
            if (dadosAnteriores) {
              await registrarExclusaoElasticsearch(
                req,
                entity,
                entityId,
                dadosAnteriores,
                `Exclusão via ${req.method} ${req.originalUrl}`
              );
            }
          }
        } catch (error) {
          // Não bloquear resposta em caso de erro na auditoria
          logger.error('Erro ao registrar auditoria no middleware', {
            context: 'auditMiddleware',
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        }
      });
    }

    return result;
  } as typeof res.json;

  next();
};

/**
 * Função helper para controllers registrarem dados anteriores antes de update/delete
 */
export function setAuditData(
  req: Request,
  dadosAnteriores: Record<string, unknown>,
  dadosNovos?: Record<string, unknown>
): void {
  (req as any).__auditDadosAnteriores = dadosAnteriores;
  if (dadosNovos) {
    (req as any).__auditDadosNovos = dadosNovos;
  }
}

