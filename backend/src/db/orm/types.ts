export const Op = {
  eq: Symbol.for('isp.eq'),
  ne: Symbol.for('isp.ne'),
  gte: Symbol.for('isp.gte'),
  gt: Symbol.for('isp.gt'),
  lte: Symbol.for('isp.lte'),
  lt: Symbol.for('isp.lt'),
  in: Symbol.for('isp.in'),
  notIn: Symbol.for('isp.notIn'),
  like: Symbol.for('isp.like'),
  notLike: Symbol.for('isp.notLike'),
  iLike: Symbol.for('isp.iLike'),
  notILike: Symbol.for('isp.notILike'),
  startsWith: Symbol.for('isp.startsWith'),
  endsWith: Symbol.for('isp.endsWith'),
  substring: Symbol.for('isp.substring'),
  between: Symbol.for('isp.between'),
  notBetween: Symbol.for('isp.notBetween'),
  or: Symbol.for('isp.or'),
  and: Symbol.for('isp.and'),
  not: Symbol.for('isp.not'),
  is: Symbol.for('isp.is'),
  regexp: Symbol.for('isp.regexp'),
  iRegexp: Symbol.for('isp.iRegexp'),
  col: Symbol.for('isp.col'),
} as const;

export const NOW = { __now: true as const };

type DataTypeBuilder = (...args: any[]) => any;

export interface DataTypesMap {
  STRING: DataTypeBuilder & { UNSIGNED?: any };
  INTEGER: DataTypeBuilder & { UNSIGNED?: any };
  BIGINT: DataTypeBuilder & { UNSIGNED?: any };
  CHAR: DataTypeBuilder;
  TEXT: DataTypeBuilder;
  FLOAT: DataTypeBuilder;
  DOUBLE: DataTypeBuilder;
  DECIMAL: DataTypeBuilder;
  BOOLEAN: DataTypeBuilder;
  DATE: DataTypeBuilder;
  DATEONLY: DataTypeBuilder;
  TIME: DataTypeBuilder;
  JSON: DataTypeBuilder;
  JSONB: DataTypeBuilder;
  UUID: DataTypeBuilder;
  ENUM: (...values: any[]) => any;
  NOW: typeof NOW;
  [key: string]: any;
}

export const DataTypes: DataTypesMap = new Proxy({} as DataTypesMap, {
  get(_target, prop: string) {
    if (prop === 'NOW') return NOW;
    if (prop === 'ENUM') return (...values: unknown[]) => ({ type: 'ENUM', values });
    return (...args: unknown[]) => ({ type: prop, args });
  },
});

export class ValidationError extends Error {
  errors: Array<{ message: string; path?: string }>;

  constructor(message = 'Validation error', errors: Array<{ message: string; path?: string }> = []) {
    super(message);
    this.name = 'SequelizeValidationError';
    this.errors = errors;
  }
}

export class UniqueConstraintError extends Error {
  errors: Array<{ message: string; path?: string }>;
  fields?: Record<string, unknown>;

  constructor(message = 'Unique constraint', fields?: Record<string, unknown>) {
    super(message);
    this.name = 'SequelizeUniqueConstraintError';
    this.fields = fields;
    this.errors = [{ message, path: fields ? Object.keys(fields)[0] : 'unknown' }];
  }
}

export class EmptyResultError extends Error {
  constructor(message = 'Empty result') {
    super(message);
    this.name = 'SequelizeEmptyResultError';
  }
}

export type SqlFragment = {
  __literal?: string;
  __fn?: string;
  __args?: unknown[];
  __col?: string;
  __where?: { left: unknown; right: unknown };
};

export function literal(sql: string): SqlFragment {
  return { __literal: sql };
}

export function fn(name: string, ...args: unknown[]): SqlFragment {
  return { __fn: name, __args: args };
}

export function col(name: string): SqlFragment {
  return { __col: name };
}

export function where(left: unknown, right: unknown): SqlFragment {
  return { __where: { left, right } };
}

export function cast(expression: unknown, type: string): SqlFragment {
  return { __fn: 'CAST', __args: [expression, type] };
}

