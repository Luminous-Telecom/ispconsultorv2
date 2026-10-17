import type { Prisma } from '@prisma/client';
import type { JsonValue } from '../../../types/index';
import { prisma } from '../../../db/prisma';
import { logger } from '../../../utils/logger';
import {
  isLiteralNomeTabelaMysql,
  tabelaMysqlFromEntidadeAuditoria,
} from '../auditoriaEntidadeParaTabelaMysql';
import { normalizarSnapshotAuditoria } from '../../auditoria/normalizarSnapshotAuditoria';
import {
  LOG_CONTEXTO_BLOCKDOMI_ACESSO,
  LOG_CONTEXTO_RPKI_ACTIVITY,
  LOG_CONTEXTO_RPKI_SYNC,
  LOG_CONTEXTO_RPKI_VALIDATION,
  LOG_CONTEXTO_IXC_OS_SYNC,
  LOG_CONTEXTO_ROTINA_EXECUCAO,
  LOG_CONTEXTO_SSH_AUDIT,
  normalizeOperacionalPayload,
} from '../sistemaLogOperacionalContextos';

/** Canais sugeridos; aceita qualquer string curta para extensibilidade */
export type LogOperacionalCanal =
  | 'api'
  | 'job'
  | 'sistema'
  | 'integracao'
  | 'email'
  | 'whatsapp'
  | string;

export interface RegistrarLogOperacionalInput {
  empresaId?: number | null;
  usuarioId?: number | null;
  canal?: LogOperacionalCanal;
  /** Ex.: inseriu, editou, excluiu, login, executou */
  tipo: string;
  /** Nome físico da tabela MySQL (ex.: financeiro_titulos), se já conhecido */
  tabela?: string | null;
  /** Rótulo lógico da auditoria (ex.: Titulo, Cliente); usado para resolver `tabela` quando não for literal */
  recurso?: string | null;
  recursoId?: string | number | null;
  /** MySQL: em `update`, só campos alterados (`dados_anteriores` / `dados_novos` parciais); demais ações sanitizadas. */
  payload?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  mensagem?: string | null;
}

function asPayload(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

async function insertLog(
  data: Omit<Prisma.sistema_logs_operacionaisUncheckedCreateInput, 'payload'> & { payload?: unknown }
) {
  const row = await prisma.sistema_logs_operacionais.create({
    data: { ...data, payload: asPayload(data.payload) },
  });
  return { ...row, id: Number(row.id) };
}

function normalizeRecursoId(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length > 0 ? s.slice(0, 64) : null;
}

const CHAVES_IGNORAR_SEQUELIZE = new Set([
  'dataValues',
  '_changed',
  '_options',
  'isNewRecord',
  '_previousDataValues',
  '$modelOptions',
  'Model',
  ['seque', 'lize'].join(''),
  'tableName',
]);

const CHAVES_VALOR_OMITIR = new Set([
  'xml',
  'pdf_base64',
  'pdf_url',
  'danfe_url',
  'pagamentos',
  'arquivos',
  'saldo_devedor',
  'vencida',
]);

/** Valores de chaves que não devem ser persistidos em claro (tokens, chaves de API, etc.) */
const SENSIVEL_KEY =
  /senha_hash|password_hash|webhook_secret|access_token|refresh_token|authorization|evolution_api|whatsapp_cloud|api_key|client_secret/i;

const MAX_PAYLOAD_JSON_CHARS = 95_000;
const MAX_CHAVES_TOPO = 450;

/** Campos que mudam só por “touch” no banco / derivação de UI — não contam como alteração de negócio */
const CHAVES_IGNORAR_COMPARACAO_NO_OP = new Set([
  'updated_at',
  'created_at',
  'deleted_at',
  'modified_at',
  // plain/toJSON costuma expor camelCase; .toLowerCase() vira uma palavra só
  'updatedat',
  'createdat',
  'deletedat',
  'modifiedat',
]);

function ignorarChaveComparacaoNoOp(k: string): boolean {
  if (k.startsWith('_') || k.startsWith('$') || CHAVES_IGNORAR_SEQUELIZE.has(k)) return true;
  const kl = k.toLowerCase();
  if (CHAVES_VALOR_OMITIR.has(kl)) return true;
  if (CHAVES_IGNORAR_COMPARACAO_NO_OP.has(kl)) return true;
  if (k.endsWith('_formatada') || k.endsWith('Formatada')) return true;
  return false;
}

function vazioParaComparacao(v: unknown): boolean {
  return v === undefined || v === null;
}

function ordenarArrayObjetosPorId(arr: unknown[]): unknown[] {
  const todosObjComId =
    arr.length > 0 &&
    arr.every(
      (item) =>
        item !== null &&
        typeof item === 'object' &&
        !Array.isArray(item) &&
        'id' in (item as Record<string, unknown>)
    );
  if (!todosObjComId) return arr;
  const copy = [...arr] as Record<string, unknown>[];
  copy.sort((a, b) => {
    const ia = Number(a.id);
    const ib = Number(b.id);
    if (Number.isFinite(ia) && Number.isFinite(ib)) return ia - ib;
    return String(a.id).localeCompare(String(b.id));
  });
  return copy;
}

/** Alinha Date vs string ISO / YYYY-MM-DD (mesma ideia do normalizeDate de contratos) */
function millisSePareceData(v: unknown): number | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.getTime();
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return null;
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      return new Date(
        parseInt(m[1], 10),
        parseInt(m[2], 10) - 1,
        parseInt(m[3], 10)
      ).getTime();
    }
    const t = Date.parse(s);
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

