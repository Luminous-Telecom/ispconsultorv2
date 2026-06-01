import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { searchSshAuditLogs, SshAuditAction } from '../../../services/ssh-manager/SshAuditService';
import { sendSuccess, sendError } from '../../../utils/responseUtils';
import { resolveListEmpresaId } from '../../../utils/tenantUtils';
import { parseListQuery } from '../../../utils/listQuery';
import { buildPagination } from '../../../utils/pagination';
import { Agent } from '../../../models/agent/Agent';
import { SshDevice } from '../../../models/ssh-manager/SshDevice';
import { Cliente } from '../../../models/clientes/Cliente';
import { Usuario } from '../../../models/cadastros/Usuario';
import { DadosEmpresa } from '../../../models/sistema/DadosEmpresa';

function clienteDisplayName(c: {
  razao_social?: string | null;
  nome_fantasia?: string | null;
} | null | undefined): string | null {
  if (!c) return null;
  const nf = c.nome_fantasia?.trim();
  if (nf) return nf;
  const rs = c.razao_social?.trim();
  return rs || null;
}

const AGENT_ACTIONS: readonly SshAuditAction[] = ['AGENT_CONNECT', 'AGENT_DISCONNECT'] as const;

function isAgentAction(a: unknown): a is SshAuditAction {
  return typeof a === 'string' && (AGENT_ACTIONS as readonly string[]).includes(a);
}

/** Elasticsearch pode devolver deviceId como string ou número */
function deviceIdKey(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(Math.trunc(raw));
  const s = String(raw).trim();
  return s;
}

async function enrichSshAuditLogsWithCliente(
  logs: Record<string, unknown>[]
): Promise<Record<string, unknown>[]> {
  const equipLogs = logs.filter((l) => !isAgentAction(l.action));
  const deviceIds = [
    ...new Set(
      equipLogs
        .map((l) => deviceIdKey(l.deviceId))
        .filter((id) => id.length > 0)
    ),
  ];
  const deviceIdNums = deviceIds.map((id) => parseInt(id, 10)).filter((n) => Number.isFinite(n) && n > 0);
  if (deviceIdNums.length === 0) {
    return logs.map((log) =>
      isAgentAction(log.action)
        ? { ...log }
        : { ...log, clienteId: null, clienteName: null }
    );
  }

  const devices = await SshDevice.findAll({
    where: { id: { [Op.in]: deviceIdNums } },
    attributes: ['id', 'cliente_id'],
    include: [
      {
        model: Cliente,
        as: 'cliente',
        attributes: ['id', 'razao_social', 'nome_fantasia'],
        required: false,
      },
    ],
  });

  const map = new Map<string, { clienteId: number | null; clienteName: string | null }>();
  for (const d of devices) {
    map.set(String(d.id), {
      clienteId: d.cliente_id ?? null,
      clienteName: clienteDisplayName((d as unknown as { cliente?: { razao_social?: string; nome_fantasia?: string } | null }).cliente ?? null),
    });
  }

  return logs.map((log) => {
    if (isAgentAction(log.action)) {
      return { ...log };
    }
    const sid = deviceIdKey(log.deviceId);
    const info = sid ? map.get(sid) : undefined;
    return {
      ...log,
      clienteId: info?.clienteId ?? null,
      clienteName: info?.clienteName ?? null,
    };
  });
}