export function isFragment(value: unknown): value is SqlFragment {
  if (!value || typeof value !== 'object') return false;
  const row = value as SqlFragment;
  return Boolean(row.__literal || row.__fn || row.__col || row.__where);
}

export type WhereOptions<T = any> = T | Record<string | symbol, any>;
export type OrderItem = unknown;
export type Order = OrderItem[];
export type FindOptions = Record<string, any>;
export type Includeable = any;
export type ModelStatic<T extends { _attributes?: unknown; _creationAttributes?: unknown } = any> = {
  new (): T;
  findOne(options?: any): Promise<T | null>;
  findAll(options?: any): Promise<T[]>;
  findByPk(id: unknown, options?: any): Promise<T | null>;
  create(values?: any, options?: any): Promise<T>;
  [key: string]: any;
};
export type CreationOptional<T> = T;
export type InferAttributes<T = any> = T;
export type InferCreationAttributes<T = any> = T;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type NonAttribute<T> = T;
export type ForeignKey<T> = T;
export type Transaction = {
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
  tx: unknown;
  finished?: 'commit' | 'rollback';
};

export type HasManyGetAssociationsMixin<T> = (options?: FindOptions) => Promise<T[]>;
export type HasManyAddAssociationMixin<T, K> = (value: T | K, options?: FindOptions) => Promise<void>;
export type HasManyAddAssociationsMixin<T, K> = (values: Array<T | K>, options?: FindOptions) => Promise<void>;
export type HasManySetAssociationsMixin<T, K> = (values: Array<T | K>, options?: FindOptions) => Promise<void>;
export type HasManyRemoveAssociationMixin<T, K> = (value: T | K, options?: FindOptions) => Promise<void>;
export type HasManyRemoveAssociationsMixin<T, K> = (values: Array<T | K>, options?: FindOptions) => Promise<void>;
export type HasManyHasAssociationMixin<T, K> = (value: T | K, options?: FindOptions) => Promise<boolean>;
export type HasManyHasAssociationsMixin<T, K> = (values: Array<T | K>, options?: FindOptions) => Promise<boolean>;
export type HasManyCountAssociationsMixin = (options?: FindOptions) => Promise<number>;
export type HasManyCreateAssociationMixin<T> = (values?: Record<string, unknown>, options?: FindOptions) => Promise<T>;
export type BelongsToGetAssociationMixin<T> = (options?: FindOptions) => Promise<T>;
export type BelongsToSetAssociationMixin<T, K> = (value: T | K | null, options?: FindOptions) => Promise<void>;
export type BelongsToCreateAssociationMixin<T> = (values?: Record<string, unknown>, options?: FindOptions) => Promise<T>;
export type HasOneGetAssociationMixin<T> = (options?: FindOptions) => Promise<T>;
export type HasOneSetAssociationMixin<T, K> = (value: T | K | null, options?: FindOptions) => Promise<void>;
export type HasOneCreateAssociationMixin<T> = (values?: Record<string, unknown>, options?: FindOptions) => Promise<T>;
export type BelongsToManyGetAssociationsMixin<T> = HasManyGetAssociationsMixin<T>;
export type BelongsToManySetAssociationsMixin<T, K> = HasManySetAssociationsMixin<T, K>;
export type BelongsToManyAddAssociationMixin<T, K> = HasManyAddAssociationMixin<T, K>;
export type BelongsToManyAddAssociationsMixin<T, K> = HasManyAddAssociationsMixin<T, K>;
export type BelongsToManyRemoveAssociationMixin<T, K> = HasManyRemoveAssociationMixin<T, K>;
export type BelongsToManyRemoveAssociationsMixin<T, K> = HasManyRemoveAssociationsMixin<T, K>;
export type BelongsToManyHasAssociationMixin<T, K> = HasManyHasAssociationMixin<T, K>;
export type BelongsToManyHasAssociationsMixin<T, K> = HasManyHasAssociationsMixin<T, K>;
export type BelongsToManyCountAssociationsMixin = HasManyCountAssociationsMixin;

export const QueryTypes = {
  SELECT: 'SELECT',
  INSERT: 'INSERT',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  RAW: 'RAW',
  BULKUPDATE: 'BULKUPDATE',
  BULKDELETE: 'BULKDELETE',
} as const;