/** DECIMAL (objeto) vs string/number */
function numeroNegocioSeParece(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const s = v.trim().replace(',', '.');
    if (s === '') return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  if (v != null && typeof v === 'object' && !Array.isArray(v)) {
    const name = (v as { constructor?: { name?: string } }).constructor?.name;
    if (name === 'Decimal' || name === 'BigNumber') {
      const n = Number(String(v));
      return Number.isFinite(n) ? n : null;
    }
  }
  return null;
}

/** Compara dois valores de auditoria (antes vs depois) ignorando ruído de persistência */
function valoresEquivalentesNoOp(a: unknown, b: unknown, depth: number): boolean {
  if (depth > 16) return false;
  if (Object.is(a, b)) return true;
  if (vazioParaComparacao(a) && vazioParaComparacao(b)) return true;
  if (vazioParaComparacao(a) || vazioParaComparacao(b)) return false;

  if (typeof a === 'string' && typeof b === 'string') return a.trim() === b.trim();
  if (typeof a === 'number' && typeof b === 'number' && Number.isFinite(a) && Number.isFinite(b)) {
    return a === b;
  }
  if (
    (typeof a === 'string' && typeof b === 'number') ||
    (typeof a === 'number' && typeof b === 'string')
  ) {
    const sa = String(a).trim();
    const sb = String(b).trim();
    if (sa === sb) return true;
    const na = Number(a);
    const nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb) && na === nb) return true;
  }
  if (typeof a === 'boolean' && typeof b === 'boolean') return a === b;

  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();

  const ta = millisSePareceData(a);
  const tb = millisSePareceData(b);
  if (ta !== null && tb !== null && ta === tb) return true;

  const da = numeroNegocioSeParece(a);
  const db = numeroNegocioSeParece(b);
  if (da !== null && db !== null && Math.abs(da - db) < 1e-9) return true;

  if (Array.isArray(a) && Array.isArray(b)) {
    const aa = ordenarArrayObjetosPorId(a);
    const bb = ordenarArrayObjetosPorId(b);
    if (aa.length !== bb.length) return false;
    for (let i = 0; i < aa.length; i++) {
      if (!valoresEquivalentesNoOp(aa[i], bb[i], depth + 1)) return false;
    }
    return true;
  }
  if (Array.isArray(a) || Array.isArray(b)) return false;

  if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
    const oa = a as Record<string, unknown>;
    const ob = b as Record<string, unknown>;
    const keys = new Set([...Object.keys(oa), ...Object.keys(ob)]);
    for (const k of keys) {
      if (ignorarChaveComparacaoNoOp(k)) continue;
      if (!valoresEquivalentesNoOp(oa[k], ob[k], depth + 1)) return false;
    }
    return true;
  }

  return false;
}

/** `true` se `dados_anteriores` e `dados_novos` diferem (há alteração a gravar no log operacional). */
export function houveAlteracaoEfetivaEmUpdate(
  antes: Record<string, unknown> | null | undefined,
  depois: Record<string, unknown> | null | undefined
): boolean {
  const aOk = antes != null && typeof antes === 'object' && !Array.isArray(antes);
  const bOk = depois != null && typeof depois === 'object' && !Array.isArray(depois);
  if (!aOk && !bOk) return false;
  if (!aOk || !bOk) return true;
  return !valoresEquivalentesNoOp(antes, depois, 0);
}

