import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../../config/database';

export type RpkiSyncStatus = 'idle' | 'running' | 'success' | 'failed';

export class RpkiSyncSession extends Model<
  InferAttributes<RpkiSyncSession>,
  InferCreationAttributes<RpkiSyncSession>
> {
  declare id: CreationOptional<number>;
  declare empresa_id: number | null;
  declare host: string;
  declare port: number;
  declare status: RpkiSyncStatus;
  declare last_sync: Date | null;
  declare serial_number: string | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

RpkiSyncSession.init(
  {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'adm_sistema_tenants', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    host: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    port: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 3323,
    },
    status: {
      type: DataTypes.ENUM('idle', 'running', 'success', 'failed'),
      allowNull: false,
      defaultValue: 'idle',
    },
    last_sync: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    serial_number: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      get() {
        const value = this.getDataValue('serial_number');
        return value != null ? String(value) : value;
      },
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'RpkiSyncSession',
    tableName: 'rpki_sync_sessions',
    timestamps: true,
    underscored: true,
  }
);

