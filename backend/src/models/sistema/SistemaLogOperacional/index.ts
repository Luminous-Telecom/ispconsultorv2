import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from 'sequelize';
import { sequelize } from '../../../config/database';

export class SistemaLogOperacional extends Model<
  InferAttributes<SistemaLogOperacional>,
  InferCreationAttributes<SistemaLogOperacional>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number | null;
  declare usuario_id: number | null;
  declare canal: string;
  declare tipo: string;
  /** Nome da entidade/tabela afetada (ex.: Cliente, adm_financeiro_titulos) */
  declare tabela: string | null;
  declare recurso: string | null;
  declare recurso_id: string | null;
  declare payload: Record<string, unknown> | null;
  declare ip_address: string | null;
  declare user_agent: string | null;
  declare mensagem: string | null;
  declare created_at: CreationOptional<Date>;
}

SistemaLogOperacional.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    canal: {
      type: DataTypes.STRING(24),
      allowNull: false,
      defaultValue: 'sistema',
    },
    tipo: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    tabela: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    recurso: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    recurso_id: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    payload: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    mensagem: {
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
    modelName: 'SistemaLogOperacional',
    tableName: 'adm_sistema_logs_operacionais',
    timestamps: false,
    underscored: true,
  }
);
