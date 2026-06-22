import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from 'sequelize';
import { sequelize } from '../../../config/database';

export class RotinaExecucaoLog extends Model<
  InferAttributes<RotinaExecucaoLog>,
  InferCreationAttributes<RotinaExecucaoLog>
> {
  declare id: CreationOptional<number>;
  declare routine_id: number;
  declare routine_nome: string;
  declare routine_tipo: string;
  declare origem: 'erp' | 'saas';
  declare empresa_id: number | null;
  declare status: 'executando' | 'sucesso' | 'erro';
  declare data_inicio: Date;
  declare data_fim: Date | null;
  declare duracao_ms: number | null;
  declare resultado: Record<string, unknown> | null;
  declare erro: string | null;
  declare created_at: CreationOptional<Date>;
}

RotinaExecucaoLog.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    routine_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    routine_nome: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    routine_tipo: {
      type: DataTypes.STRING(80),
      allowNull: false,
      defaultValue: 'unknown',
    },
    origem: {
      type: DataTypes.ENUM('erp', 'saas'),
      allowNull: false,
      defaultValue: 'erp',
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('executando', 'sucesso', 'erro'),
      allowNull: false,
      defaultValue: 'executando',
    },
    data_inicio: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    data_fim: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    duracao_ms: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    resultado: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    erro: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'RotinaExecucaoLog',
    tableName: 'adm_sistema_rotina_execucoes',
    timestamps: false,
    underscored: true,
  }
);

export default RotinaExecucaoLog;