/** Diagnóstico: lista caminhos onde antes ≠ depois (mesmas regras de `houveAlteracaoEfetivaEmUpdate`). */
export function divergenciasUpdateNoOp(
  antes: Record<string, unknown> | null | undefined,
  depois: Record<string, unknown> | null | undefined,
  options?: { max?: number; maxDepth?: number }
): string[] {
  const max = options?.max ?? 30;
  const maxDepth = options?.maxDepth ?? 8;
  const out: string[] = [];
  const aOk = antes != null && typeof antes === 'object' && !Array.isArray(antes);
  const bOk = depois != null && typeof depois === 'object' && !Array.isArray(depois);
  if (!aOk || !bOk) {
    out.push(`estrutura inválida: antesOk=${aOk} depoisOk=${bOk}`);
    return out;
  }

  function tipoLabel(v: unknown): string {
    if (v === null) return 'null';
    if (v === undefined) return 'undefined';
    if (Array.isArray(v)) return `array[len=${v.length}]`;
    if (v instanceof Date) return 'Date';
    if (typeof v === 'object') {
      const c = (v as { constructor?: { name?: string } }).constructor?.name;
      return c && c !== 'Object' ? String(c) : 'object';
    }
    return typeof v;
  }

  function valorPreview(v: unknown, lim = 72): string {
    try {
      if (v === null || v === undefined) return String(v);
      if (typeof v === 'string') return v.length > lim ? `${v.slice(0, lim)}…` : v;
      if (typeof v === 'number' || typeof v === 'boolean') return String(v);
      if (v instanceof Date) return v.toISOString();
      const s = JSON.stringify(v);
      return s.length > lim ? `${s.slice(0, lim)}…` : s;
    } catch {
      return '[?]';
    }
  }

  function walk(a: unknown, b: unknown, path: string, depth: number): void {
    if (out.length >= max) return;
    if (valoresEquivalentesNoOp(a, b, 0)) return;
    if (depth >= maxDepth) {
      out.push(`${path || '$'}: (maxDepth) ${tipoLabel(a)} vs ${tipoLabel(b)}`);
      return;
    }
    const bothObj =
      a !== null &&
      b !== null &&
      typeof a === 'object' &&
      typeof b === 'object' &&
      !Array.isArray(a) &&
      !Array.isArray(b) &&
      !(a instanceof Date) &&
      !(b instanceof Date);
    if (bothObj) {
      const oa = a as Record<string, unknown>;
      const ob = b as Record<string, unknown>;
      const keys = [...new Set([...Object.keys(oa), ...Object.keys(ob)])].sort();
      for (const k of keys) {
        if (out.length >= max) return;
        if (ignorarChaveComparacaoNoOp(k)) continue;
        if (valoresEquivalentesNoOp(oa[k], ob[k], 0)) continue;
        const va = oa[k];
        const vb = ob[k];
        const p = path ? `${path}.${k}` : k;
        const bothNested =
          va != null &&
          vb != null &&
          typeof va === 'object' &&
          typeof vb === 'object' &&
          !Array.isArray(va) &&
          !Array.isArray(vb) &&
          !(va instanceof Date) &&
          !(vb instanceof Date);
        if (bothNested) walk(va, vb, p, depth + 1);
        else {
          out.push(`${p}: ${tipoLabel(va)}(${valorPreview(va)}) ≠ ${tipoLabel(vb)}(${valorPreview(vb)})`);
        }
      }
      return;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      out.push(`${path || '$'}: arrays len ${a.length} vs ${b.length} (ou itens)`);
      return;
    }
    out.push(`${path || '$'}: ${tipoLabel(a)}(${valorPreview(a)}) ≠ ${tipoLabel(b)}(${valorPreview(b)})`);
  }

  walk(antes, depois, '', 0);
  if (out.length === 0) {
    out.push('(raiz não equivalente mas nenhum ramo listado — revisar comparador)');
  }
  return out;
}

const auditoriaLogUpdateDiff =
  process.env.AUDITORIA_LOG_UPDATE_DIFF === '1' || process.env.AUDITORIA_LOG_UPDATE_DIFF === 'true';

function sanitizarValorParaPayload(key: string, value: unknown, depth: number): unknown {
  if (depth > 4) return '[profundidade]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    if (SENSIVEL_KEY.test(key) && value !== '' && value !== null) return '[omitido]';
    if (typeof value === 'string' && value.length > 8000) return `${value.slice(0, 8000)}…`;
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    const lim = value.slice(0, 40).map((item, i) => sanitizarValorParaPayload(`${key}[${i}]`, item, depth + 1));
    return lim;
  }
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    let n = 0;
    for (const [k, v] of Object.entries(o)) {
      if (n++ > 80) break;
      if (k.startsWith('_') || k.startsWith('$')) continue;
      out[k] = sanitizarValorParaPayload(k, v, depth + 1);
    }
    return out;
  }
  return String(value);
}

