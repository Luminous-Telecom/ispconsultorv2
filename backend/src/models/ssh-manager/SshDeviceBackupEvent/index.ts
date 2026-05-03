import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from 'sequelize';
import { sequelize } from '../../../config/database';

export type SshDeviceBackupEventStatus =
  | 'falha'
  | 'sucesso'
  | 'somente_local'
  | 'falha_envio'
  | 'verificado';

export class SshDeviceBackupEvent extends Model<
  InferAttributes<SshDeviceBackupEvent>,
  InferCreationAttributes<SshDeviceBackupEvent>
> {
  declare id: CreationOptional<number>;
  declare ssh_device_id: number;
  declare empresa_id: number | null;
  declare status: SshDeviceBackupEventStatus;
  declare detail: string | null;
  declare created_at: CreationOptional<Date>;
}

SshDeviceBackupEvent.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    ssh_device_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'adm_ssh_manager_ssh_devices', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'DadosEmpresa', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    status: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    detail: {
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
    modelName: 'SshDeviceBackupEvent',
    tableName: 'adm_ssh_manager_ssh_device_backup_events',
    timestamps: false,
    underscored: true,
  }
);