async function enrichAgentLogsWithCliente(
  logs: Record<string, unknown>[]
): Promise<Record<string, unknown>[]> {
  const agentLogs = logs.filter((l) => isAgentAction(l.action));
  if (agentLogs.length === 0) return logs;

  const agentIds = [
    ...new Set(
      agentLogs
        .map((l) => deviceIdKey(l.deviceId))
        .filter((id) => id.length > 0)
    ),
  ];

  const agentIdNums = agentIds.map((id) => parseInt(id, 10)).filter((n) => Number.isFinite(n) && n > 0);
  if (agentIdNums.length === 0) return logs;

  const agents = await Agent.findAll({
    where: { id: { [Op.in]: agentIdNums } },
    attributes: ['id', 'cliente_id'],
    include: [
      { model: Cliente, as: 'cliente', attributes: ['id', 'razao_social', 'nome_fantasia'], required: false },
    ],
  });

  const agentClienteMap = new Map<string, { clienteId: number | null; clienteName: string | null }>();
  for (const a of agents) {
    agentClienteMap.set(String(a.id), {
      clienteId: a.cliente_id ?? null,
      clienteName: clienteDisplayName((a as unknown as { cliente?: { razao_social?: string; nome_fantasia?: string } | null }).cliente ?? null),
    });
  }

  return logs.map((log) => {
    if (!isAgentAction(log.action)) return log;
    const agentId = deviceIdKey(log.deviceId);
    const info = agentId ? agentClienteMap.get(agentId) : undefined;
    return {
      ...log,
      clienteId: info?.clienteId ?? log.clienteId ?? null,
      clienteName: info?.clienteName ?? log.clienteName ?? null,
    };
  });
}

async function enrichSshAuditLogsWithEmpresa(
  logs: Record<string, unknown>[]
): Promise<Record<string, unknown>[]> {
  const deviceLogs = logs.filter((l) => !isAgentAction(l.action));
  const agentLogs = logs.filter((l) => isAgentAction(l.action));

  const deviceIds = [
    ...new Set(
      deviceLogs
        .map((l) => deviceIdKey(l.deviceId))
        .filter((id) => id.length > 0)
    ),
  ];
  const agentIds = [
    ...new Set(
      agentLogs
        .map((l) => deviceIdKey(l.deviceId))
        .filter((id) => id.length > 0)
    ),
  ];

  const empresaIdByDevice = new Map<string, number | null>();
  const empresaIdByAgent = new Map<string, number | null>();

  const deviceIdNums = deviceIds.map((id) => parseInt(id, 10)).filter((n) => Number.isFinite(n) && n > 0);
  if (deviceIdNums.length > 0) {
    const devices = await SshDevice.findAll({
      where: { id: { [Op.in]: deviceIdNums } },
      attributes: ['id', 'empresa_id'],
    });
    for (const d of devices) {
      empresaIdByDevice.set(String(d.id), d.empresa_id ?? null);
    }
  }
  const agentIdNums = agentIds.map((id) => parseInt(id, 10)).filter((n) => Number.isFinite(n) && n > 0);
  if (agentIdNums.length > 0) {
    const agents = await Agent.findAll({
      where: { id: { [Op.in]: agentIdNums } },
      attributes: ['id', 'empresa_id'],
    });
    for (const a of agents) {
      empresaIdByAgent.set(String(a.id), a.empresa_id ?? null);
    }
  }

  const allEids = new Set<number>();
  for (const id of empresaIdByDevice.values()) {
    if (id != null && id > 0) allEids.add(id);
  }
  for (const id of empresaIdByAgent.values()) {
    if (id != null && id > 0) allEids.add(id);
  }

  const nameMap = new Map<number, string>();
  if (allEids.size > 0) {
    const empresas = await DadosEmpresa.findAll({
      where: { id: { [Op.in]: [...allEids] } },
      attributes: ['id', 'razao_social', 'nome_fantasia'],
    });
    for (const e of empresas) {
      const label = (e.razao_social?.trim() || e.nome_fantasia?.trim() || `Empresa ${e.id}`).trim();
      nameMap.set(e.id, label);
    }
  }

  return logs.map((log) => {
    const key = deviceIdKey(log.deviceId);
    let eid: number | null = null;
    if (isAgentAction(log.action)) {
      eid = key ? empresaIdByAgent.get(key) ?? null : null;
    } else {
      eid = key ? empresaIdByDevice.get(key) ?? null : null;
    }
    const nome = eid != null && eid > 0 ? nameMap.get(eid) ?? null : null;
    return {
      ...log,
      empresa_id: eid,
      empresa_nome: nome,
    };
  });
}

