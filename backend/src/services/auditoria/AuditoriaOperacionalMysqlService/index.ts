import { Op, literal, type WhereOptions } from 'sequelize';
import { sequelize } from '../../../config/database';
import { SistemaLogOperacional } from '../../../models/sistema/SistemaLogOperacional';
import { Usuario } from '../../../models/cadastros/Usuario';
import {
  ENTIDADES_BLOCKDOMI,
  ENTIDADES_PAINEL_LOGS_SAAS,
  ENTIDADES_SAAS,
} from '../auditoriaConstants';
import { sqlExcluirLogContextosEspecializados } from '../../sistema/sistemaLogOperacionalContextos';

const TIPO_OPERACIONAL_TO_ACAO: Record<string, string> = {
  inseriu: 'create',
  editou: 'update',
  excluiu: 'delete',
  login: 'login',
  logout: 'logout',
  exportou: 'export',
  importou: 'import',
  executou: 'executar',
};

function tipoToAcaoAuditoria(tipo: string): string {
  return TIPO_OPERACIONAL_TO_ACAO[tipo] ?? tipo;
}

export interface ListOperacionalMysqlParams {
  page: number;
  limit: number;
  search?: string;
  searchField?: string;
  acao?: string;
  entidade?: string;
  moduloBlockdomi?: boolean;
  usuario_id?: number;
  dataInicio?: string;
  dataFim?: string;
  sortColumn?: string;
  sortDirection?: string;
  empresaId?: number | null;
  excludeSaasEntities?: boolean;
  filterSaasOnly?: boolean;
  /** Lista agregada dos modais "Logs SaaS" — restringe `recurso` a ENTIDADES_PAINEL_LOGS_SAAS */
  filterPainelLogsSaasOnly?: boolean;
  /** Apenas login/logout cujo usuário existe em `saas_usuarios_super` (modal acesso no painel SaaS). */
  filterAcessoUsuarioSuperSaas?: boolean;
  comUsuarioObrigatorio?: boolean;
  semUsuarioObrigatorio?: boolean;
  origemAuditoria?: string;
}

function acaoQueryToTipos(acaoRaw: string | undefined): string[] | null {
  if (!acaoRaw?.trim()) return null;
  const acoes = acaoRaw.split(',').map((a) => a.trim()).filter(Boolean);
  const map: Record<string, string> = {
    create: 'inseriu',
    update: 'editou',
    delete: 'excluiu',
    login: 'login',
    logout: 'logout',
    export: 'exportou',
    import: 'importou',
    executar: 'executou',
  };
  const tipos = acoes.map((a) => map[a] ?? a).filter(Boolean);
  return tipos.length ? tipos : null;
}

/** JSON no MySQL pode vir como objeto, string ou Buffer (driver/sequelize). */
function normalizeOperacionalPayloadRaw(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (Buffer.isBuffer(raw)) {
    const s = raw.toString('utf8').trim();
    if (!s) return null;
    try {
      const p = JSON.parse(s) as unknown;
      if (p != null && typeof p === 'object' && !Array.isArray(p)) return p as Record<string, unknown>;
    } catch {
      return null;
    }
    return null;
  }
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return null;
    try {
      const p = JSON.parse(s) as unknown;
      if (p != null && typeof p === 'object' && !Array.isArray(p)) return p as Record<string, unknown>;
    } catch {
      return { _valor_texto: s.slice(0, 2000) };
    }
    return null;
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return null;
}

const PAYLOAD_META_KEYS = new Set([
  'elasticsearch_audit_id',
  'elasticsearch_log_id',
  'rotina_execucao_id',
  'acao_auditoria',
  'origem_auditoria',
  'request',
  'log_contexto',
  'tipo',
  'tabela',
  'origem',
  'routine_id',
  'routine_nome',
  'routine_tipo',
  'status',
  'duracao_ms',
  'empresa_id',
  'usuario_id',
  'erro',
  'resultado_resumo',
  '_truncado',
  'saas_usuario_id',
  'saas_usuario_nome',
  'saas_usuario_email',
  '_tamanho_aproximado',
  '_erro_serializacao',
  'mensagem_operacional',
]);

function extractDadosFromPayload(
  payload: Record<string, unknown>,
  acao: string
): { dados_anteriores: Record<string, unknown> | null; dados_novos: Record<string, unknown> | null } {
  const antesPayload = payload.dados_anteriores;
  const depoisPayload = payload.dados_novos;
  if (
    antesPayload != null &&
    typeof antesPayload === 'object' &&
    !Array.isArray(antesPayload) &&
    depoisPayload != null &&
    typeof depoisPayload === 'object' &&
    !Array.isArray(depoisPayload)
  ) {
    return {
      dados_anteriores: antesPayload as Record<string, unknown>,
      dados_novos: depoisPayload as Record<string, unknown>,
    };
  }

  const body: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (!PAYLOAD_META_KEYS.has(k)) body[k] = v;
  }
  if (Object.keys(body).length === 0) {
    return { dados_anteriores: null, dados_novos: null };
  }
  if (acao === 'delete') {
    return { dados_anteriores: body, dados_novos: null };
  }
  return { dados_anteriores: null, dados_novos: body };
}

