import { Prisma } from '@prisma/client';
import { disconnectPrisma, getPrisma } from '../prisma';
import {
  EmptyResultError,
  NOW,
  Op,
  QueryTypes,
  UniqueConstraintError,
  ValidationError,
  isFragment,
  type SqlFragment,
  type Transaction,
} from './types';

type AnyCtor = {
  new (...args: any[]): any;
  tableName: string;
  modelName: string;
  associations: Record<string, Assoc>;
  rawAttributes: Record<string, any>;
  options: any;
  hooks: Record<string, any>;
  sequelize: Sequelize;
  prototype: any;
  findAll: (options?: any) => Promise<any[]>;
  findOne: (options?: any) => Promise<any>;
  findByPk: (id: unknown, options?: any) => Promise<any>;
  create: (values?: any, options?: any) => Promise<any>;
  increment: (fields: any, options?: any) => Promise<any>;
  decrement: (fields: any, options?: any) => Promise<any>;
  hydrate: (row: unknown, plans?: IncludePlan[], options?: any) => any;
};

type Assoc = {
  type: 'hasMany' | 'belongsTo' | 'hasOne' | 'belongsToMany';
  as: string;
  target: AnyCtor;
  foreignKey: string;
  otherKey?: string;
  through?: AnyCtor;
  source: AnyCtor;
};

type IncludePlan = {
  alias: string;
  kind: 'relation' | 'm2m';
  prismaKey: string;
  throughKey?: string;
  targetKey?: string;
  target: AnyCtor;
  nested: IncludePlan[];
  attributes?: unknown;
};

const ROLLBACK = '__rollback__';

function ident(name: string): string {
  if (!/^[A-Za-z0-9_]+$/.test(name)) {
    throw new Error(`Identificador SQL inválido: ${name}`);
  }
  return name;
}

function fkName(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value) return value;
  if (value && typeof value === 'object' && 'name' in value && typeof (value as { name: unknown }).name === 'string') {
    return (value as { name: string }).name;
  }
  return fallback;
}

function cap(name: string): string {
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : name;
}

function dmmfModel(name: string) {
  return Prisma.dmmf.datamodel.models.find((model) => model.name === name);
}

function scalarNames(table: string): Set<string> {
  const fields = dmmfModel(table)?.fields ?? [];
  return new Set(fields.filter((field) => field.kind === 'scalar' || field.kind === 'enum').map((field) => field.name));
}

function relationField(source: string, target: string, foreignKey?: string): string | undefined {
  const fields = (dmmfModel(source)?.fields ?? []).filter((field) => field.kind === 'object' && field.type === target);
  if (fields.length === 0) return undefined;
  if (fields.length === 1) return fields[0].name;
  if (foreignKey) {
    const direct = fields.find((field) => (field.relationFromFields ?? []).includes(foreignKey));
    if (direct) return direct.name;
    for (const field of fields) {
      const back = (dmmfModel(target)?.fields ?? []).find(
        (item) => item.kind === 'object' && item.relationName === field.relationName && item.type === source
      );
      if (back && (back.relationFromFields ?? []).includes(foreignKey)) return field.name;
    }
  }
  return fields[0].name;
}

function isPlainObject(value: unknown): value is Record<string | symbol, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);
}

export function containsSpecial(where: unknown): boolean {
  if (where == null) return false;
  if (isFragment(where)) return true;
  if (Array.isArray(where)) return where.some((item) => containsSpecial(item));
  if (!isPlainObject(where)) return false;
  for (const key of Reflect.ownKeys(where)) {
    if (typeof key === 'string' && key.startsWith('$') && key.endsWith('$')) return true;
    if (containsSpecial(where[key])) return true;
  }
  return false;
}

function likeFilter(pattern: string): Record<string, string> {
  if (pattern.startsWith('%') && pattern.endsWith('%') && pattern.length >= 2) {
    return { contains: pattern.slice(1, -1) };
  }
  if (pattern.startsWith('%')) return { endsWith: pattern.slice(1) };
  if (pattern.endsWith('%')) return { startsWith: pattern.slice(0, -1) };
  return { contains: pattern };
}

function convertValue(value: unknown): unknown {
  if (value === null || value instanceof Date || typeof value !== 'object') return value;
  if (Array.isArray(value)) return { in: value };
  if (!isPlainObject(value)) return value;
  const out: Record<string, unknown> = {};
  let replaced: unknown;
  for (const op of Reflect.ownKeys(value)) {
    const current = value[op];
    if (op === Op.eq || op === Op.is) {
      replaced = current;
      continue;
    }
    if (op === Op.ne || op === Op.not) out.not = current;
    else if (op === Op.gt) out.gt = current;
    else if (op === Op.gte) out.gte = current;
    else if (op === Op.lt) out.lt = current;
    else if (op === Op.lte) out.lte = current;
    else if (op === Op.in) out.in = current;
    else if (op === Op.notIn) out.notIn = current;
    else if (op === Op.like || op === Op.iLike || op === Op.substring) Object.assign(out, likeFilter(String(current)));
    else if (op === Op.notLike || op === Op.notILike) out.not = likeFilter(String(current));
    else if (op === Op.startsWith) out.startsWith = current;
    else if (op === Op.endsWith) out.endsWith = current;
    else if (op === Op.between && Array.isArray(current)) {
      out.gte = current[0];
      out.lte = current[1];
    } else if (op === Op.notBetween && Array.isArray(current)) {
      out.not = { gte: current[0], lte: current[1] };
    }
  }
  if (replaced !== undefined && Object.keys(out).length === 0) return replaced;
  return Object.keys(out).length ? out : value;
}