async function enrichSshAuditLogsWithUsuario(
  logs: Record<string, unknown>[]
): Promise<Record<string, unknown>[]> {
  const userIds = [
    ...new Set(
      logs
        .map((l) => l.userId)
        .filter((id): id is string => typeof id === 'string' && id.length > 0 && id !== 'unknown' && id !== 'scheduler' && id !== 'user')
    ),
  ].map((id) => parseInt(id, 10)).filter((n) => Number.isFinite(n) && n > 0);

  if (userIds.length === 0) {
    return logs.map((log) => ({ ...log, userName: null }));
  }

  const users = await Usuario.findAll({
    where: { id: { [Op.in]: userIds } },
    attributes: ['id', 'nome'],
  });

  const userMap = new Map<number, string>();
  for (const u of users) {
    userMap.set(u.id, u.nome?.trim() || String(u.id));
  }

  return logs.map((log) => {
    const uid = typeof log.userId === 'string' ? parseInt(log.userId, 10) : NaN;
    const userName = Number.isFinite(uid) && uid > 0 ? (userMap.get(uid) ?? null) : null;
    return { ...log, userName };
  });
}

export class SshAuditController {
  static async index(req: Request, res: Response): Promise<void> {
    try {
      const {
        deviceId,
        userId,
        action,
        logType,
        startDate,
        endDate,
        search,
        searchField,
        page,
        limit,
        sortColumn,
        sortDirection,
      } = req.query as Record<string, string | undefined>;

      const sortDir: 'asc' | 'desc' = sortDirection === 'asc' ? 'asc' : 'desc';
      const postEnrichSortCols = new Set(['clienteName', 'command', 'errorMessage']);

      const { page: pageNum, limit: limitNum } = parseListQuery(
        { page, limit, search, searchField, sortColumn, sortDirection },
        { defaultLimit: 20, maxLimit: 100 }
      );

      const listEmpresaId = resolveListEmpresaId(req);
      if (listEmpresaId === false) {
        sendSuccess(res, {
          data: [],
          pagination: buildPagination(pageNum, limitNum, 0, { minLastPageWhenEmpty: 1 }),
        });
        return;
      }
      const empresaIdFilter = listEmpresaId ?? undefined;

      let searchUserIds: string[] | undefined;
      if (searchField === 'userId' && search?.trim()) {
        const term = search.trim();
        const users = await Usuario.findAll({
          where: { nome: { [Op.like]: `%${term}%` } },
          attributes: ['id'],
        });
        const ids = users.map((u) => String(u.id));
        const idNum = parseInt(term, 10);
        if (Number.isFinite(idNum) && idNum > 0 && !ids.includes(String(idNum))) {
          ids.push(String(idNum));
        }
        searchUserIds = ids.length > 0 ? ids : ['__none__'];
      }

      const { logs, total } = await searchSshAuditLogs({
        deviceId,
        userId,
        action: action as SshAuditAction | undefined,
        logType: logType === 'equipamentos' || logType === 'agentes' ? logType : undefined,
        startDate,
        endDate,
        search,
        searchField,
        searchUserIds,
        page: pageNum,
        limit: limitNum,
        sortColumn: sortColumn?.trim(),
        sortDirection: sortDir,
        empresaId: empresaIdFilter,
      });

      let enrichedLogs = await enrichSshAuditLogsWithCliente(logs);
      enrichedLogs = await enrichAgentLogsWithCliente(enrichedLogs);
      enrichedLogs = await enrichSshAuditLogsWithUsuario(enrichedLogs);
      enrichedLogs = await enrichSshAuditLogsWithEmpresa(enrichedLogs);

      const postCol = sortColumn?.trim();
      if (postCol && postEnrichSortCols.has(postCol)) {
        const d = sortDir === 'asc' ? 1 : -1;
        enrichedLogs = [...enrichedLogs].sort((a, b) => {
          const va = String(a[postCol] ?? '').toLowerCase();
          const vb = String(b[postCol] ?? '').toLowerCase();
          return va.localeCompare(vb, 'pt-BR', { numeric: true, sensitivity: 'base' }) * d;
        });
      }

      sendSuccess(res, {
        data: enrichedLogs,
        pagination: buildPagination(pageNum, limitNum, total, { minLastPageWhenEmpty: 1, minLastPage: 1 }),
      });
    } catch (error) {
      sendError(res, error, 'Erro ao buscar logs de auditoria SSH', 500, true, {
        context: 'SshAuditController.index',
      });
    }
  }
}
