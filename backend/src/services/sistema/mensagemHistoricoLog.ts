import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { LOG_CONTEXTO_MENSAGEM } from './sistemaLogOperacionalContextos';
import type { HistoricoOrigem } from '../comunicacao/mensagemHistoricoOrigens';

export type CanalMensagem = 'email' | 'whatsapp';
export type StatusMensagem = 'enviada' | 'erro';

export interface MensagemHistoricoView {
  id: number;
  tipo: CanalMensagem;
  destinatario: string;
  titulo: string | null;
  mensagem: string;
  status: StatusMensagem;
  erro_mensagem: string | null;
  entidade_tipo: string | null;
  entidade_id: number | null;
  servidor_id: number | null;
  usuario_id: number | null;
  cliente_nome: string | null;
  cliente_email: string | null;
  cliente_telefone: string | null;
  empresa_id: number | null;
  historico_origem: HistoricoOrigem;
  created_at: Date;
  updated_at: Date;
  cadastros_usuarios: { id: number; nome: string; email: string } | null;
  sistema_tenants: {
    id: number;
    razao_social: string;
    nome_fantasia: string | null;
    email: string;
    telefone: string | null;
  } | null;
}

export interface FiltroMensagemHistorico {
  canal?: CanalMensagem;
  status?: StatusMensagem;
  origens?: HistoricoOrigem[];
  empresaId?: number | null;
  empresaOuNulo?: boolean;
  entidadeTipo?: string;
  entidadeId?: number;
  usuarioId?: number;
  id?: number;
  ids?: number[];
  idInexistente?: boolean;
  textoCampo?: 'destinatario' | 'titulo' | 'cliente_nome' | 'mensagem';
  texto?: string;
  createdFrom?: Date;
  createdTo?: Date;
  tituloContem?: string;
  excluirTituloContem?: string;
}

export interface DadosGravarMensagemHistorico {
  tipo: CanalMensagem;
  destinatario: string;
  titulo?: string | null;
  mensagem: string;
  status: StatusMensagem;
  erro_mensagem?: string | null;
  entidade_tipo?: string | null;
  entidade_id?: number | null;
  servidor_id?: number | null;
  usuario_id?: number | null;
  cliente_nome?: string | null;
  cliente_email?: string | null;
  cliente_telefone?: string | null;
  empresa_id?: number | null;
  historico_origem: HistoricoOrigem;
}

const SORT_SQL: Record<string, string> = {
  id: 'id',
  empresa_id: 'empresa_id',
  tipo: 'canal',
  status: 'tipo',
  created_at: 'created_at',
  updated_at: 'created_at',
  mensagem: 'mensagem',
  destinatario: "JSON_UNQUOTE(JSON_EXTRACT(payload, '$.destinatario'))",
  titulo: "JSON_UNQUOTE(JSON_EXTRACT(payload, '$.titulo'))",
  cliente_nome: "JSON_UNQUOTE(JSON_EXTRACT(payload, '$.cliente_nome'))",
};

const historicoInclude = {
  cadastros_usuarios: { select: { id: true, nome: true, email: true } },
  sistema_tenants: { select: { id: true, razao_social: true, nome_fantasia: true, email: true, telefone: true } },
} satisfies Prisma.sistema_logs_operacionaisInclude;

