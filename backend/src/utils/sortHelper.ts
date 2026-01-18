import { Model, Sequelize } from 'sequelize';
import { logger } from './logger';

export interface SortConfig {
  model: typeof Model | any; // Aceita qualquer model que estenda Model
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

export interface SortResult {
  isValid: boolean;
  order: any[];
  error?: string;
}

export interface ColumnValidation {
  isValid: boolean;
  isNullable?: boolean;
  isVirtual?: boolean;
  isRelationship?: boolean;
}

/**
 * Helper centralizado para validação e construção de ordenação baseada em models
 */
export class SortHelper {
  /**
   * Valida se uma coluna existe no model ou é um campo virtual/relacionamento
   */
  static validateColumn(
    config: SortConfig,
    column: string
  ): ColumnValidation {
    const { model, virtualColumns = {}, relationshipColumns = {} } = config;

    // Verificar se é campo de relacionamento
    if (relationshipColumns[column]) {
      return { isValid: true, isRelationship: true };
    }

    // Verificar se é campo virtual
    if (virtualColumns[column]) {
      return { isValid: true, isVirtual: true };
    }

    // Verificar se é campo do model
    const attributes = (model as any).rawAttributes || {};
    if (attributes[column]) {
      const attr = attributes[column];
      return {
        isValid: true,
        isNullable: attr.allowNull !== false // Default é true se não especificado
      };
    }

    return { isValid: false };
  }

  /**
   * Constrói array de ordenação baseado na coluna e direção
   */
  static buildOrder(
    config: SortConfig,
    column: string,
    direction: 'ASC' | 'DESC'
  ): SortResult {
    const { model, tableName, virtualColumns = {}, relationshipColumns = {} } = config;
    const sequelize = (model as any).sequelize as Sequelize;
    const upperDirection = direction.toUpperCase() as 'ASC' | 'DESC';

    // Obter nome da tabela do model (pode ser diferente do tableName da config devido a aliases)
    const modelTableName = (model as any).getTableName?.() || (model as any).tableName || tableName;

    // Validar coluna
    const validation = this.validateColumn(config, column);
    if (!validation.isValid) {
      return {
        isValid: false,
        order: [],
        error: `Coluna '${column}' não existe no model ${tableName}`
      };
    }

    let order: any[];

    // Campo de relacionamento
    if (validation.isRelationship) {
      const relConfig = relationshipColumns[column];
      if (!relConfig) {
        return {
          isValid: false,
          order: [],
          error: `Configuração de relacionamento não encontrada para '${column}'`
        };
      }
      order = [[sequelize.literal(`\`${relConfig.association}\`.\`${relConfig.field}\``), upperDirection]];
    }
    // Campo virtual/calculado
    else if (validation.isVirtual) {
      const virtConfig = virtualColumns[column];
      if (!virtConfig) {
        return {
          isValid: false,
          order: [],
          error: `Configuração de campo virtual não encontrada para '${column}'`
        };
      }
      // Substituir referência à tabela principal na subquery para usar o nome correto
      let sql = virtConfig.sql;
      // Se a SQL contém referência a tableName, pode precisar ajuste, mas deixar como está primeiro
      order = [[sequelize.literal(sql), upperDirection]];
    }
    // Campo nullable do model - usar apenas nome da coluna (Sequelize resolve automaticamente)
    else if (validation.isNullable) {
      // Para campos nullable, colocar NULLs primeiro usando COALESCE ou apenas ordem normal
      // Sequelize resolve o nome da coluna automaticamente, evitando conflitos com aliases
      order = [[column, upperDirection]];
    }
    // Campo normal do model (não nullable)
    else {
      order = [[column, upperDirection]];
    }

    return {
      isValid: true,
      order
    };
  }

  /**
   * Obtém lista de colunas ordenáveis (para documentação/validação frontend)
   */
  static getSortableColumns(config: SortConfig): {
    columns: string[];
    virtual: string[];
    relationships: string[];
  } {
    const { model, virtualColumns = {}, relationshipColumns = {} } = config;
    const attributes = (model as any).rawAttributes || {};

    const modelColumns = Object.keys(attributes);
    const virtualCols = Object.keys(virtualColumns);
    const relationshipCols = Object.keys(relationshipColumns);

    return {
      columns: modelColumns,
      virtual: virtualCols,
      relationships: relationshipCols
    };
  }
}