export function convertWhere(where: unknown, model?: { associations?: Record<string, Assoc>; tableName?: string }): Record<string, unknown> | undefined {
  if (where == null) return undefined;
  if (!isPlainObject(where)) return undefined;
  const root: Record<string, unknown> = {};
  const extra: unknown[] = [];
  for (const key of Reflect.ownKeys(where)) {
    const value = where[key];
    if (key === Op.and) {
      extra.push(...[] .concat(value as never).map((item) => convertWhere(item, model)).filter(Boolean));
      continue;
    }
    if (key === Op.or) {
      root.OR = [] .concat(value as never).map((item) => convertWhere(item, model)).filter(Boolean);
      continue;
    }
    if (key === Op.not) {
      root.NOT = convertWhere(value, model) ?? value;
      continue;
    }
    if (typeof key !== 'string') continue;
    if (key.startsWith('$') && key.endsWith('$')) {
      const [alias, ...rest] = key.slice(1, -1).split('.');
      const association = model?.associations?.[alias];
      if (!association) continue;
      const rel = relationField(association.source.tableName, association.target.tableName, association.foreignKey);
      if (!rel) continue;
      const inner = { [rest.join('.')]: convertValue(value) };
      root[rel] = association.type === 'hasMany' || association.type === 'belongsToMany' ? { some: inner } : inner;
      continue;
    }
    root[key] = convertValue(value);
  }
  const pieces = [root, ...extra].filter((item) => item && typeof item === 'object' && Object.keys(item as object).length > 0);
  if (pieces.length === 0) return undefined;
  if (pieces.length === 1) return pieces[0] as Record<string, unknown>;
  return { AND: pieces };
}

function compileExpr(expr: unknown): string {
  if (isFragment(expr)) {
    if (expr.__col) return `\`${ident(expr.__col)}\``;
    if (expr.__literal) return expr.__literal;
    if (expr.__fn === 'LOWER') return `LOWER(${compileExpr(expr.__args?.[0])})`;
    if (expr.__fn === 'COUNT') return `COUNT(${compileExpr(expr.__args?.[0])})`;
    if (expr.__fn === 'CAST') return `CAST(${compileExpr(expr.__args?.[0])} AS ${ident(String(expr.__args?.[1] ?? 'CHAR'))})`;
    if (expr.__fn) return `${ident(expr.__fn)}(${(expr.__args ?? []).map((arg) => compileExpr(arg)).join(', ')})`;
  }
  return 'NULL';
}

function compileSequelizeWhere(fragment: SqlFragment, params: unknown[]): string {
  const left = compileExpr(fragment.__where?.left);
  const right = fragment.__where?.right;
  if (isPlainObject(right)) {
    if (Op.like in right) {
      params.push(right[Op.like]);
      return `${left} LIKE ?`;
    }
    if (Op.ne in right) {
      params.push(right[Op.ne]);
      return `${left} <> ?`;
    }
  }
  params.push(right);
  return `${left} = ?`;
}

function compileColumn(key: string, value: unknown, params: unknown[]): string {
  const column = `\`${ident(key)}\``;
  if (isFragment(value)) {
    if (value.__literal) return `${column} IN (${value.__literal})`;
    if (value.__where) return compileSequelizeWhere(value, params);
  }
  if (value === null) return `${column} IS NULL`;
  if (!isPlainObject(value)) {
    params.push(value);
    return `${column} = ?`;
  }
  const parts: string[] = [];
  for (const op of Reflect.ownKeys(value)) {
    const current = value[op];
    if (op === Op.in && isFragment(current) && current.__literal) {
      parts.push(`${column} IN (${current.__literal})`);
    } else if (op === Op.in) {
      const list = Array.isArray(current) ? current : [current];
      if (list.length === 0) parts.push('1=0');
      else {
        params.push(...list);
        parts.push(`${column} IN (${list.map(() => '?').join(', ')})`);
      }
    } else if (op === Op.notIn) {
      const list = Array.isArray(current) ? current : [current];
      params.push(...list);
      parts.push(`${column} NOT IN (${list.map(() => '?').join(', ')})`);
    } else if (op === Op.like || op === Op.iLike) {
      params.push(current);
      parts.push(`${column} LIKE ?`);
    } else if (op === Op.ne || op === Op.not) {
      if (current === null) parts.push(`${column} IS NOT NULL`);
      else {
        params.push(current);
        parts.push(`${column} <> ?`);
      }
    } else if (op === Op.gt) {
      params.push(current);
      parts.push(`${column} > ?`);
    } else if (op === Op.gte) {
      params.push(current);
      parts.push(`${column} >= ?`);
    } else if (op === Op.lt) {
      params.push(current);
      parts.push(`${column} < ?`);
    } else if (op === Op.lte) {
      params.push(current);
      parts.push(`${column} <= ?`);
    } else if (op === Op.between && Array.isArray(current)) {
      params.push(current[0], current[1]);
      parts.push(`${column} BETWEEN ? AND ?`);
    } else if (op === Op.is) {
      parts.push(current === null ? `${column} IS NULL` : `${column} = ?`);
      if (current !== null) params.push(current);
    } else if (op === Op.eq) {
      params.push(current);
      parts.push(`${column} = ?`);
    }
  }
  return parts.join(' AND ') || '1=1';
}

