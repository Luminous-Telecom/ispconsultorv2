import { Op } from 'sequelize';
import { DadosEmpresa } from '../../models/sistema/DadosEmpresa';
import { Cliente } from '../../models/clientes/Cliente';

function clienteNomeDisplay(c: { razao_social?: string | null; nome_fantasia?: string | null }): string | null {
  const nf = c.nome_fantasia?.trim();
  if (nf) return nf;
  const rs = c.razao_social?.trim();
  return rs || null;
}

export async function enrichLogsWithEmpresaNome(
  logs: Record<string, unknown>[],
  _isSaas: boolean,
  mixed = false
): Promise<void> {
  void mixed;
  const ids = new Set<number>();
  for (const log of logs) {
    const eid = log.empresa_id as number | null | undefined;
    if (eid != null && eid > 0) ids.add(eid);
  }

  const nomeMap = new Map<number, string>();
  if (ids.size > 0) {
    const rows = await DadosEmpresa.findAll({
      where: { id: { [Op.in]: [...ids] } },
      attributes: ['id', 'razao_social', 'nome_fantasia'],
    });
    for (const r of rows) {
      const rs = r.razao_social != null ? String(r.razao_social).trim() : '';
      const nf = r.nome_fantasia != null ? String(r.nome_fantasia).trim() : '';
      nomeMap.set(r.id, rs !== '' ? rs : nf !== '' ? nf : `Empresa ${r.id}`);
    }
  }

  for (const log of logs) {
    const eid = log.empresa_id as number | null | undefined;
    if (eid == null || eid <= 0) {
      log.empresa_nome = null;
      continue;
    }
    log.empresa_nome = nomeMap.get(eid) ?? `#${eid}`;
  }
}

export async function enrichLogsWithClienteNome(logs: Record<string, unknown>[]): Promise<void> {
  const extractClienteId = (d: unknown): number | null => {
    if (!d || typeof d !== 'object') return null;
    const o = d as Record<string, unknown>;
    const cid = o.cliente_id;
    if (typeof cid === 'number' && cid > 0) return cid;
    if (typeof cid === 'string') {
      const n = parseInt(cid, 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    }
    return null;
  };

  const ids = new Set<number>();
  for (const log of logs) {
    const id = extractClienteId(log.dados_novos) ?? extractClienteId(log.dados_anteriores);
    if (id != null) ids.add(id);
  }

  if (ids.size === 0) {
    for (const log of logs) {
      log.cliente_nome = null;
    }
    return;
  }

  const rows = await Cliente.findAll({
    where: { id: { [Op.in]: [...ids] } },
    attributes: ['id', 'razao_social', 'nome_fantasia'],
  });
  const map = new Map<number, string>();
  for (const c of rows) {
    map.set(c.id, clienteNomeDisplay(c) ?? `Cliente ${c.id}`);
  }

  for (const log of logs) {
    const cid = extractClienteId(log.dados_novos) ?? extractClienteId(log.dados_anteriores);
    log.cliente_nome = cid != null ? map.get(cid) ?? null : null;
  }
}
