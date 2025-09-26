import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface RoutineExecutionLogAttributes {
  id: number;
  routine_id: number;
  status: 'sucesso' | 'erro' | 'executando';
  data_inicio: Date;
  data_fim?: Date;
  duracao_ms?: number;
  resultado?: any; // JSON
  erro?: string;
  stack_trace?: string;
  created_at: Date;
}

interface RoutineExecutionLogCreationAttributes extends Optional<RoutineExecutionLogAttributes, 'id' | 'data_fim' | 'duracao_ms' | 'resultado' | 'erro' | 'stack_trace' | 'created_at'> {}

class RoutineExecutionLog extends Model<RoutineExecutionLogAttributes, RoutineExecutionLogCreationAttributes> implements RoutineExecutionLogAttributes {
  public id!: number;
  public routine_id!: number;
  public status!: 'sucesso' | 'erro' | 'executando';
  public data_inicio!: Date;
  public data_fim?: Date;
  public duracao_ms?: number;
  public resultado?: any;
  public erro?: string;
  public stack_trace?: string;
  public readonly created_at!: Date;

  // Associações
  public getRoutine!: () => Promise<any>;
  public setRoutine!: (routine: any) => Promise<void>;
}

RoutineExecutionLog.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  routine_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'scheduled_routines',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    comment: 'ID da rotina executada'
  },
  status: {
    type: DataTypes.ENUM('sucesso', 'erro', 'executando'),
    allowNull: false,
    comment: 'Status da execução'
  },
  data_inicio: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Data e hora de início da execução'
  },
  data_fim: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Data e hora de fim da execução'
  },
  duracao_ms: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Duração da execução em milissegundos'
  },
  resultado: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Resultado da execução (JSON)'
  },
  erro: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Mensagem de erro, se houver'
  },
  stack_trace: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Stack trace do erro, se houver'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  tableName: 'routine_execution_logs',
  timestamps: false
});

export default RoutineExecutionLog;