function compileDollar(key: string, value: unknown, params: unknown[], model?: AnyCtor): string {
  const [alias, ...rest] = key.slice(1, -1).split('.');
  const assoc = model?.associations?.[alias];
  const field = rest.join('.') || 'id';
  const condition = compileColumn(field, value, params);
  if (!assoc) return '1=1';
  const target = assoc.target.tableName;
  if (assoc.type === 'belongsTo' || assoc.type === 'hasOne') {
    return `\`${ident(assoc.foreignKey)}\` IN (SELECT \`id\` FROM \`${ident(target)}\` WHERE ${condition})`;
  }
  return `EXISTS (SELECT 1 FROM \`${ident(target)}\` WHERE \`${ident(target)}\`.\`${ident(assoc.foreignKey)}\` = \`${ident(model?.tableName || 't')}\`.\`id\` AND ${condition})`;
}

export function compileWhere(where: unknown, params: unknown[], model?: AnyCtor): string {
  if (where == null) return '1=1';
  if (isFragment(where)) {
    if (where.__literal) return `(${where.__literal})`;
    if (where.__where) return compileSequelizeWhere(where, params);
  }
  if (Array.isArray(where)) return where.map((item) => compileWhere(item, params, model)).join(' AND ');
  if (!isPlainObject(where)) return '1=1';
  const parts: string[] = [];
  for (const key of Reflect.ownKeys(where)) {
    const value = where[key];
    if (key === Op.or) {
      parts.push(`(${[] .concat(value as never).map((item) => compileWhere(item, params, model)).join(' OR ')})`);
    } else if (key === Op.and) {
      parts.push(`(${[] .concat(value as never).map((item) => compileWhere(item, params, model)).join(' AND ')})`);
    } else if (key === Op.not) {
      parts.push(`NOT (${compileWhere(value, params, model)})`);
    } else if (typeof key === 'string' && key.startsWith('$') && key.endsWith('$')) {
      parts.push(compileDollar(key, value, params, model));
    } else if (typeof key === 'string') {
      parts.push(compileColumn(key, value, params));
    }
  }
  return parts.filter(Boolean).join(' AND ') || '1=1';
}

