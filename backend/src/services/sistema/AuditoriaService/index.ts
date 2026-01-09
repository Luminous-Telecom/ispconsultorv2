import { Auditoria } from '../../../models/sistema/Auditoria';
import { Usuario } from '../../../models/cadastros/Usuario';
import { Op, WhereOptions } from 'sequelize';
import { Request } from 'express';
import { AuthenticatedRequest } from '../../../types/auth';
import { logger } from '../../../utils/logger';
import { safeFormatDateISOLocal } from '../../../utils/timezoneUtils';
import { registrarCriacaoElasticsearch, registrarAtualizacaoElasticsearch, registrarExclusaoElasticsearch, registrarLoginElasticsearch } from '../../elasticsearch/ElasticsearchAuditService';

export interface ListAuditoriaFilters {
  page?: number;
  limit?: number;
  search?: string;
  acao?: string;
  entidade?: string;
  usuario_id?: number;
  data_inicio?: string;
  data_fim?: string;
}

export interface ListAuditoriaResponse {
  success: boolean;
  data: Auditoria[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
  };
}

export class AuditoriaService {
  /**
   * Listar logs de auditoria do banco de dados
   */
  static async listFromDatabase(filters: ListAuditoriaFilters): Promise<ListAuditoriaResponse> {
    const {
      page = 1,
      limit = 15,
      search,
      acao,
      entidade,
      usuario_id,
      data_inicio,
      data_fim
    } = filters;

    const offset = (page - 1) * limit;

    // Construir condições WHERE
    const where: WhereOptions = {};

    if (acao) {
      where.acao = acao as any;
    }

    if (entidade) {
      where.entidade = entidade;
    }

    if (usuario_id) {
      where.usuario_id = usuario_id;
    }

    if (data_inicio || data_fim) {
      where.created_at = {};
      if (data_inicio) {
        (where.created_at as Record<symbol, unknown>)[Op.gte] = new Date(data_inicio);
      }
      if (data_fim) {
        (where.created_at as Record<symbol, unknown>)[Op.lte] = new Date(data_fim);
      }
    }

    // Buscar logs com usuário incluído
    const { count, rows } = await Auditoria.findAndCountAll({
      where,
      include: [{
        model: Usuario,
        as: 'usuario',
        required: false,
        attributes: ['id', 'nome', 'email']
      }],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    // Filtrar por busca se fornecido
    let filteredRows = rows;
    if (search) {
      const searchLower = search.toLowerCase();
      const isRoute = search.startsWith('/api/');
      const isEmail = search.includes('@');
      const isEntity = /^[A-Z][a-zA-Z]*$/.test(search.trim()) && search.trim().length > 2 && !search.includes(' ');

      filteredRows = rows.filter((log: any) => {
        if (isRoute) {
          const dadosAnterioresStr = JSON.stringify(log.dados_anteriores || {}).toLowerCase();
          const dadosNovosStr = JSON.stringify(log.dados_novos || {}).toLowerCase();
          return dadosAnterioresStr.includes(searchLower) || dadosNovosStr.includes(searchLower);
        }
        
        if (isEmail) {
          const usuarioEmail = log.usuario?.email?.toLowerCase() || '';
          return usuarioEmail.includes(searchLower);
        }
        
        if (isEntity) {
          const entidadeNome = log.entidade?.toLowerCase() || '';
          return entidadeNome === searchLower;
        }

        const observacoes = log.observacoes?.toLowerCase() || '';
        const entidadeNome = log.entidade?.toLowerCase() || '';
        const usuarioNome = log.usuario?.nome?.toLowerCase() || '';
        const usuarioEmail = log.usuario?.email?.toLowerCase() || '';
        const ipAddress = log.ip_address?.toLowerCase() || '';
        
        return observacoes.includes(searchLower) ||
               entidadeNome.includes(searchLower) ||
               usuarioNome.includes(searchLower) ||
               usuarioEmail.includes(searchLower) ||
               ipAddress.includes(searchLower);
      });
    }

    // Mapear para formato esperado pelo frontend
    const logs = filteredRows.map((log: any) => {
      // Garantir que dados_anteriores e dados_novos sejam objetos válidos
      let dadosAnteriores = log.dados_anteriores;
      let dadosNovos = log.dados_novos;
      
      // Se forem strings JSON, fazer parse
      if (typeof dadosAnteriores === 'string') {
        try {
          dadosAnteriores = JSON.parse(dadosAnteriores);
        } catch {
          dadosAnteriores = null;
        }
      }
      if (typeof dadosNovos === 'string') {
        try {
          dadosNovos = JSON.parse(dadosNovos);
        } catch {
          dadosNovos = null;
        }
      }
      
      return {
        id: log.id.toString(),
        usuario_id: log.usuario_id,
        usuario_nome: log.usuario?.nome || null,
        usuario_email: log.usuario?.email || null,
        acao: log.acao,
        entidade: log.entidade,
        entidade_id: log.entidade_id,
        dados_anteriores: dadosAnteriores,
        dados_novos: dadosNovos,
        ip_address: log.ip_address,
        user_agent: log.user_agent,
        rota: null,
        metodo_http: null,
        observacoes: log.observacoes,
        timestamp: safeFormatDateISOLocal(log.created_at) || ''
      };
    });

    const total = search ? filteredRows.length : count;
    const paginatedRows = logs.slice(offset, offset + limit);

    return {
      success: true,
      data: paginatedRows as any,
      pagination: {
        current_page: page,
        per_page: limit,
        total,
        last_page: Math.ceil(total / limit),
        from: total > 0 ? offset + 1 : 0,
        to: Math.min(page * limit, total)
      }
    };
  }

  /**
   * Buscar log de auditoria por ID
   */
  static async getById(id: string | number): Promise<Auditoria | null> {
    return await Auditoria.findByPk(id, {
      include: [{
        model: Usuario,
        as: 'usuario',
        required: false,
        attributes: ['id', 'nome', 'email']
      }]
    });
  }
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
  const authenticatedReq = req as AuthenticatedRequest;
  const userPayload = authenticatedReq.user as { sub?: string; email?: string; nome?: string } | undefined;
  
  if (!userPayload) {
    return { id: null, nome: null, email: null };
  }

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
 * Registrar criação de entidade
 */
export async function registrarCriacao(
  req: Request | AuthenticatedRequest,
  entidade: string,
  entidadeId: number,
  dadosNovos: Record<string, unknown>,
  observacoes?: string
): Promise<void> {
  const userData = getUserData(req);
  
  await Auditoria.create({
    usuario_id: userData.id,
    acao: 'create',
    entidade,
    entidade_id: entidadeId,
    dados_novos: dadosNovos,
    ip_address: getClientIp(req),
    user_agent: getUserAgent(req),
    observacoes: observacoes || null
  } as any);

  // Registrar também no Elasticsearch (não bloqueia se falhar)
  registrarCriacaoElasticsearch(req, entidade, entidadeId, dadosNovos, observacoes).catch(() => {});
}

/**
 * Registrar atualização de entidade
 */
export async function registrarAtualizacao(
  req: Request | AuthenticatedRequest,
  entidade: string,
  entidadeId: number,
  dadosAnteriores: Record<string, unknown>,
  dadosNovos: Record<string, unknown>,
  observacoes?: string
): Promise<void> {
  const userData = getUserData(req);
  
  // Garantir que os dados sejam objetos válidos e serializáveis
  // Criar cópias profundas para evitar problemas de referência
  let dadosAntLimpos: Record<string, unknown> | null = null;
  let dadosNovLimpos: Record<string, unknown> | null = null;
  
  try {
    if (dadosAnteriores && typeof dadosAnteriores === 'object' && Object.keys(dadosAnteriores).length > 0) {
      // Serializar e deserializar para garantir que seja um objeto limpo
      dadosAntLimpos = JSON.parse(JSON.stringify(dadosAnteriores));
    }
  } catch (e) {
    // Se falhar, usar os dados originais
    dadosAntLimpos = dadosAnteriores;
  }
  
  try {
    if (dadosNovos && typeof dadosNovos === 'object' && Object.keys(dadosNovos).length > 0) {
      // Serializar e deserializar para garantir que seja um objeto limpo
      dadosNovLimpos = JSON.parse(JSON.stringify(dadosNovos));
    }
  } catch (e) {
    // Se falhar, usar os dados originais
    dadosNovLimpos = dadosNovos;
  }
  
  await Auditoria.create({
    usuario_id: userData.id,
    acao: 'update',
    entidade,
    entidade_id: entidadeId,
    dados_anteriores: dadosAntLimpos,
    dados_novos: dadosNovLimpos,
    ip_address: getClientIp(req),
    user_agent: getUserAgent(req),
    observacoes: observacoes || null
  } as any);

  // Registrar também no Elasticsearch (não bloqueia se falhar)
  registrarAtualizacaoElasticsearch(req, entidade, entidadeId, dadosAnteriores, dadosNovos, observacoes).catch(() => {});
}

/**
 * Registrar exclusão de entidade
 */
export async function registrarExclusao(
  req: Request | AuthenticatedRequest,
  entidade: string,
  entidadeId: number,
  dadosAnteriores: Record<string, unknown>,
  observacoes?: string
): Promise<void> {
  const userData = getUserData(req);
  
  await Auditoria.create({
    usuario_id: userData.id,
    acao: 'delete',
    entidade,
    entidade_id: entidadeId,
    dados_anteriores: dadosAnteriores,
    ip_address: getClientIp(req),
    user_agent: getUserAgent(req),
    observacoes: observacoes || null
  } as any);

  // Registrar também no Elasticsearch (não bloqueia se falhar)
  registrarExclusaoElasticsearch(req, entidade, entidadeId, dadosAnteriores, observacoes).catch(() => {});
}

/**
 * Registrar login
 */
export async function registrarLogin(
  req: Request | AuthenticatedRequest,
  usuarioId: number,
  observacoes?: string
): Promise<void> {
  await Auditoria.create({
    usuario_id: usuarioId,
    acao: 'login',
    entidade: 'Usuario',
    entidade_id: usuarioId,
    ip_address: getClientIp(req),
    user_agent: getUserAgent(req),
    observacoes: observacoes || null
  } as any);

  // Registrar também no Elasticsearch (não bloqueia se falhar)
  registrarLoginElasticsearch(req, usuarioId, observacoes).catch(() => {});
}