function like(value: string): string {
  return `%${value.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

function sqlWhere(filtro: FiltroMensagemHistorico): Prisma.Sql {
  const parts: Prisma.Sql[] = [
    Prisma.sql`canal IN ('email', 'whatsapp')`,
    Prisma.sql`payload LIKE ${`%"log_contexto":"${LOG_CONTEXTO_MENSAGEM}"%`}`,
  ];
  if (filtro.idInexistente) parts.push(Prisma.sql`1 = 0`);
  if (filtro.canal) parts.push(Prisma.sql`canal = ${filtro.canal}`);
  if (filtro.status) parts.push(Prisma.sql`tipo = ${filtro.status}`);
  if (filtro.origens?.length === 1) parts.push(Prisma.sql`recurso = ${filtro.origens[0]}`);
  if (filtro.origens && filtro.origens.length > 1) {
    parts.push(Prisma.sql`recurso IN (${Prisma.join(filtro.origens)})`);
  }
  if (filtro.empresaOuNulo && filtro.empresaId != null) {
    parts.push(Prisma.sql`(empresa_id = ${filtro.empresaId} OR empresa_id IS NULL)`);
  } else if (filtro.empresaId != null) {
    parts.push(Prisma.sql`empresa_id = ${filtro.empresaId}`);
  }
  if (filtro.entidadeTipo) parts.push(Prisma.sql`tabela = ${filtro.entidadeTipo}`);
  if (filtro.entidadeId != null) parts.push(Prisma.sql`recurso_id = ${String(filtro.entidadeId)}`);
  if (filtro.usuarioId != null) parts.push(Prisma.sql`usuario_id = ${filtro.usuarioId}`);
  if (filtro.id != null) parts.push(Prisma.sql`id = ${filtro.id}`);
  if (filtro.ids && filtro.ids.length > 0) parts.push(Prisma.sql`id IN (${Prisma.join(filtro.ids)})`);
  if (filtro.texto && filtro.textoCampo) {
    const path = filtro.textoCampo === 'mensagem'
      ? Prisma.sql`mensagem LIKE ${like(filtro.texto)}`
      : Prisma.sql`JSON_UNQUOTE(JSON_EXTRACT(payload, ${`$.${filtro.textoCampo}`})) LIKE ${like(filtro.texto)}`;
    parts.push(path);
  }
  if (filtro.createdFrom) parts.push(Prisma.sql`created_at >= ${filtro.createdFrom}`);
  if (filtro.createdTo) parts.push(Prisma.sql`created_at <= ${filtro.createdTo}`);
  if (filtro.tituloContem) {
    parts.push(Prisma.sql`JSON_UNQUOTE(JSON_EXTRACT(payload, '$.titulo')) LIKE ${like(filtro.tituloContem)}`);
  }
  if (filtro.excluirTituloContem) {
    parts.push(Prisma.sql`(JSON_EXTRACT(payload, '$.titulo') IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(payload, '$.titulo')) NOT LIKE ${like(filtro.excluirTituloContem)})`);
  }
  return Prisma.join(parts, ' AND ');
}

type LogRow = Prisma.sistema_logs_operacionaisGetPayload<{ include: typeof historicoInclude }>;

export function mensagemHistoricoFromLog(row: {
  id: bigint | number;
  canal: string;
  tipo: string;
  tabela: string | null;
  recurso: string | null;
  recurso_id: string | null;
  payload: string | null;
  mensagem: string | null;
  empresa_id: number | null;
  usuario_id: number | null;
  created_at: Date;
  cadastros_usuarios?: MensagemHistoricoView['cadastros_usuarios'];
  sistema_tenants?: MensagemHistoricoView['sistema_tenants'];
}): MensagemHistoricoView {
  let payload: Record<string, unknown> = {};
  if (row.payload) {
    try {
      const parsed = JSON.parse(row.payload) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) payload = parsed as Record<string, unknown>;
    } catch {
      payload = {};
    }
  }
  const texto = (key: string): string | null => {
    const value = payload[key];
    return typeof value === 'string' ? value : null;
  };
  const entidadeId = row.recurso_id != null && /^\d+$/.test(row.recurso_id) ? Number(row.recurso_id) : null;
  const origem = row.recurso === 'saas' ? 'saas' : 'erp';
  return {
    id: Number(row.id),
    tipo: row.canal === 'whatsapp' ? 'whatsapp' : 'email',
    destinatario: texto('destinatario') ?? '',
    titulo: texto('titulo'),
    mensagem: texto('mensagem') ?? row.mensagem ?? '',
    status: row.tipo === 'erro' ? 'erro' : 'enviada',
    erro_mensagem: texto('erro_mensagem'),
    entidade_tipo: row.tabela,
    entidade_id: entidadeId,
    servidor_id: typeof payload.servidor_id === 'number' ? payload.servidor_id : null,
    usuario_id: row.usuario_id,
    cliente_nome: texto('cliente_nome'),
    cliente_email: texto('cliente_email'),
    cliente_telefone: texto('cliente_telefone'),
    empresa_id: row.empresa_id,
    historico_origem: origem,
    created_at: row.created_at,
    updated_at: row.created_at,
    cadastros_usuarios: row.cadastros_usuarios ?? null,
    sistema_tenants: row.sistema_tenants ?? null,
  };
}

export async function gravarMensagemHistoricoLog(dados: DadosGravarMensagemHistorico): Promise<void> {
  const now = new Date();
  const payload = {
    log_contexto: LOG_CONTEXTO_MENSAGEM,
    destinatario: dados.destinatario,
    titulo: dados.titulo ?? null,
    mensagem: dados.mensagem,
    erro_mensagem: dados.erro_mensagem ?? null,
    servidor_id: dados.servidor_id ?? null,
    cliente_nome: dados.cliente_nome ?? null,
    cliente_email: dados.cliente_email ?? null,
    cliente_telefone: dados.cliente_telefone ?? null,
  };
  await prisma.sistema_logs_operacionais.create({
    data: {
      empresa_id: dados.empresa_id ?? null,
      usuario_id: dados.usuario_id ?? null,
      canal: dados.tipo,
      tipo: dados.status,
      tabela: dados.entidade_tipo ?? null,
      recurso: dados.historico_origem,
      recurso_id: dados.entidade_id != null ? String(dados.entidade_id) : null,
      payload: JSON.stringify(payload),
      mensagem: dados.mensagem.slice(0, 60000),
      created_at: now,
    },
  });
}

export async function listarMensagensHistorico(
  filtro: FiltroMensagemHistorico,
  page: { take: number; skip: number; sortColumn?: string; sortDirection?: 'asc' | 'desc' }
): Promise<{ total: number; rows: MensagemHistoricoView[] }> {
  const whereSql = sqlWhere(filtro);
  const sortExpr = SORT_SQL[page.sortColumn ?? ''] ?? 'created_at';
  const direction = page.sortDirection === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
  const [countRows, idRows] = await Promise.all([
    prisma.$queryRaw<Array<{ total: bigint }>>`
      SELECT COUNT(*) AS total FROM sistema_logs_operacionais WHERE ${whereSql}
    `,
    prisma.$queryRaw<Array<{ id: bigint }>>`
      SELECT id FROM sistema_logs_operacionais
      WHERE ${whereSql}
      ORDER BY ${Prisma.raw(sortExpr)} ${direction}
      LIMIT ${page.take} OFFSET ${page.skip}
    `,
  ]);
  const ids = idRows.map((row) => row.id);
  if (ids.length === 0) {
    return { total: Number(countRows[0]?.total ?? 0), rows: [] };
  }
  const found = await prisma.sistema_logs_operacionais.findMany({
    where: { id: { in: ids } },
    include: historicoInclude,
  });
  const byId = new Map(found.map((row) => [row.id.toString(), row]));
  const rows = ids
    .map((id) => byId.get(id.toString()))
    .filter((row): row is LogRow => row != null)
    .map(mensagemHistoricoFromLog);
  return { total: Number(countRows[0]?.total ?? 0), rows };
}

export async function buscarMensagemHistorico(id: number): Promise<MensagemHistoricoView | null> {
  if (!Number.isInteger(id)) return null;
  const row = await prisma.sistema_logs_operacionais.findFirst({
    where: {
      id: BigInt(id),
      canal: { in: ['email', 'whatsapp'] },
      payload: { contains: `"log_contexto":"${LOG_CONTEXTO_MENSAGEM}"` },
    },
    include: historicoInclude,
  });
  return row ? mensagemHistoricoFromLog(row) : null;
}

export function whereFalhasCobrancaLog(input: {
  tipo: CanalMensagem;
  origens: HistoricoOrigem[];
  empresaId: number | null;
  ids?: number[];
  status: StatusMensagem;
  createdAfter?: Date;
  entidadeIds?: number[];
}): Prisma.sistema_logs_operacionaisWhereInput {
  const where: Prisma.sistema_logs_operacionaisWhereInput = {
    canal: input.tipo,
    tipo: input.status,
    tabela: 'titulo',
    recurso: input.origens.length === 1 ? input.origens[0] : { in: input.origens },
    recurso_id: input.entidadeIds && input.entidadeIds.length > 0
      ? { in: input.entidadeIds.map(String) }
      : { not: null },
    payload: { contains: `"log_contexto":"${LOG_CONTEXTO_MENSAGEM}"` },
    NOT: { payload: { contains: '"titulo":"Recibo' } },
  };
  if (input.empresaId != null) where.empresa_id = input.empresaId;
  if (input.ids && input.ids.length > 0) where.id = { in: input.ids.map((id) => BigInt(id)) };
  if (input.createdAfter) where.created_at = { gt: input.createdAfter };
  return where;
}