function compileOrder(order: unknown): string | null {
  if (!Array.isArray(order) || order.length === 0) return null;
  const parts = order.map((item) => {
    if (!Array.isArray(item)) return null;
    const direction = String(item[1] || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    const column = item[0];
    if (isFragment(column) && column.__literal) return `${column.__literal} ${direction}`;
    if (typeof column === 'string') return `\`${ident(column)}\` ${direction}`;
    return null;
  }).filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

function orderHasSpecial(order: unknown): boolean {
  if (!Array.isArray(order)) return false;
  return order.some((item) => Array.isArray(item) && isFragment(item[0]));
}

function convertOrder(order: unknown): Array<Record<string, string>> | undefined {
  if (!Array.isArray(order) || order.length === 0) return undefined;
  const items = order.map((item) => {
    if (!Array.isArray(item) || typeof item[0] !== 'string') return null;
    const direction = String(item[1] || 'ASC').toUpperCase() === 'DESC' ? 'desc' : 'asc';
    return { [item[0]]: direction };
  }).filter(Boolean) as Array<Record<string, string>>;
  return items.length ? items : undefined;
}

function normalize(value: unknown): unknown {
  if (value == null || value instanceof Date || typeof value !== 'object') {
    return typeof value === 'bigint' ? value.toString() : value;
  }
  if (typeof value === 'object' && (value as { constructor?: { name?: string } }).constructor?.name === 'Decimal') {
    return String(value);
  }
  if (Array.isArray(value)) return value.map((item) => normalize(item));
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) out[key] = normalize(item);
  return out;
}

function clientOf(options?: { transaction?: Transaction }): any {
  const tx = options?.transaction?.tx;
  return tx || getPrisma();
}

function mapError(error: unknown): unknown {
  const coded = error as { code?: string; message?: string; meta?: { target?: unknown } };
  if (coded?.code === 'P2002') {
    const target = coded.meta?.target;
    const fields = Array.isArray(target) ? { [String(target[0])]: true } : undefined;
    return new UniqueConstraintError(coded.message || 'Registro duplicado', fields);
  }
  return error;
}

function applyDefaults(instance: Model, attributes: Record<string, { defaultValue?: unknown }>): void {
  for (const [key, attr] of Object.entries(attributes || {})) {
    if ((instance as any)[key] !== undefined) continue;
    const fallback = attr?.defaultValue;
    if (fallback === undefined) continue;
    if (fallback && typeof fallback === 'object' && (fallback as { __now?: boolean }).__now) {
      (instance as any)[key] = new Date();
      continue;
    }
    if (typeof fallback === 'function') continue;
    (instance as any)[key] = fallback;
  }
}

function validateInstance(instance: Model, attributes: Record<string, { validate?: Record<string, unknown>; allowNull?: boolean }>): void {
  const errors: Array<{ message: string; path?: string }> = [];
  for (const [key, attr] of Object.entries(attributes || {})) {
    const value = (instance as any)[key];
    const rules = attr?.validate;
    if (!rules || value == null || value === '') {
      if (rules?.notEmpty && (value == null || String(value).trim() === '')) {
        errors.push({ path: key, message: `${key} não pode ser vazio` });
      }
      continue;
    }
    if (rules.notEmpty && String(value).trim() === '') errors.push({ path: key, message: `${key} não pode ser vazio` });
    if (Array.isArray(rules.len)) {
      const [min, max] = rules.len as number[];
      const size = String(value).length;
      if (size < min || size > max) errors.push({ path: key, message: `${key} fora do tamanho permitido` });
    }
    if (rules.isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
      errors.push({ path: key, message: `${key} não é um e-mail válido` });
    }
  }
  if (errors.length) throw new ValidationError('Dados inválidos', errors);
}

async function runHook(ctor: AnyCtor, name: string, instance: Model, options?: unknown): Promise<void> {
  const hook = ctor.hooks?.[name] ?? ctor.options?.hooks?.[name];
  if (!hook) return;
  const list = Array.isArray(hook) ? hook : [hook];
  for (const fn of list) await fn(instance, options);
}

function coerceScalar(table: string, key: string, value: unknown): unknown {
  const field = dmmfModel(table)?.fields.find((item) => item.name === key);
  if (!field || value == null) return value;
  if (field.type === 'String' && typeof value === 'object' && !(value instanceof Date)) {
    return JSON.stringify(value);
  }
  if (field.type === 'Boolean' && (value === 0 || value === 1 || value === '0' || value === '1')) {
    return value === 1 || value === '1';
  }
  if ((field.type === 'Int' || field.type === 'BigInt') && typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return value;
}

function pickScalars(table: string, source: Record<string, unknown>, isCreate: boolean): Record<string, unknown> {
  const allowed = scalarNames(table);
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (!(key in source)) continue;
    const value = source[key];
    if (value === undefined) continue;
    if (isCreate && key === 'id' && (value === null || value === undefined)) continue;
    data[key] = coerceScalar(table, key, value);
  }
  return data;
}

function scopeExclude(ctor: AnyCtor, options: { __scope?: string | false; attributes?: unknown }): string[] {
  if (options.__scope === false) return [];
  const scopes = ctor.options?.scopes || {};
  if (options.__scope && scopes[options.__scope]) {
    return scopes[options.__scope].attributes?.exclude || [];
  }
  return ctor.options?.defaultScope?.attributes?.exclude || [];
}

function stripRow(row: Record<string, unknown>, exclude: string[], attributes: unknown): void {
  const explicit = Array.isArray(attributes) ? attributes.filter((item) => typeof item === 'string') : [];
  if (explicit.length) {
    for (const key of Object.keys(row)) {
      if (key === 'id') continue;
      const value = row[key];
      if (value && typeof value === 'object') continue;
      if (!explicit.includes(key)) delete row[key];
    }
  }
  for (const key of exclude) {
    if (explicit.includes(key)) continue;
    delete row[key];
  }
}

function resolveAssoc(model: AnyCtor, item: any): Assoc | undefined {
  if (!item) return undefined;
  if (typeof item === 'string') return model.associations?.[item];
  if (item.association && model.associations?.[item.association]) return model.associations[item.association];
  if (item.as && model.associations?.[item.as]) return model.associations[item.as];
  if (item.model) {
    return Object.values(model.associations || {}).find((assoc) => assoc.target === item.model);
  }
  return undefined;
}

function buildPlans(model: AnyCtor, include: unknown): IncludePlan[] {
  if (!include) return [];
  const items = Array.isArray(include) ? include : [include];
  const plans: IncludePlan[] = [];
  for (const item of items) {
    const assoc = resolveAssoc(model, item);
    if (!assoc) continue;
    const nested = buildPlans(assoc.target, item?.include);
    if (assoc.type === 'belongsToMany' && assoc.through) {
      const throughKey = relationField(model.tableName, assoc.through.tableName, assoc.foreignKey);
      const targetKey = relationField(assoc.through.tableName, assoc.target.tableName, assoc.otherKey);
      if (!throughKey || !targetKey) continue;
      plans.push({ alias: assoc.as, kind: 'm2m', prismaKey: throughKey, throughKey, targetKey, target: assoc.target, nested, attributes: item?.attributes });
      continue;
    }
    const prismaKey = relationField(model.tableName, assoc.target.tableName, assoc.foreignKey);
    if (!prismaKey) continue;
    plans.push({ alias: assoc.as, kind: 'relation', prismaKey, target: assoc.target, nested, attributes: item?.attributes });
  }
  return plans;
}

function mergeInclude(base: any, extra: any): any {
  if (!extra) return base;
  if (!base || base === true) return extra;
  const include = { ...(base.include || {}), ...(extra.include || {}) };
  for (const key of Object.keys(extra.include || {})) {
    if (base.include?.[key]) include[key] = mergeInclude(base.include[key], extra.include[key]);
  }
  return { ...base, ...extra, include: Object.keys(include).length ? include : undefined };
}

function toPrismaInclude(plans: IncludePlan[]): Record<string, unknown> | undefined {
  if (!plans.length) return undefined;
  const include: Record<string, unknown> = {};
  for (const plan of plans) {
    if (plan.kind === 'm2m' && plan.throughKey && plan.targetKey) {
      const nested = plan.nested.length ? { include: toPrismaInclude(plan.nested) } : true;
      include[plan.throughKey] = mergeInclude(include[plan.throughKey], { include: { [plan.targetKey]: nested } });
    } else if (plan.nested.length) {
      include[plan.prismaKey] = mergeInclude(include[plan.prismaKey], { include: toPrismaInclude(plan.nested) });
    } else {
      include[plan.prismaKey] = mergeInclude(include[plan.prismaKey], true);
    }
  }
  return include;
}

function applyPlans(row: Record<string, unknown>, plans: IncludePlan[], raw: boolean): void {
  const snapshots = new Map<string, unknown>();
  for (const plan of plans) {
    const key = plan.kind === 'm2m' ? plan.throughKey : plan.prismaKey;
    if (key && !snapshots.has(key) && key in row) snapshots.set(key, row[key]);
  }
  for (const plan of plans) {
    if (plan.kind === 'relation') {
      const value = snapshots.get(plan.prismaKey);
      const wrap = (item: unknown) => plan.target.hydrate(item, plan.nested, { raw, attributes: plan.attributes });
      row[plan.alias] = Array.isArray(value) ? value.map(wrap) : value ? wrap(value) : value ?? null;
    } else {
      const through = (snapshots.get(plan.throughKey || '') as Array<Record<string, unknown>>) || [];
      row[plan.alias] = through
        .map((item) => item?.[plan.targetKey || ''])
        .filter(Boolean)
        .map((item) => plan.target.hydrate(item, plan.nested, { raw, attributes: plan.attributes }));
    }
  }
  for (const key of snapshots.keys()) {
    if (!plans.some((plan) => plan.alias === key)) delete row[key];
  }
}

function countAlias(attributes: unknown): string | null {
  if (!Array.isArray(attributes)) return null;
  for (const item of attributes) {
    if (Array.isArray(item) && isFragment(item[0]) && item[0].__fn === 'COUNT') return String(item[1] || 'count');
  }
  return null;
}

function applyReplacements(sql: string, replacements?: Record<string, unknown> | unknown[]): { sql: string; params: unknown[] } {
  if (!replacements) return { sql, params: [] };
  const params: unknown[] = [];
  if (Array.isArray(replacements)) {
    let index = 0;
    return {
      sql: sql.replace(/\?/g, () => {
        params.push(replacements[index]);
        index += 1;
        return '?';
      }),
      params,
    };
  }
  return {
    sql: sql.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (match, name: string) => {
      if (!(name in replacements)) return match;
      params.push(replacements[name]);
      return '?';
    }),
    params,
  };
}

