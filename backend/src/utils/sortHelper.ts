import { logger } from './logger';

export interface SortModelShape {
  rawAttributes?: Record<string, { allowNull?: boolean } | undefined>;
}

export interface SortConfig {
  model: SortModelShape;
  tableName: string;
  virtualColumns?: {
    [key: string]: {
      sql: string;
      description: string;
    };
  };
  relationshipColumns?: {
    [key: string]: {
      association: string;
      field: string;
      description: string;
    };
  };
}

export type PrismaOrderBy = Record<string, unknown>;

export interface SortResult {
  isValid: boolean;
  order: PrismaOrderBy[];
  error?: string;
}

export interface ColumnValidation {
  isValid: boolean;
  isNullable?: boolean;
  isVirtual?: boolean;
  isRelationship?: boolean;
}

function toPrismaDirection(direction: 'ASC' | 'DESC'): 'asc' | 'desc' {
  return direction === 'DESC' ? 'desc' : 'asc';
}

/**
 * Validação e montagem de orderBy no formato do Prisma.
 */
export class SortHelper {
  static validateColumn(config: SortConfig, column: string): ColumnValidation {
    const { model, virtualColumns = {}, relationshipColumns = {} } = config;

    if (relationshipColumns[column]) {
      return { isValid: true, isRelationship: true };
    }

    if (virtualColumns[column]) {
      return { isValid: true, isVirtual: true };
    }

    const attributes = model.rawAttributes || {};
    if (attributes[column]) {
      const attr = attributes[column];
      return {
        isValid: true,
        isNullable: attr?.allowNull !== false,
      };
    }

    return { isValid: false };
  }

  static buildOrder(config: SortConfig, column: string, direction: 'ASC' | 'DESC'): SortResult {
    const { tableName, virtualColumns = {}, relationshipColumns = {} } = config;
    const prismaDirection = toPrismaDirection(direction);

    const validation = this.validateColumn(config, column);
    if (!validation.isValid) {
      return {
        isValid: false,
        order: [],
        error: `Coluna '${column}' não existe no model ${tableName}`,
      };
    }

    let order: PrismaOrderBy[];

    if (validation.isRelationship) {
      const relConfig = relationshipColumns[column];
      if (!relConfig) {
        return {
          isValid: false,
          order: [],
          error: `Configuração de relacionamento não encontrada para '${column}'`,
        };
      }
      order = [{ [relConfig.association]: { [relConfig.field]: prismaDirection } }];
    } else if (validation.isVirtual) {
      const virtConfig = virtualColumns[column];
      if (!virtConfig) {
        return {
          isValid: false,
          order: [],
          error: `Configuração de campo virtual não encontrada para '${column}'`,
        };
      }
      logger.warn('Ordenação virtual ainda depende de SQL bruto', {
        context: 'SortHelper',
        column,
        tableName,
      });
      order = [{ [column]: prismaDirection }];
    } else {
      order = [{ [column]: prismaDirection }];
    }

    return { isValid: true, order };
  }

  static getSortableColumns(config: SortConfig): {
    columns: string[];
    virtual: string[];
    relationships: string[];
  } {
    const { model, virtualColumns = {}, relationshipColumns = {} } = config;
    const attributes = model.rawAttributes || {};

    return {
      columns: Object.keys(attributes),
      virtual: Object.keys(virtualColumns),
      relationships: Object.keys(relationshipColumns),
    };
  }
}
