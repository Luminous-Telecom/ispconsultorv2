import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../../config/database';
import type { JsonValue } from '../../../types/index';

export interface RoutineExecutionLogAttributes {
  id: number;
  empresa_id?: number | null;
  routine_id: number;
  status: 'executando' | 'sucesso' | 'erro';
  data_inicio: Date;
  data_fim?: Date;
  duracao_ms?: number;
  resultado?: Record<string, JsonValue>;
  erro?: string;
  stack_trace?: string;
  created_at: Date;
}

export type RoutineExecutionLogCreationAttributes = Optional<RoutineExecutionLogAttributes, 'id' | 'created_at' | 'data_fim' | 'duracao_ms' | 'resultado' | 'erro' | 'stack_trace'>;

export class RoutineExecutionLog extends Model<RoutineExecutionLogAttributes, RoutineExecutionLogCreationAttributes> implements RoutineExecutionLogAttributes {
  public id!: number;
  public empresa_id?: number | null;
  public routine_id!: number;
  public status!: 'executando' | 'sucesso' | 'erro';
  public data_inicio!: Date;
  public data_fim?: Date;
  public duracao_ms?: number;
  public resultado?: Record<string, JsonValue>;
  public erro?: string;
  public stack_trace?: string;
  public readonly created_at!: Date;
}

RoutineExecutionLog.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  empresa_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  routine_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'scheduled_routines',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('executando', 'sucesso', 'erro'),
    allowNull: false
  },
  data_inicio: {
    type: DataTypes.DATE,
    allowNull: false
  },
  data_fim: {
    type: DataTypes.DATE,
    allowNull: true
  },
  duracao_ms: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  resultado: {
    type: DataTypes.JSON,
    allowNull: true
  },
  erro: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  stack_trace: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  sequelize,
  tableName: 'routine_execution_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default RoutineExecutionLog;