export class Sequelize {
  async authenticate(): Promise<void> {
    await getPrisma().$queryRawUnsafe('SELECT 1');
  }

  async close(): Promise<void> {
    await disconnectPrisma();
  }

  literal(sql: string): SqlFragment {
    return { __literal: sql };
  }

  fn(name: string, ...args: unknown[]): SqlFragment {
    return { __fn: name, __args: args };
  }

  col(name: string): SqlFragment {
    return { __col: name };
  }

  where(left: unknown, right: unknown): SqlFragment {
    return { __where: { left, right } };
  }

  cast(expression: unknown, type: string): SqlFragment {
    return { __fn: 'CAST', __args: [expression, type] };
  }

  escape(value: unknown): string {
    if (value == null) return 'NULL';
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    if (typeof value === 'boolean') return value ? '1' : '0';
    return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  }

  async query<T = any>(sql: string, options: { replacements?: Record<string, unknown> | unknown[]; type?: string; transaction?: Transaction } = {}): Promise<T[]> {
    const applied = applyReplacements(sql, options.replacements);
    const client = clientOf(options);
    if (options.type === QueryTypes.INSERT || options.type === QueryTypes.UPDATE || options.type === QueryTypes.DELETE || options.type === QueryTypes.BULKUPDATE || options.type === QueryTypes.BULKDELETE) {
      const count = await client.$executeRawUnsafe(applied.sql, ...applied.params);
      return [count, count] as unknown as T[];
    }
    return client.$queryRawUnsafe(applied.sql, ...applied.params);
  }

  async transaction(arg?: ((transaction: Transaction) => Promise<unknown>) | Record<string, unknown>): Promise<any> {
    if (typeof arg === 'function') {
      try {
        return await getPrisma().$transaction(async (tx) => arg(managedTransaction(tx)), { timeout: 120000, maxWait: 20000 });
      } catch (error) {
        if (error instanceof Error && error.message === ROLLBACK) return undefined;
        throw error;
      }
    }
    return openTransaction();
  }
}

function managedTransaction(tx: unknown): Transaction {
  return {
    tx,
    commit: async () => undefined,
    rollback: async () => {
      throw new Error(ROLLBACK);
    },
  };
}

function openTransaction(): Promise<Transaction> {
  return new Promise((resolve, reject) => {
    let settle: (action: 'commit' | 'rollback') => void = () => undefined;
    const gate = new Promise<'commit' | 'rollback'>((done) => {
      settle = done;
    });
    let finished = false;
    getPrisma().$transaction(async (tx) => {
      const handle: Transaction = {
        tx,
        commit: async () => {
          if (finished) return;
          finished = true;
          handle.finished = 'commit';
          settle('commit');
        },
        rollback: async () => {
          if (finished) return;
          finished = true;
          handle.finished = 'rollback';
          settle('rollback');
        },
      };
      resolve(handle);
      const action = await gate;
      if (action === 'rollback') throw new Error(ROLLBACK);
    }, { timeout: 120000, maxWait: 20000 }).catch((error) => {
      if (error instanceof Error && error.message === ROLLBACK) return;
      if (!finished) reject(error);
    });
  });
}

export const sequelize = new Sequelize();