function rowToListItem(
  row: SistemaLogOperacional,
  usuarioRow: { nome?: string | null; email?: string | null } | null | undefined,
  includeDados = false
): Record<string, unknown> {
  const payloadObj = normalizeOperacionalPayloadRaw(row.payload);
  const payload = payloadObj ?? {};
  const acaoPayload = payload.acao_auditoria;
  const acao =
    typeof acaoPayload === 'string' && acaoPayload.length > 0
      ? acaoPayload
      : tipoToAcaoAuditoria(row.tipo);
  const rid =
    row.recurso_id != null && /^\d+$/.test(String(row.recurso_id).trim())
      ? parseInt(String(row.recurso_id).trim(), 10)
      : null;
  const recurso = row.recurso ?? '';
  const saas = (ENTIDADES_SAAS as readonly string[]).includes(recurso);
  const reqRota = typeof payload.request === 'string' ? payload.request : null;
  const dados = includeDados && payloadObj ? extractDadosFromPayload(payloadObj, acao) : { dados_anteriores: null, dados_novos: null };

  return {
    id: `op:${row.id}`,
    operacional_id: String(row.id),
    timestamp: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    usuario_id: row.usuario_id,
    usuario_nome: usuarioRow?.nome ?? null,
    usuario_email: usuarioRow?.email ?? null,
    empresa_id: row.empresa_id,
    acao,
    entidade: recurso,
    entidade_id: rid,
    dados_anteriores: dados.dados_anteriores,
    dados_novos: dados.dados_novos,
    ip_address: row.ip_address,
    user_agent: row.user_agent,
    rota: reqRota,
    metodo_http: null,
    observacoes: row.mensagem,
    saas,
    payload:
      payloadObj && Object.keys(payloadObj).length > 0
        ? payloadObj
        : row.mensagem?.trim()
          ? { mensagem_operacional: row.mensagem.trim().slice(0, 4000) }
          : null,
  };
}