function plainObjectFromAuditoria(
  fonte: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!fonte || typeof fonte !== 'object' || Array.isArray(fonte)) return null;
  try {
    return JSON.parse(JSON.stringify(fonte)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function sanitizarObjetoPlano(plain: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  let count = 0;
  for (const [k, v] of Object.entries(plain)) {
    if (count >= MAX_CHAVES_TOPO) break;
    const kl = k.toLowerCase();
    if (k.startsWith('_') || k.startsWith('$') || CHAVES_IGNORAR_SEQUELIZE.has(k)) continue;
    if (CHAVES_VALOR_OMITIR.has(kl)) continue;
    out[k] = sanitizarValorParaPayload(k, v, 0);
    count++;
  }
  return out;
}

function objetoAninhadoComparavel(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date);
}

/**
 * Em `update`, persiste no MySQL apenas chaves que mudaram (antes/depois parciais).
 * Monta payload JSON para registro operacional a partir de snapshot de auditoria.
 */
export function extrairCamposAlteradosParaPayload(
  antes: Record<string, unknown> | null | undefined,
  depois: Record<string, unknown> | null | undefined,
  maxDepth = 6
): { dados_anteriores: Record<string, unknown>; dados_novos: Record<string, unknown> } {
  const dados_anteriores: Record<string, unknown> = {};
  const dados_novos: Record<string, unknown> = {};

  const aPlain = plainObjectFromAuditoria(normalizarSnapshotAuditoria(antes));
  const bPlain = plainObjectFromAuditoria(normalizarSnapshotAuditoria(depois));
  if (!aPlain || !bPlain) return { dados_anteriores, dados_novos };

  function walk(
    a: Record<string, unknown>,
    b: Record<string, unknown>,
    outA: Record<string, unknown>,
    outB: Record<string, unknown>,
    depth: number
  ): void {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
    for (const k of keys) {
      if (ignorarChaveComparacaoNoOp(k)) continue;
      const va = a[k];
      const vb = b[k];
      if (valoresEquivalentesNoOp(va, vb, 0)) continue;

      if (objetoAninhadoComparavel(va) && objetoAninhadoComparavel(vb) && depth < maxDepth) {
        const nestedA: Record<string, unknown> = {};
        const nestedB: Record<string, unknown> = {};
        walk(va, vb, nestedA, nestedB, depth + 1);
        if (Object.keys(nestedA).length > 0) {
          outA[k] = nestedA;
          outB[k] = nestedB;
        }
        continue;
      }

      if (!vazioParaComparacao(va)) {
        outA[k] = sanitizarValorParaPayload(k, va, depth);
      }
      if (!vazioParaComparacao(vb)) {
        outB[k] = sanitizarValorParaPayload(k, vb, depth);
      }
    }
  }

  walk(aPlain, bPlain, dados_anteriores, dados_novos, 0);
  return { dados_anteriores, dados_novos };
}

function aplicarRotaNoPayload(out: Record<string, unknown>, rota: string | null): void {
  if (rota != null && String(rota).trim() !== '' && !Object.prototype.hasOwnProperty.call(out, 'request')) {
    out.request = String(rota).trim().slice(0, 2000);
  }
}

function limitarTamanhoPayload(out: Record<string, unknown>, rota: string | null): Record<string, unknown> {
  try {
    const s = JSON.stringify(out);
    if (s.length <= MAX_PAYLOAD_JSON_CHARS) return out;
    return {
      request: rota ? String(rota).trim().slice(0, 500) : null,
      _truncado: true,
      _tamanho_aproximado: s.length,
    };
  } catch {
    return { request: rota ? String(rota).trim().slice(0, 500) : null, _erro_serializacao: true };
  }
}

/**
 * Payload no MySQL: em `update` só campos alterados; create/delete sanitizados (ES = detalhe completo).
 */
function montarPayloadCorpoRequisicao(p: {
  acao: AcaoOperacionalAuditoria;
  dadosNovos: Record<string, unknown> | null | undefined;
  dadosAnteriores: Record<string, unknown> | null | undefined;
  rota: string | null;
}): Record<string, unknown> | null {
  if (p.acao === 'update') {
    const { dados_anteriores, dados_novos } = extrairCamposAlteradosParaPayload(
      p.dadosAnteriores,
      p.dadosNovos
    );
    if (Object.keys(dados_anteriores).length === 0 && Object.keys(dados_novos).length === 0) {
      if (p.rota != null && String(p.rota).trim() !== '') {
        return { request: String(p.rota).trim().slice(0, 2000) };
      }
      return null;
    }
    const out: Record<string, unknown> = {};
    if (Object.keys(dados_anteriores).length > 0) out.dados_anteriores = dados_anteriores;
    if (Object.keys(dados_novos).length > 0) out.dados_novos = dados_novos;
    aplicarRotaNoPayload(out, p.rota);
    return limitarTamanhoPayload(out, p.rota);
  }

  const fonte =
    p.acao === 'delete'
      ? p.dadosAnteriores
      : p.dadosNovos != null && typeof p.dadosNovos === 'object'
        ? p.dadosNovos
        : p.dadosAnteriores;

  const plain = plainObjectFromAuditoria(
    fonte != null && typeof fonte === 'object' && !Array.isArray(fonte)
      ? (fonte as Record<string, unknown>)
      : null
  );

  if (!plain) {
    if (p.rota != null && String(p.rota).trim() !== '') {
      return { request: String(p.rota).trim().slice(0, 2000) };
    }
    return null;
  }

  const out = sanitizarObjetoPlano(plain);
  if (Object.keys(out).length === 0) {
    if (p.rota != null && String(p.rota).trim() !== '') {
      return { request: String(p.rota).trim().slice(0, 2000) };
    }
    return null;
  }
  aplicarRotaNoPayload(out, p.rota);
  return limitarTamanhoPayload(out, p.rota);
}

export type AcaoOperacionalAuditoria =
  | 'create'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'export'
  | 'import'
  | 'executar';

export type OrigemAuditoriaOperacional = 'usuario' | 'agendador' | 'webhook' | 'sistema';

function canalFromOrigem(origem: OrigemAuditoriaOperacional | undefined): string {
  if (origem === 'webhook') return 'integracao';
  if (origem === 'agendador' || origem === 'sistema') return 'job';
  return 'api';
}

/** Converte ação de auditoria (ES) para rótulo curto em português no log operacional */
export function tipoOperacionalFromAcao(acao: AcaoOperacionalAuditoria): string {
  const map: Record<AcaoOperacionalAuditoria, string> = {
    create: 'inseriu',
    update: 'editou',
    delete: 'excluiu',
    login: 'login',
    logout: 'logout',
    export: 'exportou',
    import: 'importou',
    executar: 'executou',
  };
  return map[acao] ?? acao;
}

/**
 * Log operacional unificado no MySQL.
 */
export class SistemaLogOperacionalService {
  static async registrar(input: RegistrarLogOperacionalInput): Promise<void> {
    try {
      const recursoRaw =
        input.recurso != null && String(input.recurso).trim() !== ''
          ? String(input.recurso).trim()
          : null;
      const tabelaRaw =
        input.tabela != null && String(input.tabela).trim() !== '' ? String(input.tabela).trim() : null;

      let tabelaFisica: string | null = null;
      if (tabelaRaw && isLiteralNomeTabelaMysql(tabelaRaw)) {
        tabelaFisica = tabelaRaw.slice(0, 120);
      } else {
        tabelaFisica =
          tabelaMysqlFromEntidadeAuditoria(tabelaRaw || recursoRaw || '') ?? null;
      }

      const recursoLogico =
        (recursoRaw && recursoRaw.slice(0, 120)) ||
        (tabelaRaw && !isLiteralNomeTabelaMysql(tabelaRaw) ? tabelaRaw.slice(0, 120) : null) ||
        tabelaFisica;

      await insertLog({
        empresa_id: input.empresaId != null && input.empresaId > 0 ? input.empresaId : null,
        usuario_id: input.usuarioId != null && input.usuarioId > 0 ? input.usuarioId : null,
        canal: (input.canal ?? 'sistema').slice(0, 24),
        tipo: input.tipo.slice(0, 120),
        tabela: tabelaFisica,
        recurso: recursoLogico,
        recurso_id: normalizeRecursoId(input.recursoId),
        payload: input.payload ?? null,
        ip_address: input.ipAddress != null ? String(input.ipAddress).slice(0, 45) : null,
        user_agent: input.userAgent != null ? String(input.userAgent).slice(0, 500) : null,
        mensagem: input.mensagem ?? null,
      });
    } catch (err) {
      logger.warn('Falha ao gravar log operacional (não bloqueia o fluxo principal)', {
        context: 'SistemaLogOperacionalService',
        tipo: input.tipo,
        error: err instanceof Error ? err.message : 'Erro desconhecido',
      });
    }
  }

  /** Espelha auditoria no MySQL: em `update` o payload traz só campos alterados. */
  static registrarFromAuditoriaSnapshot(p: {
    acao: AcaoOperacionalAuditoria;
    entidade: string;
    entidadeId?: number | null;
    observacoes?: string | null;
    empresaId?: number | null;
    usuarioId?: number | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    rota?: string | null;
    metodoHttp?: string | null;
    origemAuditoria?: OrigemAuditoriaOperacional;
    dadosNovos?: Record<string, unknown> | null;
    dadosAnteriores?: Record<string, unknown> | null;
    /** Metadados extras (ex.: ator SuperAdmin SaaS quando usuario_id ERP é null) */
    payloadMeta?: Record<string, unknown> | null;
  }): void {
    if (p.acao === 'update') {
      const houve = houveAlteracaoEfetivaEmUpdate(p.dadosAnteriores, p.dadosNovos);
      if (!houve) {
        if (auditoriaLogUpdateDiff) {
          logger.info({
            message: 'AUDITORIA_UPDATE: ignorado (sem alteração efetiva)',
            context: 'SistemaLogOperacionalService',
            action: 'registrarFromAuditoriaSnapshot',
            entidade: p.entidade,
            entidadeId: p.entidadeId,
            rota: p.rota ?? null,
          });
        }
        return;
      }
      if (auditoriaLogUpdateDiff) {
        logger.info({
          message: 'AUDITORIA_UPDATE: gravando log — divergências (antes vs depois)',
          context: 'SistemaLogOperacionalService',
          action: 'registrarFromAuditoriaSnapshot',
          entidade: p.entidade,
          entidadeId: p.entidadeId,
          rota: p.rota ?? null,
          divergencias: divergenciasUpdateNoOp(p.dadosAnteriores, p.dadosNovos, {
            max: 35,
            maxDepth: 8,
          }),
        });
      }
    }

    const origem: OrigemAuditoriaOperacional = p.origemAuditoria ?? 'usuario';
    const canal = canalFromOrigem(origem);
    const tipo = tipoOperacionalFromAcao(p.acao);
    const entidadeAuditoria = String(p.entidade || '').trim();
    const tabelaFisica = tabelaMysqlFromEntidadeAuditoria(entidadeAuditoria);
    const eid = p.entidadeId;
    const recursoId =
      eid != null && Number.isFinite(Number(eid)) ? String(Math.trunc(Number(eid))) : null;
    const refMsg = tabelaFisica ?? (entidadeAuditoria || '?');
    const baseMsg = `${tipo} · ${refMsg}${recursoId != null ? ` #${recursoId}` : ''}`;
    const mensagem = (p.observacoes?.trim() || baseMsg).slice(0, 2000);

    const payloadCorpo = montarPayloadCorpoRequisicao({
      acao: p.acao,
      dadosNovos: p.dadosNovos,
      dadosAnteriores: p.dadosAnteriores,
      rota: p.rota ?? null,
    });
    const payloadMerged: Record<string, unknown> = { ...(payloadCorpo ?? {}), ...(p.payloadMeta ?? {}) };
    if (p.origemAuditoria) payloadMerged.origem_auditoria = p.origemAuditoria;
    payloadMerged.acao_auditoria = p.acao;

    const payloadFinal = Object.keys(payloadMerged).length > 0 ? payloadMerged : null;

    SistemaLogOperacionalService.registrarAsync({
      empresaId: p.empresaId,
      usuarioId: p.usuarioId,
      canal,
      tipo,
      recurso: entidadeAuditoria ? entidadeAuditoria.slice(0, 120) : null,
      recursoId,
      payload: payloadFinal,
      ipAddress: p.ipAddress ?? null,
      userAgent: p.userAgent ?? null,
      mensagem,
    });
  }

  static registrarAsync(input: RegistrarLogOperacionalInput): void {
    setImmediate(() => {
      void SistemaLogOperacionalService.registrar(input);
    });
  }

  /** @deprecated Use criarRotinaExecucao + atualizarRotinaExecucao na tabela unificada. */
  static registrarRotinaExecucao(params: {
    origem: 'erp' | 'saas';
    empresaId?: number | null;
    usuarioId?: number | null;
    routineId: number;
    routineNome: string;
    routineTipo: string;
    status: 'sucesso' | 'erro';
    duracaoMs: number;
    rotinaExecucaoId?: string | null;
    resultado?: Record<string, unknown> | null;
    erro?: string | null;
    ipAddress?: string | null;
  }): void {
    const tabela =
      params.origem === 'saas'
        ? 'saas_scheduled_routines'
        : 'sistema_scheduled_routines';
    const tipo = 'executou';
    const nome = params.routineNome.slice(0, 200);
    const payload: Record<string, unknown> = {
      log_contexto: 'rotina',
      tipo,
      tabela,
      origem: params.origem,
      routine_id: params.routineId,
      routine_nome: nome,
      routine_tipo: params.routineTipo.slice(0, 80),
      status: params.status,
      duracao_ms: params.duracaoMs,
      empresa_id: params.empresaId != null && params.empresaId > 0 ? params.empresaId : null,
      usuario_id: params.usuarioId != null && params.usuarioId > 0 ? params.usuarioId : null,
    };
    if (params.rotinaExecucaoId) {
      payload.rotina_execucao_id = params.rotinaExecucaoId;
    }
    if (params.status === 'erro' && params.erro) {
      payload.erro = String(params.erro).slice(0, 500);
    }
    if (params.resultado != null && typeof params.resultado === 'object') {
      const resumo: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(params.resultado)) {
        if (Object.keys(resumo).length >= 24) break;
        if (v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
          resumo[k] = v;
        }
      }
      try {
        if (Object.keys(resumo).length > 0 && JSON.stringify(resumo).length <= 1800) {
          payload.resultado_resumo = resumo;
        }
      } catch {
        /* ignora */
      }
    }

    SistemaLogOperacionalService.registrarAsync({
      empresaId: params.empresaId,
      usuarioId: params.usuarioId,
      canal: 'job',
      tipo,
      tabela,
      recurso: params.origem === 'saas' ? 'SaasScheduledRoutine' : 'ScheduledRoutine',
      recursoId: params.routineId,
      payload,
      ipAddress: params.ipAddress ?? null,
      mensagem:
        params.status === 'sucesso'
          ? `Rotina "${nome}" (${params.routineTipo}) concluída em ${params.duracaoMs} ms`
          : `Rotina "${nome}" (${params.routineTipo}) falhou: ${params.erro ?? 'erro'}`,
    });
  }

  static async mergePayloadPorId(
    id: number,
    patch: Record<string, unknown>,
    extras?: { mensagem?: string | null }
  ): Promise<void> {
    const row = await prisma.sistema_logs_operacionais.findUnique({ where: { id: BigInt(id) } });
    if (!row) return;
    const current = normalizeOperacionalPayload(row.payload) ?? {};
    const merged = { ...current, ...patch };
    await prisma.sistema_logs_operacionais.update({
      where: { id: row.id },
      data: {
        payload: asPayload(merged),
        ...(extras?.mensagem !== undefined ? { mensagem: extras.mensagem } : {}),
      },
    });
  }

  static async criarRotinaExecucao(params: {
    routineId: number;
    routineNome: string;
    routineTipo: string;
    startTime: Date;
    origem: 'erp' | 'saas';
    empresaId?: number | null;
  }): Promise<{ id: string }> {
    const tabela =
      params.origem === 'saas'
        ? 'saas_scheduled_routines'
        : 'sistema_scheduled_routines';
    const nome = params.routineNome.slice(0, 200);
    const row = await insertLog({
      empresa_id: params.empresaId != null && params.empresaId > 0 ? params.empresaId : null,
      usuario_id: null,
      canal: 'job',
      tipo: 'executou',
      tabela,
      recurso: params.origem === 'saas' ? 'SaasScheduledRoutine' : 'ScheduledRoutine',
      recurso_id: String(params.routineId),
      payload: {
        log_contexto: LOG_CONTEXTO_ROTINA_EXECUCAO,
        routine_id: params.routineId,
        routine_nome: nome,
        routine_tipo: params.routineTipo.slice(0, 80),
        origem: params.origem,
        status: 'executando',
        data_inicio: params.startTime.toISOString(),
        data_fim: null,
        duracao_ms: null,
        resultado: null,
        erro: null,
      },
      mensagem: `Rotina "${nome}" em execução`,
    });
    return { id: String(row.id) };
  }

  static async atualizarRotinaExecucao(
    logId: string,
    data: {
      status: 'executando' | 'sucesso' | 'erro';
      data_fim: Date;
      duracao_ms: number;
      resultado?: Record<string, JsonValue> | null;
      erro?: string | null;
    }
  ): Promise<void> {
    const id = parseInt(logId, 10);
    if (!Number.isFinite(id)) return;

    const row = await prisma.sistema_logs_operacionais.findUnique({ where: { id: BigInt(id) } });
    if (!row) return;

    const current = normalizeOperacionalPayload(row.payload) ?? {};
    const routineNome =
      typeof current.routine_nome === 'string' ? current.routine_nome : 'Rotina';
    const routineTipo =
      typeof current.routine_tipo === 'string' ? current.routine_tipo : 'unknown';

    const payload = {
      ...current,
      log_contexto: LOG_CONTEXTO_ROTINA_EXECUCAO,
      status: data.status,
      data_fim: data.data_fim.toISOString(),
      duracao_ms: data.duracao_ms,
      resultado: data.resultado ?? null,
      erro: data.erro ?? null,
    };

    const mensagem =
      data.status === 'sucesso'
        ? `Rotina "${routineNome}" (${routineTipo}) concluída em ${data.duracao_ms} ms`
        : data.status === 'erro'
          ? `Rotina "${routineNome}" (${routineTipo}) falhou: ${data.erro ?? 'erro'}`
          : `Rotina "${routineNome}" em execução`;

    await prisma.sistema_logs_operacionais.update({
      where: { id: row.id },
      data: { payload: asPayload(payload), mensagem },
    });
  }

  static async registrarBlockdomiAcesso(payload: {
    ip: string | null;
    rota: string;
    metodo: string;
    status_http: number;
    sucesso?: boolean;
    mensagem_erro?: string | null;
    user_agent?: string | null;
    empresa_id?: number | null;
  }): Promise<Record<string, unknown>> {
    const sucesso =
      payload.sucesso !== undefined ? payload.sucesso : payload.status_http < 400;
    const ua =
      payload.user_agent != null && payload.user_agent !== ''
        ? payload.user_agent.trim().slice(0, 500)
        : null;

    const row = await insertLog({
      empresa_id:
        payload.empresa_id != null && payload.empresa_id > 0 ? payload.empresa_id : null,
      usuario_id: null,
      canal: 'blockdomi',
      tipo: 'acesso',
      recurso: 'BlockdomiLogAcesso',
      payload: {
        log_contexto: LOG_CONTEXTO_BLOCKDOMI_ACESSO,
        ip: payload.ip,
        rota: payload.rota,
        metodo: payload.metodo,
        status_http: payload.status_http,
        sucesso,
        mensagem_erro: payload.mensagem_erro ?? null,
        user_agent: ua,
      },
      ip_address: payload.ip,
      user_agent: ua,
      mensagem: `${payload.metodo} ${payload.rota} → ${payload.status_http}`,
    });

    const p = normalizeOperacionalPayload(row.payload) ?? {};
    return {
      id: row.id,
      ip: p.ip ?? payload.ip,
      rota: p.rota ?? payload.rota,
      metodo: p.metodo ?? payload.metodo,
      status_http: p.status_http ?? payload.status_http,
      sucesso: p.sucesso ?? sucesso,
      mensagem_erro: p.mensagem_erro ?? null,
      user_agent: p.user_agent ?? ua,
      empresa_id: row.empresa_id ?? null,
      created_at: row.created_at,
    };
  }

  static registrarSshAudit(data: {
    action: string;
    userId: string;
    deviceId?: number | null;
    deviceName?: string | null;
    empresaId?: number | null;
    command?: string | null;
    output?: string | null;
    success: boolean;
    errorMessage?: string | null;
    ip: string;
    duration?: number | null;
  }): void {
    setImmediate(() => {
      void (async () => {
        try {
          const userIdNum = /^\d+$/.test(data.userId) ? parseInt(data.userId, 10) : null;
          await insertLog({
            empresa_id: data.empresaId != null && data.empresaId > 0 ? data.empresaId : null,
            usuario_id: userIdNum,
            canal: 'ssh',
            tipo: 'auditoria',
            recurso: 'SshDevice',
            recurso_id: data.deviceId != null ? String(data.deviceId) : null,
            payload: {
              log_contexto: LOG_CONTEXTO_SSH_AUDIT,
              action: data.action,
              user_id: data.userId,
              device_id: data.deviceId != null ? String(data.deviceId) : null,
              device_name: data.deviceName ?? null,
              command: data.command ?? null,
              output: data.output ? data.output.slice(0, 5000) : null,
              success: data.success,
              error_message: data.errorMessage ?? null,
              duration: data.duration ?? null,
            },
            ip_address: data.ip?.slice(0, 45) ?? null,
            mensagem: `${data.action}${data.deviceName ? ` · ${data.deviceName}` : ''}`,
          });
        } catch (err) {
          logger.warn('Falha ao registrar auditoria SSH (não crítico)', {
            context: 'SistemaLogOperacionalService',
            action: data.action,
            error: err instanceof Error ? err.message : 'Erro desconhecido',
          });
        }
      })();
    });
  }

  static registrarRpkiSync(data: {
    empresaId?: number | null;
    caId?: number | null;
    type: 'provisioning' | 'publication';
    triggerType?: 'roa' | 'aspa' | 'manual' | null;
    status: 'success' | 'failed';
    remoteHost?: string | null;
    message?: string | null;
  }): void {
    setImmediate(() => {
      void insertLog({
        empresa_id: data.empresaId != null && data.empresaId > 0 ? data.empresaId : null,
        usuario_id: null,
        canal: 'rpki',
        tipo: 'sync',
        recurso: 'RpkiCa',
        recurso_id: data.caId != null ? String(data.caId) : null,
        payload: {
          log_contexto: LOG_CONTEXTO_RPKI_SYNC,
          ca_id: data.caId ?? null,
          sync_type: data.type,
          trigger_type: data.triggerType ?? null,
          status: data.status,
          remote_host: data.remoteHost ?? null,
          message: data.message ?? null,
        },
        mensagem: data.message ?? `RPKI sync ${data.type} (${data.status})`,
      }).catch(() => undefined);
    });
  }

  static registrarRpkiActivity(data: {
    empresaId?: number | null;
    caId?: number | null;
    objectType: 'roa' | 'aspa';
    objectId?: number | null;
    action: 'create' | 'revoke' | 'delete';
    details?: string | null;
  }): void {
    setImmediate(() => {
      void insertLog({
        empresa_id: data.empresaId != null && data.empresaId > 0 ? data.empresaId : null,
        usuario_id: null,
        canal: 'rpki',
        tipo: 'atividade',
        recurso: data.objectType === 'roa' ? 'RpkiRoa' : 'RpkiAspa',
        recurso_id: data.objectId != null ? String(data.objectId) : null,
        payload: {
          log_contexto: LOG_CONTEXTO_RPKI_ACTIVITY,
          ca_id: data.caId ?? null,
          object_type: data.objectType,
          object_id: data.objectId ?? null,
          action: data.action,
          details: data.details ?? null,
        },
        mensagem: `${data.action} ${data.objectType}${data.objectId != null ? ` #${data.objectId}` : ''}`,
      }).catch(() => undefined);
    });
  }

  static registrarRpkiValidation(data: {
    empresaId?: number | null;
    prefix: string;
    asn: string;
    prefixLength: number;
    state: 'valid' | 'invalid' | 'not-found';
    matchedRoaId?: number | null;
    reason?: string | null;
    requestIp?: string | null;
  }): void {
    setImmediate(() => {
      void insertLog({
        empresa_id: data.empresaId != null && data.empresaId > 0 ? data.empresaId : null,
        usuario_id: null,
        canal: 'rpki',
        tipo: 'validacao',
        recurso: 'RpkiValidation',
        payload: {
          log_contexto: LOG_CONTEXTO_RPKI_VALIDATION,
          prefix: data.prefix.slice(0, 64),
          asn: data.asn,
          prefix_length: data.prefixLength,
          state: data.state,
          matched_roa_id: data.matchedRoaId ?? null,
          reason: data.reason ?? null,
        },
        ip_address: data.requestIp?.slice(0, 45) ?? null,
        mensagem: `${data.prefix} AS${data.asn} → ${data.state}`,
      }).catch(() => undefined);
    });
  }

  static registrarIxcOsSync(data: {
    empresaId?: number | null;
    integracaoId?: number | null;
    integracaoNome?: string | null;
    eventType: string;
    status?: 'success' | 'failed' | 'info';
    triggerType?: 'scheduled' | 'manual' | 'create' | null;
    ordemServicoId?: number | null;
    ixcOsId?: string | null;
    protocolo?: string | null;
    clienteNome?: string | null;
    origemAbertura?: 'ispconsultor' | 'ixc' | null;
    operadorNome?: string | null;
    statusAnterior?: string | null;
    statusNovo?: string | null;
    message?: string | null;
  }): void {
    setImmediate(() => {
      void insertLog({
        empresa_id: data.empresaId != null && data.empresaId > 0 ? data.empresaId : null,
        usuario_id: null,
        canal: 'integracao',
        tipo: 'sync',
        recurso: 'OrdemServicoLocal',
        recurso_id: data.ordemServicoId != null ? String(data.ordemServicoId) : null,
        payload: {
          log_contexto: LOG_CONTEXTO_IXC_OS_SYNC,
          integracao_id: data.integracaoId ?? null,
          integracao_nome: data.integracaoNome ?? null,
          event_type: data.eventType,
          status: data.status ?? 'info',
          trigger_type: data.triggerType ?? null,
          ordem_servico_id: data.ordemServicoId ?? null,
          ixc_os_id: data.ixcOsId ?? null,
          protocolo: data.protocolo ?? null,
          cliente_nome: data.clienteNome ?? null,
          origem_abertura: data.origemAbertura ?? null,
          operador_nome: data.operadorNome ?? null,
          status_anterior: data.statusAnterior ?? null,
          status_novo: data.statusNovo ?? null,
          message: data.message ?? null,
        },
        mensagem: data.message ?? `IXC OS sync: ${data.eventType}`,
      }).catch(() => undefined);
    });
  }
}