export class Model<TModelAttributes extends {} = any, TCreationAttributes extends {} = any> {
  declare id: number;
  declare _attributes: TModelAttributes;
  declare _creationAttributes: TCreationAttributes;
  static rawAttributes: Record<string, any> = {};
  static tableName = '';
  static modelName = '';
  static associations: Record<string, Assoc>;
  static hooks: Record<string, any> = {};
  static sequelize: Sequelize = sequelize;
  static options: any = {};
  static primaryKeyAttribute = 'id';

  isNewRecord = false;
  _changed = new Set<string>();
  _previous: Record<string, unknown> = {};

  static ensureAssocs(): void {
    if (!Object.prototype.hasOwnProperty.call(this, 'associations')) this.associations = Object.create(null);
  }

  static init(attributes: Record<string, any>, options: any): AnyCtor {
    this.rawAttributes = attributes || {};
    this.tableName = options?.tableName || this.name;
    this.modelName = options?.modelName || this.name;
    this.hooks = options?.hooks || {};
    this.sequelize = options?.sequelize || sequelize;
    this.options = options || {};
    this.ensureAssocs();
    return this;
  }

  static getTableName(): string {
    return this.tableName;
  }

  static scope(name: string) {
    const ctor = this;
    return {
      findOne: (options?: any) => ctor.findOne({ ...(options || {}), __scope: name }),
      findAll: (options?: any) => ctor.findAll({ ...(options || {}), __scope: name }),
      findByPk: (id: unknown, options?: any) => ctor.findByPk(id, { ...(options || {}), __scope: name }),
    };
  }

  static unscoped() {
    const ctor = this;
    return {
      findOne: (options?: any) => ctor.findOne({ ...(options || {}), __scope: false }),
      findAll: (options?: any) => ctor.findAll({ ...(options || {}), __scope: false }),
      findByPk: (id: unknown, options?: any) => ctor.findByPk(id, { ...(options || {}), __scope: false }),
    };
  }

  static belongsTo(target: AnyCtor, options: any = {}): AnyCtor {
    this.ensureAssocs();
    const as = options.as || target.modelName || target.name;
    const foreignKey = fkName(options.foreignKey, `${as}_id`);
    this.associations[as] = { type: 'belongsTo', as, target, foreignKey, source: this };
    const name = cap(as);
    (this.prototype as any)[`get${name}`] = function getAssoc(this: any, opts?: any) {
      const id = this[foreignKey];
      if (id == null) return Promise.resolve(null);
      return target.findByPk(id, opts);
    };
    return this;
  }

  static hasMany(target: AnyCtor, options: any = {}): AnyCtor {
    this.ensureAssocs();
    const as = options.as || `${target.modelName || target.name}s`;
    const foreignKey = fkName(options.foreignKey, `${this.modelName || this.name}_id`);
    this.associations[as] = { type: 'hasMany', as, target, foreignKey, source: this };
    const name = cap(as);
    (this.prototype as any)[`get${name}`] = function getMany(this: any, opts?: any) {
      return target.findAll({ ...(opts || {}), where: { ...(opts?.where || {}), [foreignKey]: this.id } });
    };
    return this;
  }

  static hasOne(target: AnyCtor, options: any = {}): AnyCtor {
    this.ensureAssocs();
    const as = options.as || target.modelName || target.name;
    const foreignKey = fkName(options.foreignKey, `${this.modelName || this.name}_id`);
    this.associations[as] = { type: 'hasOne', as, target, foreignKey, source: this };
    const name = cap(as);
    (this.prototype as any)[`get${name}`] = function getOne(this: any, opts?: any) {
      return target.findOne({ ...(opts || {}), where: { ...(opts?.where || {}), [foreignKey]: this.id } });
    };
    return this;
  }

  static belongsToMany(target: AnyCtor, options: any = {}): AnyCtor {
    this.ensureAssocs();
    const as = options.as || `${target.modelName || target.name}s`;
    const foreignKey = fkName(options.foreignKey, `${this.modelName || this.name}_id`);
    const otherKey = fkName(options.otherKey, `${target.modelName || target.name}_id`);
    const through = options.through;
    this.associations[as] = { type: 'belongsToMany', as, target, foreignKey, otherKey, through, source: this };
    return this;
  }

  static hydrate(row: unknown, plans: IncludePlan[] = [], options: { raw?: boolean; attributes?: unknown; __scope?: string | false } = {}): any {
    const plain = normalize(row) as Record<string, unknown>;
    applyPlans(plain, plans, Boolean(options.raw));
    stripRow(plain, scopeExclude(this, options), options.attributes);
    if (options.raw) return plain;
    const instance = new this();
    Object.assign(instance, plain);
    instance.isNewRecord = false;
    instance._changed = new Set();
    instance._previous = { ...plain };
    return instance;
  }

  static async findAll(options: any = {}): Promise<any[]> {
    const client = clientOf(options);
    const delegate = client[this.tableName];
    if (!delegate) throw new Error(`Tabela sem delegate Prisma: ${this.tableName}`);
    if (options.group) return this.findGrouped(delegate, options);
    const plans = buildPlans(this, options.include);
    const include = toPrismaInclude(plans);
    let rows: unknown[];
    if (containsSpecial(options.where) || orderHasSpecial(options.order)) {
      rows = await this.findBySql(client, options, include);
    } else {
      rows = await delegate.findMany({
        where: convertWhere(options.where, this),
        orderBy: convertOrder(options.order),
        take: options.limit,
        skip: options.offset,
        include,
      });
    }
    return rows.map((row) => this.hydrate(row, plans, options));
  }

