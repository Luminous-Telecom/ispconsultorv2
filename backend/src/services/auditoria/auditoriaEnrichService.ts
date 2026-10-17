import { prisma } from '../../db/prisma';
import { clienteDisplayName } from '../../utils/clienteDisplayName';

function clienteNomeDisplay(c: { razao_social?: string | null; nome_fantasia?: string | null }): string | null {
  const nome = clienteDisplayName(c);
  return nome || null;
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
    const rows = await prisma.sistema_tenants.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true, razao_social: true, nome_fantasia: true },
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

function parseSaasActorId(value: unknown): number | null {
  if (typeof value === 'number' && value > 0) return value;
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return parseInt(value.trim(), 10);
  return null;
}

/** Preenche usuario_nome/email a partir de cadastros_usuarios (logs ERP). */
export async function enrichLogsWithUsuarioErp(logs: Record<string, unknown>[]): Promise<void> {
  if (logs.length === 0) return;

  const ids = new Set<number>();
  for (const log of logs) {
    const uid = log.usuario_id;
    if (typeof uid === 'number' && uid > 0) ids.add(uid);
  }

  const map = new Map<number, { nome: string | null; email: string | null }>();
  if (ids.size > 0) {
    const rows = await prisma.cadastros_usuarios.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true, nome: true, email: true },
    });
    for (const row of rows) {
      map.set(row.id, { nome: row.nome, email: row.email });
    }
  }

  for (const log of logs) {
    const uid = log.usuario_id;
    if (typeof uid !== 'number' || uid <= 0) continue;
    const user = map.get(uid);
    if (!user) continue;
    log.usuario_nome = (log.usuario_nome as string | null | undefined) ?? user.nome;
    log.usuario_email = (log.usuario_email as string | null | undefined) ?? user.email;
  }
}

/** Preenche usuario_nome/email a partir do payload (tabela de superusuário SaaS não existe). */
export async function enrichLogsWithSaasSuperUsuario(logs: Record<string, unknown>[]): Promise<void> {
  if (logs.length === 0) return;

  for (const log of logs) {
    const payload = log.payload as Record<string, unknown> | null | undefined;
    if (typeof payload?.saas_usuario_nome === 'string' && payload.saas_usuario_nome.trim()) {
      log.usuario_nome = payload.saas_usuario_nome;
    }
    if (typeof payload?.saas_usuario_email === 'string' && payload.saas_usuario_email.trim()) {
      log.usuario_email = payload.saas_usuario_email;
    }
  }
}

/** Cabeçalho do PDF de auditoria no painel SaaS — tabela saas_dados_empresa não existe. */
export async function resolveSaasEmpresaRelatorioPdf(): Promise<Record<string, unknown> | null> {
  return null;
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

  const rows = await prisma.clientes.findMany({
    where: { id: { in: [...ids] } },
    select: { id: true, razao_social: true, nome_fantasia: true },
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
