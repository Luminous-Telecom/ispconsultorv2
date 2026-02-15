/**
 * Middleware de Auditoria Automática
 * Captura automaticamente ações de create, update e delete
 * 
 * @module middleware/auditMiddleware
 */
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../types/auth';
// Imports de Elasticsearch removidos - middleware não registra mais automaticamente
// Os controllers devem usar registrarCriacao, registrarAtualizacao, registrarExclusao do AuditoriaService
import { logger } from '../../utils/logger';

// Mapeamento de rotas para entidades
const ROUTE_ENTITY_MAP: Record<string, string> = {
  '/api/clientes': 'Cliente',
  '/api/planos': 'Plano',
  '/api/bancos': 'Banco',
  '/api/tipos-cobranca-contrato': 'TipoCobrancaContrato',
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
  '/api/fornecedores': 'Fornecedor',
  '/api/contas-pagar': 'ContaPagar',
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
 * 
 * NOTA: Este middleware não registra auditoria automaticamente.
 * CREATE/UPDATE/DELETE devem ser registrados explicitamente pelos controllers
 * usando registrarCriacao, registrarAtualizacao, registrarExclusao do AuditoriaService.
 * 
 * Mantido para compatibilidade e possíveis extensões futuras.
 */
export const auditLogMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  // Excluir rotas de webhook da auditoria (não têm usuário autenticado)
  if (req.originalUrl.startsWith('/webhook/')) {
    return next();
  }

  // Middleware atualmente não executa ação automática
  // Controllers devem registrar auditoria explicitamente
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

