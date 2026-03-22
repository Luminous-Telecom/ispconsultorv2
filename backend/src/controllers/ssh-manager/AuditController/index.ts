import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { searchSshAuditLogs, SshAuditAction } from '../../../services/ssh-manager/SshAuditService';
import { sendSuccess, sendError } from '../../../utils/responseUtils';
import { SshDevice } from '../../../models/ssh-manager/SshDevice';
import { Cliente } from '../../../models/clientes/Cliente';
import { Usuario } from '../../../models/cadastros/Usuario';

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

async function enrichSshAuditLogsWithCliente(
  logs: Record<string, unknown>[]
): Promise<Record<string, unknown>[]> {
  const deviceIds = [
    ...new Set(
      logs
        .map((l) => l.deviceId)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    ),
  ];
  if (deviceIds.length === 0) {
    return logs.map((log) => ({ ...log, clienteId: null, clienteName: null }));
  }

  const devices = await SshDevice.findAll({
    where: { id: { [Op.in]: deviceIds } },
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
    const plain = d.get({ plain: true }) as {
      id: string;
      cliente_id: number | null;
      cliente?: { id: number; razao_social: string; nome_fantasia: string | null } | null;
    };
    map.set(plain.id, {
      clienteId: plain.cliente_id ?? null,
      clienteName: clienteDisplayName(plain.cliente ?? null),
    });
  }

  return logs.map((log) => {
    const sid = typeof log.deviceId === 'string' ? log.deviceId : '';
    const info = sid ? map.get(sid) : undefined;
    return {
      ...log,
      clienteId: info?.clienteId ?? null,
      clienteName: info?.clienteName ?? null,
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
        startDate,
        endDate,
        page,
        limit,
      } = req.query as Record<string, string | undefined>;

      const pageNum = Math.max(1, parseInt(page ?? '1', 10));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit ?? '20', 10)));

      const { logs, total } = await searchSshAuditLogs({
        deviceId,
        userId,
        action: action as SshAuditAction | undefined,
        startDate,
        endDate,
        page: pageNum,
        limit: limitNum,
      });

      let enrichedLogs = await enrichSshAuditLogsWithCliente(logs);
      enrichedLogs = await enrichSshAuditLogsWithUsuario(enrichedLogs);

      const lastPage = Math.ceil(total / limitNum);

      sendSuccess(res, {
        data: enrichedLogs,
        pagination: {
          current_page: pageNum,
          last_page: lastPage || 1,
          per_page: limitNum,
          total,
          from: total > 0 ? (pageNum - 1) * limitNum + 1 : 0,
          to: Math.min(pageNum * limitNum, total),
        },
      });
    } catch (error) {
      sendError(res, error, 'Erro ao buscar logs de auditoria SSH', 500, true, {
        context: 'SshAuditController.index',
      });
    }
  }
}
