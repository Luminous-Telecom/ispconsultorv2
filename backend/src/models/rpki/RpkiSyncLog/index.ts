import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../../config/database';

export type RpkiSyncLogType = 'provisioning' | 'publication';
export type RpkiSyncLogStatus = 'success' | 'failed';
export type RpkiSyncLogTriggerType = 'roa' | 'aspa' | 'manual' | null;

export class RpkiSyncLog extends Model<
  InferAttributes<RpkiSyncLog>,
  InferCreationAttributes<RpkiSyncLog>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number | null;
  declare ca_id: number | null;
  declare type: RpkiSyncLogType;
  declare trigger_type: RpkiSyncLogTriggerType;
  declare status: RpkiSyncLogStatus;
  declare remote_host: string | null;
  declare message: string | null;
  declare created_at: CreationOptional<Date>;
}

RpkiSyncLog.init(
  {
    id: { type: DataTypes.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'adm_sistema_tenants', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    ca_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'rpki_cas', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    type: {
      type: DataTypes.ENUM('provisioning', 'publication'),
      allowNull: false,
    },
    trigger_type: {
      type: DataTypes.ENUM('roa', 'aspa', 'manual'),
      allowNull: true,
      defaultValue: null,
    },
    status: {
      type: DataTypes.ENUM('success', 'failed'),
      allowNull: false,
    },
    remote_host: { type: DataTypes.STRING(255), allowNull: true },
    message: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'RpkiSyncLog',
    tableName: 'rpki_sync_logs',
    timestamps: false,
    underscored: true,
  }
);