export class AuditoriaOperacionalMysqlService {
  static async list(params: ListOperacionalMysqlParams): Promise<{
    logs: Record<string, unknown>[];
    total: number;
  }> {
    const and: WhereOptions[] = [literal(sqlExcluirLogContextosEspecializados())];

    if (params.moduloBlockdomi) {
      and.push({ recurso: { [Op.in]: [...ENTIDADES_BLOCKDOMI] } });
    } else if (params.entidade?.trim()) {
      const parts = params.entidade
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (parts.length === 1) {
        and.push({ recurso: parts[0] });
      } else if (parts.length > 1) {
        and.push({ recurso: { [Op.in]: parts } });
      }
    }

    if (params.empresaId != null && params.empresaId > 0) {
      and.push({ empresa_id: params.empresaId });
    }

    if (params.excludeSaasEntities) {
      and.push({
        [Op.or]: [{ recurso: null }, { recurso: { [Op.notIn]: [...ENTIDADES_SAAS] } }],
      });
    }
    if (params.filterSaasOnly) {
      and.push({ recurso: { [Op.in]: [...ENTIDADES_SAAS] } });
    }
    if (params.filterPainelLogsSaasOnly) {
      and.push({ recurso: { [Op.in]: [...ENTIDADES_PAINEL_LOGS_SAAS] } });
    }

    if (params.filterAcessoUsuarioSuperSaas) {
      and.push(
        literal(
          '`SistemaLogOperacional`.`usuario_id` IN (SELECT `id` FROM `saas_usuarios_super`)'
        )
      );
    }

    if (params.usuario_id != null && params.usuario_id > 0) {
      and.push({ usuario_id: params.usuario_id });
    }
    if (params.comUsuarioObrigatorio) {
      and.push(literal('`SistemaLogOperacional`.`usuario_id` IS NOT NULL'));
    }
    if (params.semUsuarioObrigatorio) {
      and.push(literal('`SistemaLogOperacional`.`usuario_id` IS NULL'));
    }

    if (params.origemAuditoria?.trim()) {
      const o = params.origemAuditoria.trim();
      and.push(
        literal(
          `(JSON_UNQUOTE(JSON_EXTRACT(\`SistemaLogOperacional\`.\`payload\`, '$.origem_auditoria')) = ${sequelize.escape(o)})`
        )
      );
    }

    const tipos = acaoQueryToTipos(params.acao);
    if (tipos) {
      and.push({ tipo: { [Op.in]: tipos } });
    }

    if (params.dataInicio || params.dataFim) {
      const range: { [Op.gte]?: Date; [Op.lte]?: Date } = {};
      if (params.dataInicio) range[Op.gte] = new Date(params.dataInicio);
      if (params.dataFim) {
        const f = new Date(params.dataFim);
        f.setHours(23, 59, 59, 999);
        range[Op.lte] = f;
      }
      and.push({ created_at: range });
    }

    const search = params.search?.trim();
    if (search) {
      const like = `%${search.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
      const sf = params.searchField;
      if (sf === 'ip_address') {
        and.push({ ip_address: { [Op.like]: like } });
      } else if (sf === 'entidade') {
        and.push({ recurso: { [Op.like]: like } });
      } else if (sf === 'usuario_email') {
        and.push({ ['$usuario.email$' as never]: { [Op.like]: like } });
      } else if (sf === 'usuario_nome') {
        and.push({ ['$usuario.nome$' as never]: { [Op.like]: like } });
      } else if (sf === 'timestamp') {
        const digits = search.replace(/\D/g, '');
        if (digits.length >= 8) {
          const y = digits.slice(0, 4);
          const m = digits.slice(4, 6);
          const d = digits.slice(6, 8);
          const start = new Date(`${y}-${m}-${d}T00:00:00`);
          const end = new Date(`${y}-${m}-${d}T23:59:59.999`);
          if (!Number.isNaN(start.getTime())) and.push({ created_at: { [Op.between]: [start, end] } });
        }
      } else {
        and.push({
          [Op.or]: [
            { mensagem: { [Op.like]: like } },
            { recurso: { [Op.like]: like } },
            { tipo: { [Op.like]: like } },
            { ip_address: { [Op.like]: like } },
            { ['$usuario.nome$' as never]: { [Op.like]: like } },
            { ['$usuario.email$' as never]: { [Op.like]: like } },
          ],
        });
      }
    }

    const where: WhereOptions = and.length > 0 ? { [Op.and]: and } : {};

    const sortCol =
      params.sortColumn === 'timestamp' || params.sortColumn === 'created_at' ? 'created_at' : 'created_at';
    const sortDir = (params.sortDirection || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    const order: [string, string][] = [[sortCol, sortDir]];

    const page = Math.max(1, params.page);
    const limit = Math.min(100, Math.max(1, params.limit));
    const offset = (page - 1) * limit;

    const { rows, count } = await SistemaLogOperacional.findAndCountAll({
      where,
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['nome', 'email'],
          required: false,
        },
      ],
      order,
      limit,
      offset,
      distinct: true,
    });

    const logs = rows.map((r) =>
      rowToListItem(r, (r as unknown as { usuario?: { nome?: string | null; email?: string | null } }).usuario)
    );

    return { logs, total: count };
  }

  static async findByEntity(params: {
    entidade: string;
    entidadeId: string;
    empresaId?: number | null;
    excludeSaasEntities?: boolean;
    filterSaasOnly?: boolean;
    limit?: number;
    sortDirection?: 'asc' | 'desc';
  }): Promise<Record<string, unknown>[]> {
    const and: WhereOptions[] = [{ recurso: params.entidade }];
    const entidadeIdStr = String(params.entidadeId).trim();
    const isUuid = /^[a-f0-9-]{36}$/i.test(entidadeIdStr);

    if (!isUuid && /^\d+$/.test(entidadeIdStr)) {
      and.push({ recurso_id: entidadeIdStr });
    }

    if (params.empresaId != null && params.empresaId > 0) {
      and.push({ empresa_id: params.empresaId });
    }
    if (params.excludeSaasEntities) {
      and.push({
        [Op.or]: [{ recurso: null }, { recurso: { [Op.notIn]: [...ENTIDADES_SAAS] } }],
      });
    }
    if (params.filterSaasOnly) {
      and.push({ recurso: { [Op.in]: [...ENTIDADES_SAAS] } });
    }

    const sortDir = params.sortDirection === 'desc' ? 'DESC' : 'ASC';
    const limit = params.limit ?? 10000;

    const { rows } = await SistemaLogOperacional.findAndCountAll({
      where: { [Op.and]: and },
      order: [['created_at', sortDir]],
      limit,
    });

    let logs = rows.map((r) => rowToListItem(r, null, true));

    if (isUuid) {
      const matchEntityId = (d: unknown) =>
        d != null &&
        typeof d === 'object' &&
        !Array.isArray(d) &&
        ((d as Record<string, unknown>).entity_id_str === entidadeIdStr ||
          String((d as Record<string, unknown>).entity_id_str) === entidadeIdStr);

      logs = logs.filter(
        (log) =>
          matchEntityId(log.dados_novos) ||
          matchEntityId(log.dados_anteriores) ||
          (log.entidade_id === 0 && log.entidade === params.entidade)
      );
    }

    return logs;
  }
}