  private static async findBySql(client: any, options: any, include: unknown): Promise<unknown[]> {
    const params: unknown[] = [];
    const whereSql = compileWhere(options.where, params, this);
    const orderSql = compileOrder(options.order) || '`id` ASC';
    const limit = options.limit != null ? ` LIMIT ${Number(options.limit)}` : '';
    const offset = options.offset != null ? ` OFFSET ${Number(options.offset)}` : '';
    const idRows = await client.$queryRawUnsafe(
      `SELECT \`id\` FROM \`${ident(this.tableName)}\` WHERE ${whereSql} ORDER BY ${orderSql}${limit}${offset}`,
      ...params
    ) as Array<{ id: number }>;
    const ids = idRows.map((row) => row.id);
    if (!ids.length) return [];
    const found = await client[this.tableName].findMany({ where: { id: { in: ids } }, include });
    const byId = new Map(found.map((row: { id: number }) => [row.id, row]));
    return ids.map((id) => byId.get(id)).filter(Boolean);
  }

  private static async findGrouped(delegate: any, options: any): Promise<any[]> {
    const by = [] .concat(options.group).filter((item) => typeof item === 'string') as string[];
    const alias = countAlias(options.attributes);
    const where = convertWhere(options.where, this);
    if (alias) {
      const orderItem = Array.isArray(options.order) ? options.order[0] : undefined;
      const direction = Array.isArray(orderItem) && orderItem[1] === 'ASC' ? 'asc' : 'desc';
      const grouped = await delegate.groupBy({
        by,
        where,
        _count: { id: true },
        ...(options.order ? { orderBy: { _count: { id: direction } } } : {}),
        ...(options.limit != null ? { take: Number(options.limit) } : {}),
      });
      return grouped.map((row: { _count: { id: number } }) => {
        const { _count, ...rest } = row;
        return { ...rest, [alias]: _count.id };
      });
    }
    return delegate.groupBy({ by, where });
  }

  static async findOne(options: any = {}): Promise<any> {
    const rows = await this.findAll({ ...options, limit: 1 });
    const row = rows[0] || null;
    if (!row && options.rejectOnEmpty) throw new EmptyResultError();
    return row;
  }

  static async findByPk(id: unknown, options: any = {}): Promise<any> {
    if (id == null) return null;
    return this.findOne({ ...options, where: { ...(options.where || {}), id } });
  }

  static async findAndCountAll(options: any = {}): Promise<{ rows: any[]; count: number }> {
    const [rows, count] = await Promise.all([
      this.findAll(options),
      this.count({ where: options.where, transaction: options.transaction }),
    ]);
    return { rows, count };
  }

  static async count(options: any = {}): Promise<number> {
    const client = clientOf(options);
    if (containsSpecial(options.where)) {
      const params: unknown[] = [];
      const whereSql = compileWhere(options.where, params, this);
      const rows = await client.$queryRawUnsafe(
        `SELECT COUNT(*) AS total FROM \`${ident(this.tableName)}\` WHERE ${whereSql}`,
        ...params
      ) as Array<{ total: number | bigint }>;
      return Number(rows[0]?.total || 0);
    }
    return client[this.tableName].count({ where: convertWhere(options.where, this) });
  }

  static async create(values: any = {}, options: any = {}): Promise<any> {
    const instance = new this();
    instance.isNewRecord = true;
    Object.assign(instance, values || {});
    applyDefaults(instance, this.rawAttributes);
    if (this.options?.timestamps !== false) {
      const now = new Date();
      if ((instance as any).created_at == null) (instance as any).created_at = now;
      if ((instance as any).updated_at == null) (instance as any).updated_at = now;
    }
    await runHook(this, 'beforeCreate', instance, options);
    validateInstance(instance, this.rawAttributes);
    try {
      const created = await clientOf(options)[this.tableName].create({
        data: pickScalars(this.tableName, instance as any, true),
      });
      Object.assign(instance, normalize(created));
      instance.isNewRecord = false;
      instance._changed.clear();
      instance._previous = instance.raw();
      await runHook(this, 'afterCreate', instance, options);
      return instance;
    } catch (error) {
      throw mapError(error);
    }
  }

  static async update(values: any, options: any = {}): Promise<[number]> {
    const data = pickScalars(this.tableName, values || {}, false);
    if (this.options?.timestamps !== false) data.updated_at = new Date();
    try {
      const result = await clientOf(options)[this.tableName].updateMany({
        where: convertWhere(options.where, this) || {},
        data,
      });
      return [result.count];
    } catch (error) {
      throw mapError(error);
    }
  }

  static async destroy(options: any = {}): Promise<number> {
    const result = await clientOf(options)[this.tableName].deleteMany({
      where: convertWhere(options.where, this) || {},
    });
    return result.count;
  }

  static async findOrCreate(options: any): Promise<[any, boolean]> {
    const found = await this.findOne({ where: options.where, transaction: options.transaction });
    if (found) return [found, false];
    const created = await this.create({ ...(options.defaults || {}), ...(options.where || {}) }, options);
    return [created, true];
  }

  static async bulkCreate(rows: Array<Record<string, unknown>>, options: any = {}): Promise<any[]> {
    const data = (rows || []).map((row) => pickScalars(this.tableName, row, true));
    if (!data.length) return [];
    await clientOf(options)[this.tableName].createMany({
      data,
      skipDuplicates: Boolean(options.ignoreDuplicates || options.updateOnDuplicate),
    });
    return [];
  }

