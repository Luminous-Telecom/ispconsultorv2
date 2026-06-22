import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from 'sequelize';
import { sequelize } from '../../../config/database';

export class SshAuditLog extends Model<
  InferAttributes<SshAuditLog>,
  InferCreationAttributes<SshAuditLog>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number | null;
  declare action: string;
  declare user_id: string;
  declare device_id: string | null;
  declare device_name: string | null;
  declare command: string | null;
  declare output: string | null;
  declare success: boolean;
  declare error_message: string | null;
  declare ip: string | null;
  declare duration: number | null;
  declare created_at: CreationOptional<Date>;
}

SshAuditLog.init(
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
    action: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    user_id: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    device_id: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    device_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    command: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    output: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    success: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ip: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    duration: {
      type: DataTypes.BIGINT,
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
    modelName: 'SshAuditLog',
    tableName: 'adm_ssh_manager_audit_logs',
    timestamps: false,
    underscored: true,
  }
);

export default SshAuditLog;