  static async increment(fields: string | string[] | Record<string, number>, options: any = {}): Promise<any> {
    const by = options.by ?? 1;
    const data: Record<string, { increment: number }> = {};
    if (typeof fields === 'string') data[fields] = { increment: by };
    else if (Array.isArray(fields)) fields.forEach((field) => { data[field] = { increment: by }; });
    else Object.entries(fields).forEach(([field, amount]) => { data[field] = { increment: Number(amount) }; });
    return clientOf(options)[this.tableName].updateMany({
      where: convertWhere(options.where, this) || {},
      data,
    });
  }

  static async sum(field: string, options: any = {}): Promise<number> {
    const client = clientOf(options);
    const result = await client[this.tableName].aggregate({
      where: convertWhere(options.where, this as AnyCtor),
      _sum: { [field]: true },
    });
    const total = result?._sum?.[field];
    return total == null ? 0 : Number(total);
  }

  static async decrement(fields: string | string[] | Record<string, number>, options: any = {}): Promise<any> {
    const by = options.by ?? 1;
    const inverted = typeof fields === 'string' || Array.isArray(fields) ? fields : Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, -Number(value)]));
    return this.increment(inverted as any, { ...options, by: typeof fields === 'object' && !Array.isArray(fields) ? 1 : -by });
  }

  raw(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    const attributes = (this.constructor as AnyCtor).rawAttributes || {};
    for (const key of Object.keys(attributes)) out[key] = (this as any)[key];
    for (const key of Object.keys(this)) {
      if (key.startsWith('_') || key === 'isNewRecord') continue;
      const value = (this as any)[key];
      if (value && typeof value === 'object') out[key] = value;
    }
    return out;
  }

  get(key?: any): any {
    if (typeof key === 'string') return (this as any)[key];
    return this.raw();
  }

  set(key: string | Record<string, unknown>, value?: unknown): this {
    if (typeof key === 'string') this.setDataValue(key, value);
    else Object.entries(key).forEach(([name, item]) => this.setDataValue(name, item));
    return this;
  }

  getDataValue(key: string): any {
    return (this as any)[key];
  }

  setDataValue(key: string, value: unknown): void {
    (this as any)[key] = value;
    this._changed.add(key);
  }

  changed(key?: string): boolean | string[] {
    if (key) return this._changed.has(key);
    return this._changed.size ? [...this._changed] : false;
  }

  toJSON(): any {
    const raw = this.raw();
    for (const [key, value] of Object.entries(raw)) {
      if (Array.isArray(value)) raw[key] = value.map((item) => item?.toJSON?.() ?? item);
      else if (value && typeof value === 'object' && typeof (value as { toJSON?: () => unknown }).toJSON === 'function') {
        raw[key] = (value as { toJSON: () => unknown }).toJSON();
      }
    }
    return raw;
  }

  async update(values: any, options: any = {}): Promise<this> {
    Object.entries(values || {}).forEach(([key, value]) => {
      if ((this as any)[key] !== value) this.setDataValue(key, value);
    });
    const ctor = this.constructor as AnyCtor;
    await runHook(ctor, 'beforeUpdate', this, options);
    validateInstance(this, ctor.rawAttributes);
    const data = pickScalars(ctor.tableName, this.raw(), false);
    if (ctor.options?.timestamps !== false) data.updated_at = new Date();
    delete data.id;
    try {
      const updated = await clientOf(options)[ctor.tableName].update({
        where: { id: (this as any).id },
        data,
      });
      Object.assign(this, normalize(updated));
      this._changed.clear();
      this._previous = this.raw();
      await runHook(ctor, 'afterUpdate', this, options);
      return this;
    } catch (error) {
      throw mapError(error);
    }
  }

  async save(options: any = {}): Promise<this> {
    const ctor = this.constructor as AnyCtor;
    if (this.isNewRecord) {
      const created = await ctor.create(this.raw(), options);
      Object.assign(this, created.raw());
      this.isNewRecord = false;
      this._changed.clear();
      return this;
    }
    const changes: Record<string, unknown> = {};
    this._changed.forEach((key) => { changes[key] = (this as any)[key]; });
    if (!Object.keys(changes).length) return this;
    return this.update(changes, options);
  }

  async destroy(options: any = {}): Promise<void> {
    const ctor = this.constructor as AnyCtor;
    await clientOf(options)[ctor.tableName].delete({ where: { id: (this as any).id } });
  }

  async reload(options: any = {}): Promise<this> {
    const ctor = this.constructor as AnyCtor;
    const fresh = await ctor.findByPk((this as any).id, options);
    if (!fresh) throw new EmptyResultError();
    Object.assign(this, fresh.raw());
    this._changed.clear();
    this._previous = this.raw();
    return this;
  }

  async increment(fields: string | string[] | Record<string, number>, options: any = {}): Promise<this> {
    const ctor = this.constructor as AnyCtor;
    await ctor.increment(fields, { ...options, where: { id: (this as any).id } });
    return this.reload(options);
  }

  async decrement(fields: string | string[] | Record<string, number>, options: any = {}): Promise<this> {
    const ctor = this.constructor as AnyCtor;
    await ctor.decrement(fields, { ...options, where: { id: (this as any).id } });
    return this.reload(options);
  }
}

export { NOW };
